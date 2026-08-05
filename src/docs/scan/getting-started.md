---
title: "Getting started"
---

## Install

On macOS or Linux:

```bash
brew tap atomdrift/tap https://github.com/atomdrift-project/homebrew-tap.git
brew install atomdrift/tap/scan
```

Or build with Rust 1.94 or newer:

```bash
git clone https://github.com/atomdrift-project/scan.git
cd scan
make install
```

## First scan

```bash
atomscan --version
atomscan ./release
```

The first scan downloads the model, traits, and bloom-filter bundles. Later
scans refresh them when stale. Directories are recursive and supported archives
are unpacked automatically.

Start with an artifact you understand. A verdict includes the capabilities that
contributed to it; review those before turning a result into a hard policy.

## Use it in a script

```bash
atomscan -f json ./release
```

Exit codes are `0` for all benign, `1` when anything is hostile, `2` when
something is suspicious but nothing is hostile, and `3` for analysis errors.

## Run fully offline

After the initial bundles are installed:

```bash
SCAN_NO_UPDATE_CHECK=1 atomscan --no-update --fetch=none ./release
```

Without those options, Scan may refresh bundles and fetch referenced packages,
dependencies, or URLs for recursive supply-chain analysis.

See the [Scan README](https://github.com/atomdrift-project/scan#readme) for
coverage and optional analysis tools.
