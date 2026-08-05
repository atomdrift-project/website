---
title: "Getting started"
---

## Install

On macOS or Linux:

```bash
brew tap atomdrift/tap https://github.com/atomdrift-project/homebrew-tap.git
brew install atomdrift/tap/stng
```

Or install with Rust 1.94 or newer:

```bash
cargo install --git https://github.com/atomdrift-project/stng
```

Rizin or radare2 is optional. It enables deeper address recovery and the
`--xorscan` pass.

## First extraction

```bash
stng --version
stng malware.bin
```

The default report includes ordinary and decoded strings, their offsets and
extraction methods, and security-oriented classifications.

## Reduce or structure the output

```bash
stng --interesting malware.bin   # focus on structured/useful strings
stng --simple malware.bin        # one string per line
stng --json malware.bin          # machine-readable output
```

## Work with XOR

```bash
stng --xor 0xAB malware.bin
stng --xor secretkey malware.bin
stng --xorscan malware.bin       # slower; requires Rizin or radare2
```

Start with the default automatic single-byte XOR pass. Use `--xorscan` only
when the quick result or other evidence justifies the extra analysis time.
