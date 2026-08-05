---
title: filefacts
tool: filefacts
---

filefacts is an open-source Rust library and CLI that turns files into
structured, security-relevant facts. It identifies formats and exposes lazy
views over text, symbols, sections, metrics, metadata, ASTs, and archive
members.

Use it when building a classifier, triage pipeline, dataset, or any tool that
needs more than a MIME type. It is the extraction layer used by
[cleave](/cleave/), available independently.

## Why filefacts?

- **Parse once, inspect what you need.** Views are lazy and content-cached.
- **Broad coverage.** Source, executables, bytecode, packages, archives,
  documents, images, manifests, lockfiles, and deployment configuration.
- **Evidence-oriented output.** Facts retain kinds, offsets, and provenance.
- **Recoverable failures.** Damaged or unsupported structures produce
  diagnostics rather than collapsing the entire pipeline.
- **Library and CLI.** Embed the parsers in Rust or emit terminal/JSON output.

## Install

As a Rust library:

```toml
[dependencies]
filefacts = "1.3"
```

As a CLI on macOS or Linux:

```bash
brew tap atomdrift/tap https://github.com/atomdrift-project/homebrew-tap.git
brew install atomdrift/tap/filefacts
```

## Quick start

```bash
filefacts suspect.bin
filefacts --format json suspect.bin
filefacts metrics suspect.bin
filefacts imports suspect.bin
```

Most parsers run in-process. For PE, ELF, and Mach-O, filefacts can invoke an
installed Rizin or radare2 subprocess for deeper control-flow and symbol facts.
Pin the optional tool version when producing reproducible training data.

Representative coverage includes PE, ELF, Mach-O, WebAssembly, DEX, Java class
files, Python bytecode, common archives and packages, OCI images, PDF, Office,
RTF, LNK, plist, images, structured data, manifests, lockfiles, and more than
20 source languages.

Source and issues live on
[GitHub](https://github.com/atomdrift-project/filefacts).
