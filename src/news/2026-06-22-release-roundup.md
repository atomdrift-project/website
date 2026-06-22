---
title: "Atomdrift Scan v2.1.0, cleave v2.1.1"
date: 2026-06-22
summary: "Scan learns to reach out — fetch and scan remote dependencies, packages, and URLs directly — while cleave makes YARA fast with precompiled rules and on-demand tier loading."
---

The first point releases on the 2.x line are about reach and speed.

**[Atomdrift Scan](/scan/) v2.1.0** can now go get the sample for you. Experimental `--fetch` pulls and scans remote dependencies, and new `pkg` and `url` subcommands scan remote samples directly — no manual download step. `--hopper`/`--upload` pushes refreshed scan data upstream. It's faster, too: we dropped tract (a CPU hotspot) for a leaner model engine, parallelized `ps` and specialist startup, and added dynamic admission sizing. The v8 model migration makes releases more reliable with per-file typing, worker JSON payloads got slimmer, and worker support now covers SUSE, Void, and Fedora on top of illumos, FreeBSD, and Arch. [Release notes](https://codeberg.org/atomdrift/scan/releases/tag/v2.1.0).

**[cleave](/cleave/) v2.1.1** makes YARA fast. A new `yara-precompile` tool loads prebuilt rules, tiers load dynamically on demand instead of all upfront, and tier preheating warms the right tiers based on incoming file type — lower latency where it counts. `validate --soft` skips directory caps and other taxonomy-cleanliness rules for quick local checks, plus a round of dependency updates. [Release notes](https://codeberg.org/atomdrift/cleave/releases/tag/v2.1.1).

```
brew upgrade atomdrift/tap/atomdrift-scan atomdrift/tap/cleave
```
