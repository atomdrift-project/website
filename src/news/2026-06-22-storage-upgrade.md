---
title: "Lab down today: growing the database to 4TB before the admins disappear for summer vacation"
date: 2026-06-22T16:00:00Z
summary: "The Atomdrift lab is offline for hardware maintenance today while engineers grow storage on the PostgreSQL master and its replicas to hold a 4TB dataset — the corpus of analyses we now track for more than 41 million files."
---

The Atomdrift lab is offline today for planned hardware maintenance.

The job is storage. We are growing the disks under the PostgreSQL master and every replica to hold a dataset that has crossed **4TB**. That dataset is the accumulated record of every analysis the lab has run — and as of this week, the lab tracks analyses for **more than 41 million files**.

41 million is the kind of number that creeps up on you. Each new release [forager](https://codeberg.org/atomdrift/forager) pulls from the registries gets parsed, scored, and filed away, and the corpus only ever grows. The old volumes had headroom for the rate we ingested at last quarter, not the rate we ingest at now. Rather than wait for a disk to fill at an inconvenient hour — we have [done that before](/news/2026-05-07-lab-outage/) — we are doing the boring, deliberate version of the upgrade while we are watching.

The timing is not an accident. The admins are leaving for summer vacation next week, and nobody wants a pager going off over a full volume while the people who know the racks are on a beach. So the master and the replicas are getting their storage now, with everyone present, coffee in hand, and the runbook open. The goal of today's window is a quiet July.

The plan for the window:

- The PostgreSQL master comes down, its [ZFS](https://openzfs.org/) pool is expanded onto the new disks, and it comes back verified.
- Each replica is grown in turn and re-synced, so we never drop below quorum and the corpus stays fully redundant throughout.
- Headroom is sized for where 41 million files is heading, not where it is today.

Services that do not lean on the lab database stay up: the site, the [tap](https://codeberg.org/atomdrift/homebrew-tap), and release artifacts on [Codeberg](https://codeberg.org/atomdrift).

And if you run Atomdrift tooling, today's outage is somebody else's problem — none of it touches your end-user tools, by design. That is the whole point of our offline-first approach: [litmus](/litmus/) and [cleave](/cleave/) ship deterministic local AI/ML models, and every verdict is computed on your own hardware with no callback to a cloud scoring service. The lab being down does not slow a single scan on your machine. No SaaS, no SaaS downtime.

Back online today. Have a good summer, admins.
