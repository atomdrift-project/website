---
title: "Getting started"
---

## Install

On macOS, Linux, BSD, Solaris, illumos, or Android:

```bash
curl -fsSL https://install.atomdrift.org/scan.sh | sh
```

On Windows:

```powershell
irm https://install.atomdrift.org/scan.ps1 | iex
```

The installer detects the platform, verifies the release checksum, checks build
provenance when the GitHub CLI is available, and falls back to a source build
when no binary is published. On macOS and Linux, it delegates to Homebrew when
Homebrew is available so the package manager owns upgrades, PATH, and
dependencies; pass `--method binary` to use the prebuilt release directly. See the
[install page](https://install.atomdrift.org/) for supported platforms,
requirements, downloads, and installer options.

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
