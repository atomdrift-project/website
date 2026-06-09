---
title: "@devcarron/clob: api-rs-node's rough draft, same binary, same self-dox"
date: 2026-05-25
summary: "The same Windows implant as api-rs-node, shipped 5½ hours earlier under a copy-pasted sharp README its author forgot to re-title — and the bundled config files finger the same dev machine twice over."
packageName: "@devcarron/clob"
ecosystem: npm
---

Five and a half hours before [api-rs-node@4.3.0](/discoveries/2026/05/api-rs-node-clob-dropper/) appeared, `@devcarron/clob@2.73.0` shipped the same implant from a different gmail under a copy-pasted `@img/sharp-win32-x64` README its author forgot to re-title — but the manifest is more honest than the cover:

<pre class="lang-js"><code>{
  <span class="tok-str">"name"</span>: <span class="tok-str">"@devcarron/clob"</span>,
  <span class="tok-str">"version"</span>: <span class="tok-str">"2.73.0"</span>,
  <span class="tok-str">"description"</span>: <span class="tok-str">"Downloads clob2.0.exe on install"</span>,
  <span class="tok-str">"scripts"</span>: { <span class="tok-str">"postinstall"</span>: <span class="tok-str">"node clob.js"</span> },
  <span class="tok-str">"main"</span>: <span class="tok-str">"clob.js"</span>
}
</code></pre>

The tarball is 1.8 MB, eight files — seven scaffolding plus one PE, byte-identical to the binary `api-rs-node@4.3.1` pulls from IPFS at install time:

- `clob.js`, `package.json`, the copy-pasted README
- the author's bundled `config/` and `logs/` directories (four files)
- **`clob2.0.exe`** — 4 MB, console-subsystem PE32+

| Field | Value |
| --- | --- |
| SHA-256 | [`300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478`](https://lab.atomdrift.org/file/300a7dea05c2a588757010ad314fa55cb8ef3acebaa284f58a5cd0fd39bce478) |
| PDB | `explr_server.pdb` |
| Tauri invoke surface | 53 commands |
| Startup banner | `Explr web server listening on http://…` |

The bundling is dead weight — `clob.js` ignores the local exe and downloads to `%LOCALAPPDATA%\clob2.0.exe` from the same four IPFS gateways and `WIN_CID` as the later package, which dropped the bundled copy and shrank from 1.8 MB to 6 KB; the rest of what the author iterated on:

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

Both bundled `meta_data.json` files match on four host facts — two npm accounts, one machine — and both share the gaps from the [api-rs-node analysis](/discoveries/2026/05/api-rs-node-clob-dropper/#the-campaign-does-not-close-the-loop):

- Windows username: `mist`
- Drive layout: same four-volume NTFS
- Project name: `clob-downloader`
- File-explorer scaffolding version: `0.2.3`
- No env-var handoff to the spawned executable — `HOST`, `PORT`, `EXPLR_UI`, `AUTH_TOKEN` are all unset, so the server hits `Invalid HOST/PORT` and exits on every launch
- The beacon POSTs the public IP with a literal `:80` suffix, which behind NAT names the edge router rather than the host that ran `npm install`
- Verbose `console.log('[clob-downloader] Sending IP: …')` scrolls past during `npm install`

## Dropper traits

Same shape as the later draft, minus the Windows Defender masquerade — the file drops as `clob2.0.exe`, not `windows defender host.exe`:

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

## Why the earlier draft matters

The [Fallout report](https://lab.atomdrift.org/file/a88d1ea8fb793afddc99ad7f7d4a372fd39468afea5d5ea2a33340e384eb5864) returns malicious at probability 1.0 on the same binary as the [api-rs-node Stage 2 analysis](/discoveries/2026/05/api-rs-node-clob-dropper/#stage-2-what-the-cid-serves), and the byte-identical exe, `meta_data.json`, and `clob.js` skeleton tie `devcarron@gmail.com` and `shinydv412@gmail.com` to one machine (Windows user `mist`) repurposing an in-house `Explr` codebase — the 5½-hour gap is the author shrinking a hashable 4 MB bundled PE down to a 6 KB IPFS-only stager that at-rest scanners no longer catch until the dropper has run.

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

On any host that resolved `@devcarron/clob` *or* `api-rs-node` since 2026-05-25, hunt npm caches and CI logs for both names, egress to `45.8.22.112:2026` / `api.ipify.org` / the four CID gateways, and `%LOCALAPPDATA%` for `clob2.0.exe`, `windows defender host.exe`, and their `*-launcher.vbs`, plist, and autostart entries.
