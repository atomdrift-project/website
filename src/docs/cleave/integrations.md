---
title: "Integrations"
---

## Stream reports to another process

```bash
cleave --format jsonl ./samples > reports.jsonl
```

Use `--min-file-crit suspicious` when a consumer needs only files whose highest
finding is suspicious or hostile. Use `--min-crit` to filter individual
findings while retaining the selected file reports.

## Gate on a release diff

```bash
cleave diff previous/ candidate/ --scope traits,symbols,strings
```

Treat the diff as review input rather than a universal pass/fail rule. New
capabilities can be legitimate; the useful signal is the capability plus its
evidence and release context.

## Embed or serve cleave

For high-volume callers, use the Rust API or the long-running HTTP server
instead of spawning a CLI for every file:

- [Integration guide](https://github.com/atomdrift-project/cleave/blob/main/docs/INTEGRATION.md)
- [Rust API](https://github.com/atomdrift-project/cleave/blob/main/docs/RUST_API.md)
- [Server API](https://github.com/atomdrift-project/cleave/blob/main/docs/SERVER_API.md)
- [JSON schema](https://github.com/atomdrift-project/cleave/blob/main/docs/JSON.md)

Pin the cleave version, traits revision, enabled components, and optional tool
versions for reproducible pipelines. `cleave version` supplies the rule
inventory to record with a result.

Do not expose the server directly to the internet. It parses hostile files and
needs request, memory, file-size, concurrency, and network controls.
