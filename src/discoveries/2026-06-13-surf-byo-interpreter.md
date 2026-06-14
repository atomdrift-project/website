---
title: "surf: BYO-Interpreter — a faked Go library hides a LuaJIT payload"
date: 2026-06-13
summary: "The real surf is a browser-impersonating Go library you import; the clone forgot to rename its module, turned its README into a Download button, and hides a LuaJIT screenshot-stealer in a 309 KB line of obfuscated text."
packageName: github.com/mehdimin11/surf
ecosystem: Go
---

<img src="/assets/images/surf-byo-interpreter.jpg" alt="The 'Surf's Up' movie poster — a polished release sleeve over an animated-penguin comedy; the package dresses a Windows LuaJIT dropper in the same way, and the penguin winks at the Linux support the README promises while the zip is Windows-only." style="width: 60%; height: auto;">

The real `surf` is a genuinely slick Go library for HTTP requests that impersonate real browser TLS and HTTP/2 fingerprints — this package is that library, cloned file-for-file, with exactly two things changed: the README, and what's hiding in the examples folder.

## A download button on a library you import

A Go module is something you `go get`; you do not double-click it. This clone's `go.mod` still declares the upstream `github.com/enetx/surf` it forked from — a rename the author never made — while its README has been rewritten from a developer reference into a glossy "Download Surf" product page. A download badge and seven separate links all point at one file served off GitHub's raw URL, and the steps walk a Windows user through extracting and running it; the genuine library ships no executable at all.

What gives it away as crude rather than clever is that the page doesn't match its own payload — it promises Linux and macOS builds named like `surf-linux-amd64` and a version-printing command, yet the zip is Windows-only and bolted to a library with no CLI to print anything: a generic "download our app" template stamped onto a Go package by something that never looked inside the box.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// go.mod — the fork forgot to rename itself</span>
<span class="tok-kw">module</span> github.com/enetx/surf        <span class="tok-com">// ← upstream path, not mehdimin11/surf</span>

<span class="tok-com">// README.md — the same raw-GitHub zip, badge + 6 more links</span>
[![Download Surf](<span class="tok-str">https://github.com/mehdimin11/surf/raw/refs/heads/main/examples/Software-v1.1-alpha.1.zip</span>)]
<span class="tok-str">"visit the Releases page"</span> → …/raw/refs/heads/main/examples/Software-v1.1-alpha.1.zip
</code></pre>
{% endraw %}

## What's in the box

The zip holds three files and no ambiguity: `Launcher.cmd` is the entire detonator in 28 bytes, starting a stock 878 KB LuaJIT interpreter against the payload — a 309 KB text file that is one single line of fully-packed Lua. Shipping the interpreter alongside the script is the whole move: the `.exe` is an unmodified, recognizable LuaJIT that scanners wave through, while the malicious logic rides in a text file they read as inert. Underneath, the logic is a return-function loader wrapped in an indexed string-permutation decoder; cleave fingerprints the obfuscation as `T1027`, and static analysis stops there.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">:: Launcher.cmd — the whole detonator, 28 bytes</span>
<span class="tok-kw">start</span> luajit.exe uix.txt
</code></pre>
{% endraw %}

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// uix.txt — one 309 KB line, wrapped + annotated; every fragment below is verbatim</span>
<span class="tok-kw">return</span>(<span class="tok-kw">function</span>(...)<span class="tok-kw">return</span>(<span class="tok-kw">function</span>(z,E,A,j,r,l,Q,F,V,L,N,G,q,s,g,d,k,O,K,c,u,y,U,t)

  <span class="tok-com">// a table of closure factories that build the VM's dispatch thunks</span>
  F,d,O,K,t,q,V,c,G,y,U,u,N,L,s,g,k = {},
    <span class="tok-kw">function</span>(z,E)<span class="tok-kw">local</span> A=<span class="tok-fn">L</span>(E) <span class="tok-kw">local</span> j=<span class="tok-kw">function</span>(j)<span class="tok-kw">return</span> <span class="tok-fn">y</span>(z,{j},E,A)<span class="tok-kw">end</span> <span class="tok-kw">return</span> j <span class="tok-kw">end</span>,
    <span class="tok-num">-193518</span>+(<span class="tok-num">768751</span>-<span class="tok-num">575233</span>),                       <span class="tok-com">// constants are always arithmetic</span>
    <span class="tok-kw">function</span>()K=K+(<span class="tok-num">-843160</span>-(<span class="tok-num">-843161</span>))c[K]=<span class="tok-num">445494</span>+<span class="tok-num">-445493</span> <span class="tok-kw">return</span> K <span class="tok-kw">end</span>,  <span class="tok-com">// a +1 counter, obfuscated</span>
    …

  <span class="tok-com">// two identical decoders: rebuild a string by index-permuting its own halves</span>
  <span class="tok-kw">local</span> mn=<span class="tok-kw">function</span>(z)<span class="tok-kw">local</span> y=<span class="tok-str">""</span> <span class="tok-kw">for</span> E=<span class="tok-num">1</span>,#z/<span class="tok-num">2</span>,<span class="tok-num">1</span> <span class="tok-kw">do</span> y=y..z[#z/<span class="tok-num">2</span>+z[E]] <span class="tok-kw">end</span> <span class="tok-kw">return</span> y <span class="tok-kw">end</span>
  <span class="tok-kw">local</span> xn=<span class="tok-kw">function</span>(z)<span class="tok-kw">local</span> y=<span class="tok-str">""</span> <span class="tok-kw">for</span> E=<span class="tok-num">1</span>,#z/<span class="tok-num">2</span>,<span class="tok-num">1</span> <span class="tok-kw">do</span> y=y..z[#z/<span class="tok-num">2</span>+z[E]] <span class="tok-kw">end</span> <span class="tok-kw">return</span> y <span class="tok-kw">end</span>

  <span class="tok-com">// ~80 more single-letter registers, then the dispatcher itself</span>
  <span class="tok-kw">local</span> Nn,Vn,sn,c,An,o,dn,fn,tn,Zn,rn,nn,B,n,f,X,Cn,Yn,U,e,yn, … ,v,P
  <span class="tok-kw">while</span> y <span class="tok-kw">do</span> <span class="tok-kw">if</span> y&lt;<span class="tok-num">8480031</span>-<span class="tok-num">138744</span> <span class="tok-kw">then</span> <span class="tok-kw">if</span> y&lt;<span class="tok-num">180234</span>+<span class="tok-num">4481382</span> <span class="tok-kw">then</span> <span class="tok-kw">if</span> y&lt;<span class="tok-num">339991</span>+(<span class="tok-num">1560860</span>-(<span class="tok-num">-275750</span>)) <span class="tok-kw">then</span>
    Q=F[j[<span class="tok-num">1017378</span>+((<span class="tok-num">-550661</span>-(<span class="tok-num">345227</span>-(<span class="tok-num">-367997</span>)))-(<span class="tok-num">-246508</span>))]]
    K=F[j[<span class="tok-num">-687784</span>+((<span class="tok-num">1750891</span>-<span class="tok-num">668090</span>)-<span class="tok-num">395015</span>)]]
    L=F[j[(<span class="tok-num">839244</span>-(<span class="tok-num">1926192</span>-<span class="tok-num">1009153</span>))-(<span class="tok-num">-77798</span>)]]
    U=<span class="tok-str">"\209\160\001"</span>                                <span class="tok-com">// an encrypted string literal</span>
</code></pre>
{% endraw %}

| | File | Trait | Evidence |
| --- | --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `Software-v1.1-alpha.1.zip` | `objectives/supply-chain/hidden-payload/exec` | `Launcher.cmd` runs `luajit.exe uix.txt` — archive ships its own interpreter to execute the payload (T1195.002) |
| <span class="sev-dot hostile" title="hostile"></span> | `…zip!!uix.txt` | `objectives/anti-static/obfuscation/code-metrics/structure` | 309 KB single-line packed return-function loader, indexed string-permutation decoder (T1027) |
| <span class="sev-dot notable" title="notable"></span> | `luajit.exe` | `micro-behaviors/process/interpreter/lua` | Stock LuaJIT VM — the bring-your-own runtime, benign in itself |
| <span class="sev-dot notable" title="notable"></span> | `luajit.exe` | `objectives/evasion/process/injection/shellcode` | W^X flips via `VirtualProtect` + `CreateThread` — inherent to a JIT, flagged on the byte pattern |

Run under an instrumented LuaJIT harness, the 309 KB line unfolds into an FFI shellcode loader that walks the `PEB_LDR_DATA` chain by hand to resolve its APIs, then photographs the desktop and mails it home. The bitmap leaves as a multipart POST to a hardcoded IP, wrapped in the usual misdirection: a geolocation lookup, a decoy Polygon RPC call, and a Tor/I2P-shaped fallback address. The behavior we trapped is a screenshot stealer, but one instrumented run only exercises the branches it reaches — and that live `eth_call` against a smart contract is the kind of hook that could fetch a second stage, drain a wallet, or open remote control we never tripped, so read the screenshot as the floor of this payload's ambition, not the ceiling.

The screen-grab-to-exfil chain, recovered under instrumentation:

| Step | Mechanism | API |
| --- | --- | --- |
| Resolve APIs | PEB/LDR walk + export-table parse, no static imports | `LoadLibraryA`, `GetProcAddress` |
| Capture screen | size desktop, blit into a DIB, build a BMP in memory | `GetSystemMetrics`, `BitBlt`, `CreateDIBSection` |
| Exfiltrate | multipart POST of the BMP over HTTP | `HttpSendRequestW`, `InternetWriteFile` |

## Package metadata

| Field | Value |
| --- | --- |
| published path | `github.com/mehdimin11/surf` |
| module (go.mod) | `github.com/enetx/surf` |
| version | `v0.0.0-20260613092640-ad5ed84dc67c` |
| go | `1.25.0` |
| license | `MIT` |

It's impersonation all the way down — a library built to fake browser fingerprints, itself faked into a download button, bring-your-own-interpreter so the only thing your scanner recognizes is the half that's innocent.

## Indicators

| Type | Value |
| --- | --- |
| Module zip | `github.com-mehdimin11-surf-v0.0.0-20260613092640-ad5ed84dc67c.zip` |
| Module zip SHA-256 | [`6a48ef430e554a2826d0afcdf0c24a9ef7d3e0b76c39975c39181ffe2b18020b`](https://lab.atomdrift.org/file/6a48ef430e554a2826d0afcdf0c24a9ef7d3e0b76c39975c39181ffe2b18020b) |
| Payload archive | `Software-v1.1-alpha.1.zip` |
| Payload archive SHA-256 | [`5eefdc7551235432c91e85b80d1a9ef3976055d09ffbbe54c12338da3c559852`](https://lab.atomdrift.org/file/5eefdc7551235432c91e85b80d1a9ef3976055d09ffbbe54c12338da3c559852) |
| Obfuscated loader | `uix.txt` |
| `uix.txt` SHA-256 | [`8cede35b80b1deaf732c2b178d908f91b3e7a0c114d06dfae9075b8a9bf78b8f`](https://lab.atomdrift.org/file/8cede35b80b1deaf732c2b178d908f91b3e7a0c114d06dfae9075b8a9bf78b8f) |
| Bundled interpreter | `luajit.exe` |
| `luajit.exe` SHA-256 | [`f3e34c9e36f3be065d80d456281d31dd1cc85eb4980db7fa8c1b0eb6f29c25d8`](https://lab.atomdrift.org/file/f3e34c9e36f3be065d80d456281d31dd1cc85eb4980db7fa8c1b0eb6f29c25d8) |
| Download URL | `https://github.com/mehdimin11/surf/raw/refs/heads/main/examples/Software-v1.1-alpha.1.zip` |
| C2 (screenshot exfil) | `213.176.73.151` |
| C2 endpoint | `POST /api/NTE3YjdjNWU1NjYzNjU2YTA1N2Y=` (multipart/form-data) |
| Geolocation recon | `ip-api.com/json/` |
| Blockchain RPC (decoy / C2 fetch) | `polygon.drpc.org` |
| Fallback address (Tor/I2P-shaped) | `26bbudy13hydiihesb72eoyx8t8rqg0sifvolvn71nyq7` |
