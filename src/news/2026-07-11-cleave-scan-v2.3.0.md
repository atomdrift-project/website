---
title: "cleave & Scan v2.3.0: a third of the memory, twice the speed"
date: 2026-07-11
summary: "The headline is performance — rebuilt regex internals, parallel archive evaluation, and workers that stop hoarding memory deliver the same deterministic verdicts at a third of the memory and twice the speed — with a stack of accuracy fixes riding along."
---

The headline of [cleave](/cleave/) and [Atomdrift Scan](/scan/) v2.3.0 is
performance, and the numbers are worth saying plainly: expect roughly a third
of the memory use and twice the speed on the same workloads. The verdicts stay
deterministic — same input, same output — and where they *do* change, it's
because detection got more accurate, not because the engine got looser.

**Where the memory went.** cleave's regex engine was rebuilt on
`regex-automata` with byte-budgeted caches, which eliminates the 1.5–4 GB
memory spikes that large binaries used to trigger; match semantics are
unchanged, and a new validator flags any rule that would blow the budget. On
the Scan side, workers now keep dependency reports as plain text instead of
parsed trees — 800 MB less retained memory — and an allocator cap trims peak
usage further.

**Where the speed came from.** Prefiltering and path-trait evaluation now run
in parallel across large archives. `unless:` suppression is indexed instead of
a linear scan per finding. The YARA scanner cache grew from 4 entries to 64,
which matters more than it sounds: one 13,000-member archive was rebuilding
scanners some 31,000 times. And rules can now bound match length directly,
replacing the pathological `{4000,}`-style repetitions that were costly to
even compile.

**Detection got more accurate in both directions.** Fewer false alarms: a
window-matching bug that fired on partial evidence is fixed, Java exfil rules
no longer trigger on the word *upload* alone, and a benign file no longer
inherits its archive's hostile verdict. Fewer misses: string-length rules that
had silently never matched now do, Scan's trait floor was reading the wrong
JSON key and never firing — fixed — and a critical trait now escalates a
benign model verdict all the way to hostile. Best of the lot: a hostile
transitive dependency now surfaces at the archive root instead of hiding in
the manifest.

**And some genuinely new things landed too.** Archive entries now report
entropy, magic bytes, and extension/type mismatches. Scan reports record
provenance — registry sidecars, fetch URLs, and the id and sha256 of embedded
files — so a verdict says where its bytes came from. `--format=interpret`
prints the LLM prompt Scan would send, locally, without calling anything. And
FreeBSD/arm64 builds are back.

Release notes: [cleave
v2.3.0](https://github.com/atomdrift-project/cleave/releases/tag/v2.3.0) ·
[scan v2.3.0](https://github.com/atomdrift-project/scan/releases/tag/v2.3.0).

```
brew upgrade atomdrift/tap/cleave atomdrift/tap/scan
```
