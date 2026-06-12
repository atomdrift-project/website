---
title: "filefacts v1.0.0"
date: 2026-06-12
summary: "filefacts reaches 1.0.0 with richer package identity, new PE/.NET malware features, better evidence offsets, and explicit AST failure metrics for large-scale security ML pipelines."
---

[filefacts](https://codeberg.org/atomdrift/filefacts) v1.0.0 is the stable line for the parser behind cleave's feature extraction. The headline for ML work is simple: more samples now land in the right format bucket, more package identity becomes structured data, and skipped or truncated source analysis is visible instead of silent.

For supply-chain models, the point is not prettier names. It is fewer collapsed classes, more provenance features, better evidence offsets, and explicit failure signals when static analysis is bounded for corpus-scale safety.

- **Package identity.** Android and Alpine `.apk`, npm `.tgz`, Cargo `.crate`, RubyGems, Debian packages, NuGet, VSIX, IPA, conda, egg, and Arch/FreeBSD/macOS packages now get distinct types.
- **Debian and RubyGems metadata.** Names, versions, maintainers or authors, dependencies, licenses, platforms, installed size, and dependency-shape metrics become structured features.
- **PE/.NET features.** CLR managed resources now report count, maximum entropy, and maximum size. `.reloc` overhang measures payload bytes hidden past real relocation data.
- **Version and signature signals.** VERSIONINFO identity text gets entropy and symbol-ratio metrics, and certificate table size is now a metric for direct thresholding.
- **Evidence offsets.** ELF dynamic imports carry `.dynstr` offsets when available. Mach-O dylibs and code signatures carry file offsets. Source member symbols now carry byte offsets.
- **Corpus-scale AST safety.** Deep ASTs, large query outputs, tree-sitter guard skips, and source extractor panics now produce `ast.depth_capped`, `source.query_limited.*`, and `source.ast_unavailable`.
- **Quieter file typing.** Unsupported OCaml, Vim, Lisp, SQL, Smali, patches, CSS-like files, and TypeScript baselines are treated as text instead of weakly guessed as JavaScript, Kotlin, or Batch.
- **Better content detection.** AppleScript and pacman/AUR install scriptlets are detected more reliably without depending on extensions.
- **Schema notes.** `FileType::Pkg` split into specific package variants, `Symbol::Member` gained an optional `offset`, source error stages were added, and `pe.cert_table_size` moved from values to metrics.

[Release notes](https://codeberg.org/atomdrift/filefacts/releases/tag/v1.0.0).

```
brew install atomdrift/tap/filefacts
cargo add filefacts
```
