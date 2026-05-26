---
title: "cleave v2.0.0-rc.1, litmus v2.0.0-rc.1, stng v1.4.0"
date: 2026-05-25
summary: "The 2.0.0-rc.1 series swaps cleave's file-parsing engine out for filefacts, a standalone library you can use without the rest of cleave. litmus picks up a new JSON schema and ONNX. stng tightens the garbage filter and fixes a stack-string panic."
---

The big change in this series is structural: cleave's file-parsing engine has been lifted out of cleave and into a new library. The engine, [filefacts](https://codeberg.org/atomdrift/filefacts), reads bytes and returns parsed views — `fileid`, `values`, `strings`, `metrics`, `sections`, `imports`, `exports`, `functions`, `ast`, `errors` — for every format malware tends to hide in: PE, ELF, Mach-O, Java class, Python `.pyc`, archives, Office, PDF, LNK, plist, JPEG/PNG, and source ASTs across 17 languages via tree-sitter.

cleave still does what it always did — it now does it through filefacts. Authenticode verification happens in-process with pure-Rust crypto. rizin remains the only out-of-process dependency, sandboxed with RLIMIT, PR_SET_PDEATHSIG, and process-group kill.

**cleave v2.0.0-rc.1.** The migration to filefacts is the headline. Beyond that: AST is cached so rule analysis no longer reparses; archive analysis emits `kv` and metrics; nested OOXML and subfile handling improved; Dockerfile is a supported format; the C# extractor's import and symbol bugs are fixed. Performance: stng's XOR + UTF-16 scan skips on large ASCII inputs, the legacy Rust mangling regex is cached, and `analyze` takes ownership of the report to skip a clone. `cleave inspect` was added for debugging the parse tree. Build profile defaults to thin LTO. [v2.0.0-rc.1](https://codeberg.org/atomdrift/cleave/releases/tag/v2.0.0-rc.1).

**litmus v2.0.0-rc.1.** New JSON output schema. ONNX models load through `tract-onnx`, alongside the existing XGBoost and LightGBM routes. Blended route support — a file can be scored by multiple specialists and combined — joins the per-filetype/per-filegroup routing from 1.2. Default model bumped to scan-v17. Bad models error at load instead of failing mid-scan. Git operations get a 10-minute timeout for slow mirrors. Wolfi/apko build rules added. [v2.0.0-rc.1](https://codeberg.org/atomdrift/litmus/releases/tag/v2.0.0-rc.1).

**stng v1.4.0.** Garbage filter no longer hides pure hex strings — UUIDs and other hex IOCs come through. The camelCase filter is more permissive. `sockaddr_in` extraction is endian-aware and registry keys are made root-relative for cleaner IOCs. Fixes a panic in `extract_stack_off`. Adds recursion, jemalloc, and tuna configs for tuning. [v1.4.0](https://codeberg.org/atomdrift/stng/releases/tag/v1.4.0).

These are release candidates. Pin if you need stability; otherwise:

```
brew upgrade atomdrift/tap/cleave atomdrift/tap/litmus atomdrift/tap/stng
```
