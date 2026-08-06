---
title: "Precompiled binaries and a one-line installer"
date: 2026-08-05
summary: "Atomdrift Scan now ships prebuilt binaries for eight Linux architectures, macOS, the BSDs, Solaris/illumos, Android, and Windows — with a new installer at install.atomdrift.org that verifies what it downloads before it replaces anything. Testers welcome."
---

**No more waiting on a source build.** [Atomdrift Scan](/scan/) now publishes
precompiled binaries, and there is a new install page to go with them:
[install.atomdrift.org](https://install.atomdrift.org/).

On macOS, Linux, BSD, Solaris/illumos, or Android:

```
curl -fsSL https://install.atomdrift.org/scan.sh | sh
```

On Windows 10, Windows 11, or Windows Server 2022:

```
irm https://install.atomdrift.org/scan.ps1 | iex
```

**What the installer does.** It detects your platform, checks the release
SHA-256 and whatever build provenance is available, and runs `--version` on the
new binary before replacing anything on disk. On macOS and Linux it hands off to
Homebrew when Homebrew is present, so your package manager keeps owning upgrades
and PATH; pass `--method binary` to take the prebuilt release directly. If no
binary exists for your platform, it falls back to building from source.

**Linux gets breadth.** x86-64 and ARM64, ARMv6/ARMv7 hard-float, plus
LoongArch64, s390x, RISC-V 64, and POWER64LE. If you have hardware in that tail
end of the list, we would especially like to hear from you — file installer
issues against
[atomdrift-project/installer](https://github.com/atomdrift-project/installer/issues)
and tell us what worked and what didn't.

Prefer to do it by hand? Every artifact is on the
[releases page](https://github.com/atomdrift-project/scan/releases) with a
`SHA256SUMS` file next to it.

::: note macOS notarization is still pending
Our macOS binaries are in Apple's notarization queue. Until they clear, Gatekeeper
will complain about the downloaded builds — installing via Homebrew avoids that
in the meantime. We expect notarization to come through tomorrow, and we'll
update here once it does.
:::
