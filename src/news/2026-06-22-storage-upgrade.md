---
title: "Lab down today: growing the database to 4TB before the admins disappear for summer vacation"
date: 2026-06-22T16:00:00Z
summary: "The Atomdrift lab is offline for hardware maintenance today while engineers grow storage on the PostgreSQL master and its replicas to hold a 4TB dataset — the corpus of analyses we now track for more than 41 million files."
---

The Atomdrift lab is offline today for planned hardware maintenance. The job is storage.

We are growing the disks under the PostgreSQL master and every replica to hold a dataset that has crossed **4TB** — the record of every analysis the lab has ever run, now spanning **more than 41 million files**. That number crept up on us: each release [forager](https://github.com/isotope13-dev/forager) pulls from the registries gets parsed, scored, and filed, and the corpus only grows. The old volumes were sized for last quarter's ingest rate, not today's.

The timing is deliberate. Our admins leave for summer vacation next week, and nobody wants a pager going off over a full volume while the people who know the racks are on a beach. We have [filled a disk at a bad hour before](/news/2026-05-07-lab-outage/); this time we are doing the boring version, everyone present and the runbook open. The goal of today's window is a quiet July.

The plan:

- The master comes down, its [ZFS](https://openzfs.org/) pool expands onto the new disks, and it returns verified.
- Each replica is grown and re-synced in turn, so we never drop below quorum and the corpus stays fully redundant throughout.
- Headroom is sized for where 41 million is heading, not where it sits today.

Services that do not lean on the lab database stay up: the site, the [tap](https://github.com/atomdrift-project/homebrew-tap), and release artifacts on [GitHub](https://github.com/atomdrift-project).

And if you run Atomdrift tooling, today's outage is somebody else's problem — by design. That is the point of our offline-first approach: [litmus](/litmus/) and [cleave](/cleave/) ship deterministic local AI/ML models, and every verdict is computed on your own hardware, with no callback to a cloud scorer. The lab being down does not slow a single scan on your machine. No SaaS, no SaaS downtime.

Back online today. Have a good summer, admins.
