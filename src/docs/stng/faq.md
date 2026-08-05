---
title: "FAQ"
---

## Does stng need network access?

No. It reads local bytes and optional local analysis tools. It has no account,
telemetry, model download, or cloud-scoring requirement.

## Do I need Rizin or radare2?

No. stng works without either. Install one for deeper address recovery and
`--xorscan` multi-byte XOR analysis.

## Why is a string missing?

Default filters remove likely noise. Try `--unfiltered`, reduce
`--min-length`, or use `--xorscan` when obfuscation is suspected.

## Why is the output large?

Use `--interesting` for a focused triage view or `--simple` when only the text
matters. Compiler metadata and encoded payloads can produce many candidates.

## Is the output deterministic?

With the same file, stng version, options, cache state, and optional analysis
tool version, extraction is deterministic. Installing or upgrading Rizin can
add or change recovered strings.

## Can stng tell me whether a file is malware?

No. It extracts and classifies strings; it does not issue a malware verdict.
Use the findings as evidence or run [Atomdrift Scan](/scan/) for a complete
static-analysis and model verdict.
