---
title: "stng v1.3.1, litmus v1.2.1, cleave v1.4.0"
date: 2026-05-13
summary: "Three pre-CackalackyCon releases: stng tightens mixed binary/script decoding, litmus improves worker reporting and model bundle handling, and cleave deepens PDF and LNK analysis."
---

Three small-to-medium releases landed today.

**stng v1.3.1** adds coverage for mixed script/binary inputs that could miss decoded campaign markers. Regression tests now cover polyglot and unknown inputs so embedded base64 payloads are decoded even when the file is mostly binary, and rizin/r2 cache tests use isolated temporary cache directories. [v1.3.1](https://codeberg.org/atomdrift/stng/releases/tag/v1.3.1).

**litmus v1.2.1** makes workers more observable: Hopper polling now reports litmus version, traits version, RSS, load, and available tools, with resource refreshes every 10 minutes. Model discovery also accepts multi-seed bundles that only provide `models/seed_*.{txt,json}`. Mismatched or incomplete model repos now fail with explicit instructions instead of deleting and recloning after a delay, and OmniOS setup installs source-build prerequisites only when needed. [v1.2.1](https://codeberg.org/atomdrift/litmus/releases/tag/v1.2.1).

**cleave v1.4.0** expands document and shortcut analysis. PDF reports now include richer structure for objects, object streams, streams, signatures, forms, actions, embedded files, and malformed stream cases. LNK analysis extracts more shortcut metadata, including relative paths, volume and network info, environment targets, and shim/Darwin data. illumos and Solaris support improved around jemalloc and memory reporting; diff formula rendering also handles absent formulas cleanly. [v1.4.0](https://codeberg.org/atomdrift/cleave/releases/tag/v1.4.0).

```
brew upgrade atomdrift/tap/stng atomdrift/tap/litmus atomdrift/tap/cleave
```
