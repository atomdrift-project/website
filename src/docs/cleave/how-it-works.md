---
title: "How it works"
---

cleave turns files into inspectable capabilities:

1. [filefacts](/filefacts/) identifies the format and parses reusable views such
   as text, metrics, symbols, sections, AST facts, and archive members.
2. cleave recursively opens supported containers and enriches executables with
   optional Rizin and UPX analysis.
3. YAML and YARA-X traits match structural facts and byte patterns.
4. Composite traits combine lower-level evidence into behaviors aligned broadly
   with MBC and MITRE ATT&CK.
5. Results are ranked from `baseline` through `hostile` and emitted for a human
   or another program.

## Rules and evidence

The public [Atomdrift traits](https://github.com/atomdrift-project/traits) tree
contains the maintained rules and authoring documentation. A finding should be
traceable to concrete evidence from the input; it is not a generative AI
explanation.

Run `cleave version` to see the exact traits revision and rule inventory loaded
on your machine.

## Reproducibility

Findings are deterministic when the bytes, traits bundle, options, platform
filters, and installed analysis tools are fixed. Reports include an analysis
timestamp, and adding or upgrading Rizin can add facts, so serialized output is
not inherently byte-for-byte stable across environments.

## Network behavior

cleave downloads the traits bundle on first use and performs a best-effort
release notice check no more than once per day. It does not upload samples.
After setup, set `CLEAVE_NO_UPDATE_CHECK=1` to suppress the notice check.
