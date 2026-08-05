---
title: "FAQ"
---

## Are files uploaded?

No. Static analysis and ONNX inference run locally. Files are uploaded only
when you explicitly configure hopper write-back. `--llm` sends extracted
evidence to the endpoint you configure, not the original file.

## Does Scan need network access?

By default, yes: first use downloads bundles, stale bundles refresh, and the
CLI follows referenced dependencies, packages, and URLs. After setup, use
`SCAN_NO_UPDATE_CHECK=1 atomscan --no-update --fetch=none …` for a fully
offline run.

## What does L25 mean?

It is an operating target of 25 hostile false positives per 100 million benign
files, or 0.25 per million. It is the current bundle default. Your real rate
depends on how closely your inputs resemble the evaluation corpus.

## Is a benign verdict proof that a file is safe?

No. Scan is static analysis. Unsupported packers, runtime-only behavior,
missing fetched content, and novel techniques can hide evidence. Use it as one
layer in a review or detection program.

## Why install Rizin or UPX?

Rizin adds deeper executable analysis. UPX can unpack supported binaries.
Scan still works without them, but findings may be less complete.

## Is the result reproducible?

The decision is deterministic when the input, bundles, tools, configuration,
and fetched references are fixed. JSON includes timestamps and duration data,
so output bytes are not identical.

## Do I need a GPU or LLM?

No. The default ONNX models run on CPU. The `--llm` second opinion is optional.
