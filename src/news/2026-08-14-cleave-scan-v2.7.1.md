---
title: "cleave & Scan v2.7.1, isomer v0.4.0"
date: 2026-08-14
summary: "CPU work, mostly. cleave is about 25% faster; Scan and isomer embed it, so they are too. Four file-type rules that never ran now run. isomer v0.4.0 adds three detectors that need no rules."
---

[cleave](/cleave/) v2.7.1 ships its YARA rules precompiled, so the first scan
no longer builds them. Literal scanning over large buffers is chunked and
parallel, ASCII-only patterns skip Unicode compilation, and composite rule
lookups are indexed once instead of rebuilt three times per call. About 25%
off overall. [Scan](/scan/) v2.7.1 and [isomer](/isomer/) v0.4.0 embed the
cleave engine and inherit all of it.

`Win32 EXE`, `Win64 DLL`, `Mach-O` and `ELF executable` were never mapped to
file types, so the upstream rules keyed to them never ran. They run now. A
multibyte character in a rule comment no longer panics the parser.

Compiled rules carry a fingerprint, and a mismatch against source is rejected
rather than scanned with. Scan exits 4 when the rule set is incomplete or
corrupt, so a hole in coverage fails CI instead of passing quietly.

Diff truncation is severity-ordered: a hostile finding in a late file can no
longer be crowded out by baseline noise. Version-stamped archive roots are
paired, so a version bump shows per-file changes rather than total churn. Diff
JSON gains `conf` and `file_type`. Caches are keyed by detected file type, and
a cache hit no longer returns results missing their symbols.

isomer v0.4.0 adds three detectors, none of them rule-dependent: same-version
repacks where the metrics move but the version does not, encoded single-line
payloads newly wired into an entrypoint, and readable implants found as
timestamp outliers rather than as obfuscation. It reads versions from artifact
metadata — without one, every release-pressure check was off and said nothing.
`--deps` findings now change the verdict instead of only printing, and
dependency ranges resolve to current rather than their floor. The floor is how
you miss event-stream.

Four isomer bugs worth naming: `isomer ci --deps` skipped both dependency
folding and LLM interpretation, `--offline` did not suppress the LLM, an
unreadable base file could fabricate the signal that lowers a verdict, and a
caller-supplied `--base` could forge GitHub workflow outputs.

A jemalloc build fix unblocks NetBSD, illumos and Solaris.

Release notes:
[cleave v2.7.1](https://github.com/atomdrift-project/cleave/releases/tag/v2.7.1) ·
[scan v2.7.1](https://github.com/atomdrift-project/scan/releases/tag/v2.7.1) ·
[isomer v0.4.0](https://github.com/atomdrift-project/isomer/releases/tag/v0.4.0)

```
brew upgrade atomdrift-project/tap/cleave atomdrift-project/tap/scan
```
