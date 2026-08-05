---
title: "How it works"
---

`filefacts::open(&bytes)` identifies the input and returns a `ParsedFile` with
lazy views:

| View | Contents |
| --- | --- |
| `fileid` | Type, container, compression, and confidence |
| `identity` | Normalized package, signing, and producer claims |
| `values` | Format-specific structural fields |
| `text` / `literals` | Byte-scan text and parser-extracted literals |
| `metrics` | Entropy, sizes, counts, and numeric features |
| `sections` | Executable sections and segments |
| `symbols` | Imports, exports, functions, calls, and identifiers |
| `archive_members` | Recursively discovered entries |
| `source_ast` | tree-sitter facts for recognized source |
| `errors` | Recoverable parser/extractor diagnostics |

## Parsing and caching

Views share parsed state so the same structure is not decoded repeatedly. The
disk cache stores content-addressed, zstd-compressed records and includes the
filefacts build and optional analysis-tool fingerprint in its key.

Most work is in-process. Executable analysis can spawn Rizin or radare2 for
deeper control-flow and symbol recovery. The library hardens and bounds those
subprocesses, but their presence and version can change the facts returned.

## Schema stability

The serialized schema exposes `SCHEMA_VERSION`. Additive fields are treated as
compatible; semantic or naming changes require a version bump. Consumers
should ignore unknown fields and record the schema/library version used for
long-lived datasets.
