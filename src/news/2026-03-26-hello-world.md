---
title: "Atomdrift is here!"
date: 2026-03-26
summary: "Introducing open-source malware detection for the modern software supply chain."
---

Tired of the constant barrage of supply-chain attacks afflicting the open-source community, we have decided to embark on the impossible: a transparent, tunable, open-source malware scanner - designed for the modern software supply-chain.

We call it Litmus.

This is part of a larger vision for intercepting supply-chain attacks, that we're calling The Atomdrift Project. We want to empower everyone, from open source software marketplaces to teenagers at home, to catch the sorts of attacks we've recently seen against Trivy and OpenClaw.

We've poured hundreds of hours (and thousands of dollars' worth of GPUs, RAM, and storage) into this project, but it's well past time that the open-source community has a solution open to them. While ClamAV served us well for the past 23 years, it's design always assumed that malware samples were static, well-known, and in binary form. That's not the case in 2026.

The concept is simple: decompose a program into atoms, identify the unique mal-ecule that makes up the program, and use a fast local-first ML pipeline to keep the false-positive rates low. Treat binaries and source code as first-class citizens, with automated reverse-engineering of both sets. 

We still have a long way to go, but with your help - we will get there together.