---
title: "FAQ"
---

## Does cleave upload files?

No. Analysis is local and cleave has no cloud-scoring API.

## Does it need network access?

The first analysis downloads a compatible traits bundle. The CLI also performs
a best-effort release notice check at most daily. After setup, set
`CLEAVE_NO_UPDATE_CHECK=1` to suppress that check.

## Is cleave a malware verdict engine?

No. cleave reports capabilities and criticality-ranked evidence. Atomdrift Scan
uses that report with Azoth to produce benign, suspicious, or hostile verdicts.

## Is the output deterministic?

The findings are deterministic when input, rules, tools, options, and platform
filters are fixed. Reports include timestamps, and optional Rizin/UPX analysis
can change the facts available.

## Why did a benign program receive suspicious findings?

Capabilities are not intent. Administrative tools, installers, debuggers, and
security software often use behavior also seen in malware. Review the matched
evidence and surrounding capabilities before acting.

## What if a format is unsupported?

cleave reports what it can extract and records recoverable diagnostics. A lack
of findings is not proof of safety, especially for unsupported packers or
runtime-only behavior.

## How many rules are installed?

Run `cleave version`. Counts change as the public traits and third-party YARA
bundles evolve, so the CLI inventory is more reliable than a number on a web
page.
