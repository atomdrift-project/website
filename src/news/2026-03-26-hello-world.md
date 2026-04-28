---
title: "Atomdrift is here!"
date: 2026-03-26
summary: "Open-source malware detection for the modern software supply chain."
---

Supply-chain attacks against the open-source ecosystem keep happening, and the defender's toolbox is mostly closed-source and slow. So we're shipping one in the open.

The first piece is litmus: a transparent, tunable malware scanner built for what software actually looks like in 2026 — not the static-binary world ClamAV was designed for in 2003. It's part of a larger effort we're calling the Atomdrift Project, aimed at intercepting attacks like the recent ones on Trivy and OpenClaw before they reach a developer's laptop or a registry's mirror.

The model is simple. Decompose a program into atoms. Identify the mal-ecule that makes the program what it is. Run that through a local-first ML pipeline tuned hard against false positives. Treat binaries and source as first-class citizens, with automated reverse engineering on both sides.

A lot of compute went into getting here. There's a lot more to do. If you want to help, the code is open and so are the issues.
