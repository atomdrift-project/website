---
title: "Getting started"
---

## Add the Rust library

```toml
[dependencies]
filefacts = "1.3"
```

```rust
let parsed = filefacts::open(&bytes)?;
let identity = parsed.fileid();
let metrics = parsed.metrics();
let symbols = parsed.symbols();
```

Views are lazy: reading metrics does not force every other extractor to run.

## Install the CLI

On macOS or Linux:

```bash
brew install atomdrift-project/tap/filefacts
```

Or build with Rust 1.85 or newer:

```bash
git clone https://github.com/atomdrift-project/filefacts.git
cd filefacts
make install
```

## Inspect a file

```bash
filefacts suspect.bin
filefacts --format json suspect.bin
```

Request a focused view when you do not need the complete report:

```bash
filefacts fileid suspect.bin
filefacts metrics suspect.bin
filefacts symbols suspect.bin
filefacts errors suspect.bin
```

Run `filefacts --help` for every available view.
