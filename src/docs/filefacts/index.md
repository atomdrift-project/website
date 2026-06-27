---
title: filefacts
tool: filefacts
---

filefacts is a Rust library (and CLI) that reads a file and tells you what is in
it — a dense, honest description of a file's contents, built for feeding feature
extraction pipelines. Give it bytes; it identifies the format, parses it once,
and returns structured facts you can fold straight into a feature vector. It was
extracted from [cleave](/cleave/) so the same extraction layer can sit underneath
your own tooling.

## Why ML-security researchers use it

A classifier is only as good as the signals it sees, and most file-feature code
either shells out to `file` / `objdump` / `openssl` / `tar` — slow, brittle,
non-deterministic — or reimplements a parser per format and rots. filefacts is
**in-process and single-pass**: one walk per file, pure-Rust crypto for
Authenticode, no subprocesses on the hot path. Same bytes in, same facts out,
every time — which is what you need when a feature vector has to be reproducible
across a training run and an incident six months later.

The features it surfaces are the ones that discriminate: byte and per-section
entropy, string statistics, section layout, import and symbol tables, signature
validity, and extension/content mismatches — the signals that separate benign
files from the things they imitate.

## The shape of the output

`filefacts::open(&bytes)` returns a `ParsedFile` whose views are computed lazily
and cached, so reading one view never pays for the others:

| View | What it carries |
|------|-----------------|
| `fileid` | Format identification — type, container, compression. Free; no view computed. |
| `values` | Residual structural fields, navigable as a JSON tree. |
| `text` | Byte-scan strings (ASCII + UTF-16LE) with offsets. |
| `literals` | Parser-extracted language string literals. |
| `comments` | Comments recovered from source and documents. |
| `metrics` | Derived numeric features — entropy, sizes, counts. |
| `sections` | Binary section / segment listings. |
| `symbols` | Unified named entities — imports, exports, functions, calls, members, identifiers — tagged by kind. |
| `archive_members` | Entries inside archives, recursively. |
| `source_ast` | tree-sitter AST facts for source files. |
| `errors` | Recoverable extractor diagnostics, never a panic. |

The CLI writes the same structure as JSON, one object per file:

```bash
filefacts suspect.bin       # JSON facts for one file
filefacts /tmp/samples      # recurse a directory
```

The output schema is versioned (`SCHEMA_VERSION`): field additions are
non-breaking, renames or semantic changes bump it — so a feature pipeline can
pin a schema and trust it.

## What it parses

- **Executables** — PE, ELF (with DWARF), Mach-O, Java class, Python bytecode.
- **Archives** — zip, tar (+ gz/bz2/xz/zst), 7z, rar, deb, rpm, pkg, cab, CHM,
  CRX, XPI, WHL, JAR, VSIX.
- **Documents** — PDF, RTF, OOXML, OLE2 (legacy Office, MSI, MSG), LNK, plist,
  AppleScript. Authenticode is verified in-process.
- **Images** — JPEG, PNG, with per-channel entropy, edge density, and histogram
  flatness for stego detection.
- **Structured** — JSON, YAML, TOML, XML, pickle, Dockerfile, Makefile, systemd
  units, .desktop, GitHub Actions, package manifests.
- **Source** — tree-sitter ASTs for ~17 languages including JavaScript,
  TypeScript, Python, Go, Rust, Java, C, C#, Bash, PowerShell, and PHP.

::: tip Caching
Views are cached on disk as zstd-compressed bincode keyed by SHA-256, so a
second pass over the same corpus is nearly free — handy when you re-extract
features after tweaking a downstream model.
:::

Add `filefacts = "1.1"` to `Cargo.toml` to use it as a library, or see
[Getting started](/filefacts/getting-started/) for the CLI. Source and issues
live on [Codeberg](https://codeberg.org/atomdrift/filefacts).
