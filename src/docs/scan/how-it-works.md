---
title: "How it works"
---

Atomdrift Scan combines local static analysis with a routed ONNX model:

1. Known-good and known-bad bloom filters handle exact matches cheaply.
2. [cleave](/cleave/) unpacks the input and extracts capabilities from source,
   binaries, packages, archives, documents, and configuration.
3. The report is converted into the feature layout expected by
   [Azoth](/azoth/).
4. A general model and relevant format specialists produce a score and firing
   level.
5. The selected false-positive budget turns that evidence into a benign,
   suspicious, or hostile verdict.

## False-positive levels

`-l N` means an expected `N` hostile false positives per 100 million benign
files. Lower levels are quieter; higher levels are more sensitive. When `-l` is
omitted, the installed model bundle supplies the default, currently L25.

```bash
atomscan -l 0 ./release       # quietest operating point
atomscan ./release            # bundle default
atomscan -l 5000 ./release    # more sensitive and noisier
```

## Reproducibility

Given the same bytes, installed bundles, options, fetched references, and
analysis tools, the findings and model decision are deterministic. Reports
contain timestamps and timing data, so serialized output is not byte-for-byte
identical between runs.

Run `atomscan version` to record the rule, bloom-filter, and model inventory
used for an analysis.

## Optional LLM pass

`--llm` sends extracted evidence—not the original file—to an
OpenAI-compatible endpoint for a second opinion. It is optional and not part of
the default deterministic path.

```bash
atomscan --llm http://model-host:8000/v1 ./release
```
