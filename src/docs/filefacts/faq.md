---
title: "FAQ"
---

## Does filefacts need network access?

No. The library and CLI inspect local bytes and optional local tools. There is
no telemetry, model download, or cloud API.

## Is everything in-process?

No. Most parsers are in-process, including Authenticode verification. For PE,
ELF, and Mach-O files, deeper recovery can invoke Rizin or radare2 when one is
installed.

## Is output reproducible?

Yes when the bytes, filefacts build, requested views, configuration, and
optional tool versions are fixed. Pin those inputs for model training and
incident reprocessing.

## What happens on damaged input?

Parsers return the facts they can recover and add diagnostics to the `errors`
view. Consumers should distinguish extraction failure from an absent feature.

## Is filefacts a malware scanner?

No. It extracts structured facts and does not assign a benign/hostile verdict.
Use [cleave](/cleave/) for capability matching or [Atomdrift Scan](/scan/) for a
complete verdict.

## How do I inspect only one kind of data?

Use a view name, for example `filefacts metrics sample`, `filefacts imports
sample`, or `filefacts errors sample`. Run `filefacts --help` for the full list.
