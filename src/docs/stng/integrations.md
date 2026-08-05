---
title: "Integrations"
---

## Line-oriented pipelines

```bash
stng --simple malware.bin > strings.txt
```

Use simple output when the consumer only needs decoded text. It intentionally
omits offsets, methods, classifications, and other context.

## Structured pipelines

```bash
stng --json malware.bin > strings.json
```

Prefer JSON for triage systems, notebooks, and signature-generation tools that
need offsets, encodings, extraction methods, or classifications.

## Embed the extractor

stng is also a Rust library. Add the Git dependency and call the library API
when process startup and JSON parsing are unnecessary:

```toml
[dependencies]
stng = { git = "https://github.com/atomdrift-project/stng" }
```

```rust
let bytes = std::fs::read("sample")?;
let strings = stng::extract_strings(&bytes, 4);
```

Record the stng and Rizin/radare2 versions with long-lived analysis results.
Optional tool differences can change what is recovered.
