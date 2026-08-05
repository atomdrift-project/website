---
title: "Getting started"
---

## Install

On macOS or Linux:

```bash
brew tap atomdrift/tap https://github.com/atomdrift-project/homebrew-tap.git
brew install atomdrift/tap/cleave
```

Or build with Rust 1.94 or newer:

```bash
git clone https://github.com/atomdrift-project/cleave.git
cd cleave
make install
```

Rizin is recommended for deeper executable analysis. UPX is optional and adds
runtime unpacking for supported files.

## First analysis

```bash
cleave --version
cleave suspect.bin
```

The first run downloads the compatible traits bundle if it is not already
installed. The terminal report ranks capabilities from baseline through
hostile and shows the evidence behind each finding.

## Focus the result

```bash
cleave --min-crit suspicious suspect.bin
cleave --format json suspect.bin
cleave --format jsonl ./samples
```

Directories are recursive. Supported archives and packages are unpacked and
their members are analyzed.

## Compare two releases

```bash
cleave diff v1.2.0/ v1.3.0/
```

The diff covers capabilities, metrics, values, symbols, strings, and sections.
Start with the new suspicious/hostile capabilities, then inspect the evidence
and structural changes that introduced them.
