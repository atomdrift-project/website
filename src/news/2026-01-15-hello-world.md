---
title: "Atomdrift is here"
date: 2026-01-15
summary: "Open-source malware detection for the software supply chain."
---

The open-source supply chain has no workable solution for malware detection.
Packages get published, artifacts get pulled, and nobody has tooling that
actually works to tell the good from the bad. We're building that tooling.

Atomdrift is a suite of open-source tools — written in Rust, released under
Apache 2.0 — that decompose software into structural primitives and classify
threats using machine learning. The initial toolkit:

- **[litmus](https://codeberg.org/atomdrift/litmus)** — ML-powered malware classifier trained on cleave output
- **[cleave](https://codeberg.org/atomdrift/cleave)** — deep static analysis engine with AST-aware decomposition across 20+ languages
- **[stng](https://codeberg.org/atomdrift/stng)** — string extraction for binary analysis, with XOR deobfuscation and IOC classification
- **[xgboost-native](https://github.com/atomdrift/xgboost-native)** — pure Rust XGBoost inference with exact TreeSHAP, no C++ runtime

All development happens in the open on
[Codeberg](https://codeberg.org/atomdrift).

More to come.
