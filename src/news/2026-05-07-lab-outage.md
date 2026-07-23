---
title: "Lab outage: btrfs cannot delete its way out of a full disk"
date: 2026-05-07T18:00:00Z
summary: "The lab's PostgreSQL master is offline: btrfs filled up and now refuses to delete files — or even snapshots — because it is out of space. No data was lost, thanks to our distributed replica architecture. We are moving the master to ZFS on OmniOS and teaching the lab to fail over to a replica. ETA back online: today."
---

The lab is down.

The disk filled. That should be a bad afternoon. On [btrfs](https://btrfs.readthedocs.io/), in the year 2026, on Linux [7.0.1](https://www.kernel.org/), it is an outage. The filesystem will not delete files, because deleting a file requires writing metadata, and writing metadata requires space. It will not delete snapshots either, for the same reason. The one operation a full filesystem must support — making itself less full — is the operation it cannot perform.

This is nuts. It would have been nuts in 2010.

We lost no data. The distributed replicas did their job. What we did lose is availability, because the lab frontend is configured to talk to the master. That is on us, and we are fixing it in the same window.

Here is the plan, executing now:

- The PostgreSQL master is moving to [ZFS](https://openzfs.org/) on [OmniOS](https://omnios.org/). ZFS does not lock itself out of its own free-space accounting when a pool fills. It tells you the pool is full and lets you delete things. That is the bar.
- The lab is being reconfigured to fail over to a replica when the master is unreachable, instead of sitting there staring at a dead socket.
- WAL archiving is being pointed at object storage so the next standby we bring up does not have to be in the same rack as the master to be useful.

Services that do not depend on the lab database — the site, the [tap](https://github.com/atomdrift-project/homebrew-tap), release artifacts on [GitHub](https://github.com/atomdrift-project) — stay up.

ETA for full recovery is today.

Two things written down so we read them next time:

1. A filesystem that cannot delete files when it is full is not finished.
2. A client that only knows how to talk to the primary does not have a replica. It has a spare it has never met.

Back shortly.
