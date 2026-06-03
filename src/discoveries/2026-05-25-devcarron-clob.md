---
title: "@devcarron/clob: api-rs-node's rough draft, same binary, same self-dox"
date: 2026-05-25
summary: "Published 5½ hours before api-rs-node@4.3.0 from a different gmail, @devcarron/clob@2.73.0 ships the same Explr binary directly in the tarball, wears a copy-pasted @img/sharp-win32-x64 README, and beacons to 45.8.22.112:2026 — but the bundled config/ files name the same Windows machine and dev tree as the later package."
packageName: "@devcarron/clob"
ecosystem: npm
---

Five and a half hours before [api-rs-node@4.3.0](/discoveries/2026/05/api-rs-node-clob-dropper/) appeared, `@devcarron/clob@2.73.0` was published from a different gmail — same payload, same scaffolding, same author, earlier and louder. The cover is a copy-paste of the `@img/sharp-win32-x64` README, with the title left un-patched. The manifest is more honest than the README:

<pre class="lang-js"><code>{
  <span class="tok-str">"name"</span>: <span class="tok-str">"@devcarron/clob"</span>,
  <span class="tok-str">"version"</span>: <span class="tok-str">"2.73.0"</span>,
  <span class="tok-str">"description"</span>: <span class="tok-str">"Downloads clob2.0.exe on install"</span>,
  <span class="tok-str">"scripts"</span>: { <span class="tok-str">"postinstall"</span>: <span class="tok-str">"node clob.js"</span> },
  <span class="tok-str">"main"</span>: <span class="tok-str">"clob.js"</span>
}
</code></pre>

The tarball is 1.8 MB, eight files — seven scaffolding plus one PE:

- `clob.js`, `package.json`, the copy-pasted README
- the author's bundled `config/` and `logs/` directories (four files)
- **`clob2.0.exe`** — 4 MB, console-subsystem PE32+

The exe is byte-identical to the binary `api-rs-node@4.3.1` pulls from IPFS at install time:

| Field | Value |
| --- | --- |
| SHA-256 | [`300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478`](https://lab.atomdrift.org/file/300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478) |
| PDB | `explr_server.pdb` |
| Tauri invoke surface | 53 commands |
| Startup banner | `Explr web server listening on http://…` |

The bundling is redundant. `clob.js` doesn't load the bundled exe — it downloads to `%LOCALAPPDATA%\clob2.0.exe` from the same four IPFS gateways and the same `WIN_CID` as the later package. The exe rides along because the author's pack directory contained it; the next iteration (`api-rs-node`) dropped the local copy and went IPFS-only, shrinking the published tarball from 1.8 MB to 6 KB. The differences from the later draft tell you what the author iterated on:

| | `@devcarron/clob@2.73.0` | `api-rs-node@4.3.1` |
| --- | --- | --- |
| Published | `2026-05-25T11:59:04Z` | `2026-05-25T19:05:48Z` |
| Publisher | `devcarron@gmail.com` | `shinydv412@gmail.com` |
| Cover | Apache notice from `@img/sharp-win32-x64` | "Rust ↔ Node.js Bridge", emoji README |
| Tarball | 1.8 MB (binary bundled) | 6 KB (IPFS-only) |
| Drop name | `clob2.0.exe` | `windows defender host.exe` |
| C2 endpoint | `45.8.22.112:2026` | `170.205.31.203:2026` |
| Dropper logging | Verbose `[clob-downloader]` to stdout | Silent; `catch (_) {}` everywhere |
| Install timeout | None | 15 seconds |
| Author host (bundled) | `mist`, `E:\getting IP and check list\clob-downloader` | identical |

Four pieces of host metadata match across both bundled `meta_data.json` files:

- Windows username: `mist`
- Drive layout: same four-volume NTFS
- Project name: `clob-downloader`
- File-explorer scaffolding version: `0.2.3`

Two npm publisher accounts, one machine. Both versions share the gaps from the [api-rs-node analysis](/discoveries/2026/05/api-rs-node-clob-dropper/#the-campaign-does-not-close-the-loop):

- No env-var handoff to the spawned executable — `HOST`, `PORT`, `EXPLR_UI`, `AUTH_TOKEN` are all unset, so the server hits `Invalid HOST/PORT` and exits on every launch
- The beacon POSTs the public IP with a literal `:80` suffix, which behind NAT names the edge router rather than the host that ran `npm install`

The earlier draft is the noisier of the two — `console.log('[clob-downloader] Sending IP: …')` scrolls past during `npm install`, exactly what a developer paying attention catches.

## Dropper traits

Same shape as the later draft, minus the Windows Defender masquerade (the file drops as `clob2.0.exe`, not `windows defender host.exe`):

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/delivery/blockchain` | Four IPFS gateways for one CID |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/persistence` | Download → Run key + LaunchAgents + XDG autostart |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/stealth-spawn` | `detached:true` + `stdio:'ignore'` + `windowsHide:true` + `unref()` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/channel/http-beacon` | `POST /api/urls?url=<ip>` to `45.8.22.112:2026` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/ip-port` | Hardcoded IPv4 endpoint, no DNS |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/blockchain/multi-chain` | Pinata + Cloudflare + ipfs.io fallback chain |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/self-delete/file/script` | `fs.unlink(dest, () => {})` on every failure path |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/masquerade/identity/user-agent` | Chrome 124 UA in dropper requests |
| <span class="sev-dot suspicious" title="suspicious"></span> | `persistence/system/launchd/core` | LaunchAgents plist with `RunAtLoad` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `persistence/system/init/boot` | `~/.config/autostart/clob.desktop` |
| <span class="sev-dot notable" title="notable"></span> | `persistence/login/registry/autostart` | `HKCU\…\Run` with VBS launcher |

The [Fallout report](https://lab.atomdrift.org/file/a88d1ea8fb793afddc99ad7f7d4a372fd39468afea5d5ea2a33340e384eb5864) returns malicious at probability 1.0. The bundled binary is the same file documented in the [api-rs-node Stage 2 analysis](/discoveries/2026/05/api-rs-node-clob-dropper/#stage-2-what-the-cid-serves) — same hash, same Tauri Explr server, same surviving traits.

## Why the earlier draft matters

Two reasons.

The first is attribution: byte-identical `clob2.0.exe`, identical bundled `meta_data.json`, identical `clob.js` skeleton, two npm accounts published from the same machine 5½ hours apart. That ties `devcarron@gmail.com` and `shinydv412@gmail.com` together, and ties both to the `Explr` file-manager codebase whose author's username on Windows is `mist`. The story of `api-rs-node` is not one fresh gmail iterating on a stager; it is one author with at least two npm accounts, one set of build tooling, and an existing in-house product they are repurposing.

The second is detection asymmetry. `@devcarron/clob` carries the malicious binary inside its tarball — 4 MB of PE32+ that any registry-side scanner can hash and any host-side scanner can flag the moment it lands on disk. `api-rs-node` weighs 6 KB at rest, fetches the same binary from IPFS only at install time, and is therefore invisible to the same kinds of scans until the dropper has already executed. The progression from `@devcarron/clob` to `api-rs-node` is the author noticing that, and shrinking the at-rest surface area to zero. The class of detections that catches the earlier draft does not catch the later one.

## Indicators

| Type | Value |
| --- | --- |
| Package | `@devcarron/clob@2.73.0` (npm) |
| npm page | [npmjs.com/package/@devcarron/clob](https://www.npmjs.com/package/@devcarron/clob) |
| Tarball SHA-256 | [`a88d1ea8fb793afddc99ad7f7d4a372fd39468afea5d5ea2a33340e384eb5864`](https://lab.atomdrift.org/file/a88d1ea8fb793afddc99ad7f7d4a372fd39468afea5d5ea2a33340e384eb5864) |
| `clob.js` SHA-256 | [`954728b16738a4b44696a599eecde211ece2ccfcc9eb47bfaf4ba5c3ab6715be`](https://lab.atomdrift.org/file/954728b16738a4b44696a599eecde211ece2ccfcc9eb47bfaf4ba5c3ab6715be) |
| `clob2.0.exe` SHA-256 | [`300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478`](https://lab.atomdrift.org/file/300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478) (== `api-rs-node` IPFS payload) |
| C2 endpoint | `45.8.22.112:2026` (HTTP `POST /api/urls?url=<public-ip>:80`) |
| IPFS payload CID | `bafybeif3zkapj364ofnrvbty7oj5h5ufpxlp4s62usk3ulxrru35e3gssa` |
| Private gateway | `violet-tricky-quelea-562.mypinata.cloud` |
| Public-IP lookup | `api.ipify.org` |
| Dropped Windows file | `%LOCALAPPDATA%\clob2.0.exe` |
| Windows launcher | `%LOCALAPPDATA%\clob2.0-launcher.vbs` |
| Run key | `HKCU\Software\Microsoft\Windows\CurrentVersion\Run\clob` |
| macOS plist | `~/Library/LaunchAgents/com.clob.agent.plist` |
| Linux autostart | `~/.config/autostart/clob.desktop` |
| Publisher | `devcarron <devcarron@gmail.com>` |

## Response

Same as for `api-rs-node`. Search npm caches and CI logs for `@devcarron/clob`. In egress telemetry: outbound to `45.8.22.112:2026`, to `api.ipify.org`, and to the four IPFS gateways carrying that CID. On any host that resolved `@devcarron/clob` *or* `api-rs-node` since 2026-05-25, search `%LOCALAPPDATA%` for `clob2.0.exe`, `windows defender host.exe`, and the corresponding `*-launcher.vbs`, plist, and autostart entries. The dropped binary is the same file in both campaigns — same hash, same `Explr web server` banner, same fingerprint.
