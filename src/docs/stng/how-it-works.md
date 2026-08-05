---
title: "How it works"
---

stng combines several extraction strategies:

1. Scans bytes for printable ASCII and UTF-16LE runs.
2. Recognizes Go and Rust runtime layouts, symbols, and x86/arm64 stack strings.
3. Decodes Base64, Base32, Base85, hexadecimal, URL, and Unicode-escape text.
4. Tests likely single-byte XOR keys and optional user-supplied keys.
5. Uses Rizin or radare2, when installed, for deeper addresses and multi-byte
   XOR recovery.
6. Classifies likely IOCs, commands, paths, credentials, tokens, and other
   security-relevant text while filtering common compiler noise.

## What the filters mean

Default output aims to remain useful during triage. `--interesting` is more
selective; `--unfiltered` shows the raw/noisy candidates. Filtering changes
presentation, not the bytes being analyzed.

## Cache behavior

Extracted strings and optional Rizin results are cached by file content. The
cache defaults to a 30-day TTL and a 2 GiB ceiling. Use `--no-cache` for one
run or `--flush-cache` to discard the target's cached analysis.

Results depend on the stng version, options, and optional Rizin/radare2 presence
and version. Pin those inputs when comparing runs across systems.
