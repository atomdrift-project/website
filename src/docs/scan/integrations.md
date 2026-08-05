---
title: "Integrations"
---

## CI gate

The simplest integration is the CLI's exit status:

```bash
atomscan ./artifact
```

`0` is benign, `1` hostile, `2` suspicious, and `3` an analysis error. Decide
explicitly whether suspicious results should block your pipeline.

For a stable network boundary in CI, install bundles ahead of time and run:

```bash
SCAN_NO_UPDATE_CHECK=1 atomscan --no-update --fetch=none ./artifact
```

Omit `--fetch=none` when you want Scan to inspect dependencies and URLs
referenced by the artifact.

## Machine-readable output

```bash
atomscan -f json ./artifact > scan.json
```

Pin the Scan version and record `atomscan version` alongside long-lived results
so a future reviewer knows which models and rules produced them.

## Long-running service and workers

Scan also provides an HTTP server and distributed hopper workers for teams that
do not want to pay CLI startup cost per request. Use the maintained upstream
documentation for the security and resource controls:

- [Integration guide](https://github.com/atomdrift-project/scan/blob/main/docs/INTEGRATION.md)
- [Server API](https://github.com/atomdrift-project/scan/blob/main/docs/SERVER_API.md)
- [Worker guide](https://github.com/atomdrift-project/scan/blob/main/docs/WORKERS.md)
- [JSON schema](https://github.com/atomdrift-project/scan/blob/main/docs/JSON.md)

Do not expose a scan or hopper service directly to the public internet. It
accepts hostile input and can consume substantial CPU, memory, and disk.
