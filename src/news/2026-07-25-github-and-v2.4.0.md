---
title: "New home on GitHub — and v2.4.0 across the board"
date: 2026-07-25
summary: "Every Atomdrift project has moved to GitHub, and we're marking the occasion with a coordinated v2.4.0: first-class dependency scanning, 16 GiB files, and faster archives — landing the same week Scan posted its best head-to-head run yet at 94% detection with zero false positives."
---

Atomdrift has a new home: every repository now lives on
[GitHub](https://github.com/atomdrift-project). Codeberg's abrupt new policy
direction left our AI-assisted, self-reinforcement-learning workflow out in the
cold ([the long version is here](https://choosehappy.dev/posts/2026/so-long-codeberg-and-thanks-for-all-the-fish/)),
and the genuinely painful part wasn't the principle — it was re-pinning every Go
and Rust dependency across all **30 of our repositories** by hand.

**A coordinated v2.4.0.** The headline is dependencies as first-class citizens.
[Atomdrift Scan](/scan/) now fetches a sample's dependencies by default and
gives each one its own verdict — a hostile transitive package surfaces as
itself, not as a footnote on its parent. Worker mode sweeps every resolvable
dependency (interactive scans stay gated to fresh releases, where supply-chain
compromise actually shows up), and Go pseudo-versions are now dated correctly so
that gate works.

**Built to scale.** Scan handles files up to 16 GiB, streaming oversized
payloads so a 16 GiB sample analyzes on an 8 GiB host instead of falling over.
Lockfile-heavy scans skip needless YARA work on registry metadata, and on the
[cleave](/cleave/) side large-archive evaluation is dramatically faster — a
63,000-member archive that once took ~48 minutes now tracks its loose-file
baseline of under six. stng v1.8.0 and filefacts v1.3.0 round out the set with
their own caching and parsing improvements.

**And the scoreboard.** In this week's [Malware Scanner Battle Royale](/compare/) — fresh,
ground-truth-labelled packages, scored blind — Atomdrift Scan caught 94% of
malicious samples with zero false positives. The next-best detector managed
58%, and paid for it with a 16% false-positive rate. We'll take it.

Release notes:
[cleave v2.4.0](https://github.com/atomdrift-project/cleave/releases/tag/v2.4.0) ·
[scan v2.4.0](https://github.com/atomdrift-project/scan/releases/tag/v2.4.0) ·
[filefacts v1.3.0](https://github.com/atomdrift-project/filefacts/releases/tag/v1.3.0) ·
[stng v1.8.0](https://github.com/atomdrift-project/stng/releases/tag/v1.8.0).

```
brew upgrade atomdrift-project/tap/scan atomdrift-project/tap/cleave atomdrift-project/tap/filefacts atomdrift-project/tap/stng
```
