---
title: "Atomdrift lab going dark for bandwidth upgrade"
date: 2026-05-26T18:00:00Z
summary: "The Atomdrift research lab will be offline for several hours today while engineers upgrade the uplink feeding forager, the in-house crawler that has been pinned at line rate around the clock pulling releases from more than 100 software marketplaces."
---

The Atomdrift research lab will be offline for several hours today while engineers upgrade the network uplink that has been pinned at line rate, around the clock, under the load of the lab's own supply-chain crawler.

That crawler is [forager](https://codeberg.org/atomdrift/forager), a Go service that polls public package registries for new and updated releases and feeds them to [litmus](https://codeberg.org/atomdrift/litmus) and [cleave](https://codeberg.org/atomdrift/cleave) for malware analysis. Open-source maintainers do not publish on a schedule; they publish continuously, and forager ingests continuously to match.

forager presently tracks more than 100 marketplaces. A sample, drawn from its `pkg/registry` tree:

- **Language registries:** [npm](https://www.npmjs.com/), [PyPI](https://pypi.org/), [crates.io](https://crates.io/), [RubyGems](https://rubygems.org/), [Maven Central](https://central.sonatype.com/), [NuGet](https://www.nuget.org/), [Packagist](https://packagist.org/), [Hex](https://hex.pm/), [Hackage](https://hackage.haskell.org/), [CPAN](https://www.cpan.org/), [CRAN](https://cran.r-project.org/), [LuaRocks](https://luarocks.org/), [Clojars](https://clojars.org/), [pub.dev](https://pub.dev/), Go modules, [unpkg](https://unpkg.com/).
- **OS repositories:** [Homebrew](https://brew.sh/), [Alpine](https://pkgs.alpinelinux.org/), [Arch](https://archlinux.org/packages/) and the [AUR](https://aur.archlinux.org/), [Debian](https://www.debian.org/distrib/packages), [Fedora](https://packages.fedoraproject.org/), [RPM Fusion](https://rpmfusion.org/), [Wolfi](https://github.com/wolfi-dev), [FreeBSD ports](https://www.freebsd.org/ports/), [NetBSD pkgsrc](https://pkgsrc.org/), [OpenBSD ports](https://www.openbsd.org/ports.html).
- **Windows and macOS:** [Chocolatey](https://chocolatey.org/), [Scoop](https://scoop.sh/), [Winget](https://learn.microsoft.com/en-us/windows/package-manager/winget/), [PowerShell Gallery](https://www.powershellgallery.com/), [MacUpdate](https://www.macupdate.com/).
- **Browser and editor marketplaces:** [Chrome Web Store](https://chromewebstore.google.com/), [Edge Add-ons](https://microsoftedge.microsoft.com/addons/), [Mozilla Add-ons](https://addons.mozilla.org/), [VS Code Marketplace](https://marketplace.visualstudio.com/), [Open VSX](https://open-vsx.org/), [WordPress plugins](https://wordpress.org/plugins/).
- **Other:** [GitHub Releases](https://github.com/), the [GitHub Actions marketplace](https://github.com/marketplace?type=actions), and a long tail of vendor download sites.

In aggregate, the trickle from each source is a firehose, and the pipe is full. The new uplink restores headroom.

Security engineers running Atomdrift tooling will not notice the outage. litmus and cleave ship deterministic local AI/ML models: every verdict is computed on the operator's own hardware, with no callback to a cloud scoring service. No SaaS, no SaaS downtime.
