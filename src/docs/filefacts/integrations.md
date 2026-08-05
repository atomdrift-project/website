---
title: "Integrations"
---

## Rust pipeline

```rust
let parsed = filefacts::open(&bytes)?;
let feature_row = (
    parsed.fileid(),
    parsed.metrics(),
    parsed.sections(),
    parsed.symbols(),
);
```

Request only the views your pipeline consumes. This keeps extraction cost and
feature contracts explicit.

## Process pipeline

```bash
filefacts --format json suspect.bin > facts.json
```

Focused views reduce payload size:

```bash
filefacts --format json metrics suspect.bin
filefacts --format json imports suspect.bin
```

## Reproducible datasets

Record these alongside extracted features:

- input SHA-256
- filefacts crate/CLI version and `SCHEMA_VERSION`
- enabled views and configuration
- Rizin/radare2 presence and version

Use a pinned build and toolchain for train/serve parity. The same bytes can
produce additional deep binary facts when Rizin is added or upgraded.

Parser failures are surfaced through the `errors` view. Preserve them instead
of silently treating missing facts as zero; “not present” and “could not
extract” are different model inputs.
