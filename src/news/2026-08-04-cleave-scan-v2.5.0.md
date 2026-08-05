---
title: "cleave & Scan v2.5.0: quiet failures get loud, and cleave lands on Windows"
date: 2026-08-04
summary: "Files that used to produce no verdict at all — a truncated archive, a half-written gzip, a member that failed to scan — now say so. Plus ISO analysis, verified Mach-O signatures, five seconds off every cold start, and first builds for Windows, DragonFlyBSD, NetBSD, illumos/OmniOS and Solaris 11.4."
---

**Silence was passing for safety.** In [cleave](/cleave/), a truncated gzip
aborted with no report at all and a truncated archive passed without comment.
Both now raise `anti-analysis`, `malformed` and `archive-incomplete`, and the
gzip's decoded prefix is analyzed rather than discarded. In
[Scan](/scan/), a file that fails to scan emits an error line instead of
silently producing no record. If you have been reading an empty result as a
clean one, upgrade for this alone.

**Coverage that depended on thread timing.** cleave's rizin skip was
process-global: one member opting out muted rizin for whatever binary another
thread happened to be parsing, so what got disassembled in a binary-heavy
archive varied with interleaving. Also fixed — PE signer names with escaped
commas were truncated (`O=Postman\, Inc.` surfaced as `Postman\`, finding ids
included), and `cleave update` no longer wedges on a dangling traits symlink.

**More that cleave can see.** ISO images are now analyzable. Mach-O code
signatures are verified rather than merely read, so a signature that doesn't
match its bytes says so, and entitlement labels state what they actually grant.

**Less work for the same answer.** Cold start sheds about five seconds by
memoizing regex derivations to disk. Within an archive scan, cheap string atoms
gate the regexes behind them, duplicate lazy compiles are deduplicated, and
member strings are freed once matched — multiple GB back on member-heavy
archives. Scan skips YARA on registry records, runs registry lookups and
dependency hops concurrently, skips the per-dependency model pass on plain JSON
scans, and threads worker startup indexing. Stored reports keep only the nodes
someone will read again: ~77% fewer, ~56% fewer bytes.

**Fetch less, know more.** Discovered URLs are filtered before the network
phase, and only the newest version of a package in a dependency tree is fetched.
Go pseudo-versions are dated from the version string, so the age gate rejects an
old module without a round trip; worker mode drops the gate entirely. Registry
metadata now travels with the sample, so a
[hopper](https://github.com/atomdrift-project/hopper)-sourced scan reasons over
the same facts a live fetch would. `--interpret` is organized per package with
provenance ahead of traits, and `--hopper` takes a URL or package name (or
`SCAN_HOPPER`).

**Where they run.** cleave has its first Windows and NetBSD builds, plus
illumos cross-builds; Scan adds DragonFlyBSD, NetBSD, illumos/OmniOS and
Solaris 11.4. One bug worth naming beyond its release note: on FreeBSD,
`MALLOC_CONF=background_thread:true` permanently breaks libc jemalloc
initialization — a deadlock, not an error message. Scan no longer sets it.

Release notes:
[cleave v2.5.0](https://github.com/atomdrift-project/cleave/releases/tag/v2.5.0) ·
[scan v2.5.0](https://github.com/atomdrift-project/scan/releases/tag/v2.5.0).

```
brew upgrade atomdrift/tap/cleave atomdrift/tap/scan
```

::: note One housekeeping note
News and Discoveries are now one page and one feed: [/news/](/news/) and
[/feed.xml](/feed.xml). Every article keeps its old URL, and the discoveries
feed redirects to the combined one.
:::
