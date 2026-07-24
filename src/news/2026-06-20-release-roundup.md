---
title: "cleave v2.1.0, stng v1.7.0, filefacts v1.1.0 & v1.1.1"
date: 2026-06-20
summary: "A package-aware wave: cleave learns DMG and go.mod, filefacts grows real lockfile parsing and PURL extraction, and stng adds generic decoded-string recovery for text."
---

Three tools, one theme: the stack got a lot better at reading what packages actually ship.

**[cleave](/cleave/) v2.1.0** adds DMG and `go.mod` support and pushes even more parsing down onto [filefacts](https://github.com/atomdrift-project/filefacts). New `iter-files --newer-than` makes incremental sweeps cheap, and experimental `--fetch` pulls remote inputs in. Detection got tighter on both ends: stricter trait and testdata validation, a fixed Alpine APK multi-member parse, better Java class and source-symbol handling, and improved archive decompression. Compact JSON shrank again. [Release notes](https://github.com/atomdrift-project/cleave/releases/tag/v2.1.0).

**[stng](/stng/) v1.7.0** adds generic decoded-string extraction for text inputs and base64-over-UTF-16LE decoding — two more ways to surface what an obfuscated payload is hiding. Go PE inline string recovery improved, Python/JS code classification got sharper, and the decoder and filtering hot paths are now parallelized. It also trims noise: fewer false-positive IPs from PE/network data and tighter URL-decoding. [Release notes](https://github.com/atomdrift-project/stng/releases/tag/v1.7.0).

**[filefacts](https://github.com/atomdrift-project/filefacts) v1.1.0 & v1.1.1** turn it into a proper supply-chain reader: external reference extraction (PURLs, URLs, evidence, offsets, hashes) and real package/lockfile parsing for npm, PyPI, Cargo, Go, Ruby, Composer, and Arch. New file types land too — lockfiles, `go.mod`, `go.sum`, `.SRCINFO`, and DMG — alongside source call-target metrics that flag obfuscated command targets. v1.1.1 follows with a hermetic open for cache-less testing and a missing DMG support file. [Release notes](https://github.com/atomdrift-project/filefacts/releases/tag/v1.1.0).

```
brew upgrade atomdrift/tap/cleave atomdrift/tap/stng atomdrift/tap/filefacts
```
