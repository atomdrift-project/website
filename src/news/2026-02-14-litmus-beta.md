---
title: "litmus enters beta"
date: 2026-02-14
summary: "ML-powered malware classification, now ready for wider testing."
---

litmus 0.2.0 is now available. This release marks the transition from
early alpha to beta — the core training and classification pipeline is
stable enough for broader use and feedback.

Key capabilities in this release:

- Train custom XGBoost models tailored to your threat model
- Scan files, directories, and archives
- Compare package versions to detect supply chain attacks via `litmus diff`
- Feature explanation system to understand classification decisions

litmus consumes cleave's static analysis output to make threat
assessments. Unlike cleave, which reports neutral capabilities, litmus
makes the call on whether something is malicious.

Install from source:

```
cargo install --git https://codeberg.org/atomdrift/litmus
```

This is beta software — expect false positives and false negatives. File
bugs on [Codeberg](https://codeberg.org/atomdrift/litmus/issues).
