const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const markdownItAnchor = require("markdown-it-anchor");
const markdownItContainer = require("markdown-it-container");

// Render a named admonition (::: note … :::) as a titled callout box. The block
// info string may carry a custom title, e.g. `::: warning Heads up`.
function admonition(name, defaultTitle) {
  return [markdownItContainer, name, {
    render(tokens, idx) {
      if (tokens[idx].nesting !== 1) return "</div>\n";
      const title = tokens[idx].info.trim().slice(name.length).trim();
      return `<div class="admonition ${name}">\n` +
        `<p class="admonition-title">${title || defaultTitle}</p>\n`;
    },
  }];
}

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/.well-known");
  // The 0-day sample dump (~53MB) exceeds Cloudflare Pages' 25MB per-file limit,
  // so it's committed at demo/samples.zip and served raw from GitHub; /demo/samples.zip
  // 302s there (see _redirects) rather than being copied into the Pages build.
  eleventyConfig.addPassthroughCopy("src/_redirects");
  eleventyConfig.addPassthroughCopy("src/_headers");

  // Build-time syntax highlighting (Prism, no client JS).
  eleventyConfig.addPlugin(syntaxHighlight);

  // Extend the built-in markdown-it instance for the docs: deep-linkable
  // headings, callout admonitions, and Mermaid diagram fences.
  eleventyConfig.amendLibrary("md", (md) => {
    md.set({ linkify: true });
    md.use(markdownItAnchor, {
      permalink: markdownItAnchor.permalink.headerLink({ safariReaderFix: true }),
      level: [2, 3, 4],
    });
    md.use(...admonition("note", "Note"));
    md.use(...admonition("tip", "Tip"));
    md.use(...admonition("warning", "Warning"));
    md.use(...admonition("tbd", "To be written"));

    // A ```mermaid fence becomes <pre class="mermaid"> for client-side render,
    // instead of being highlighted as source.
    const defaultFence = md.renderer.rules.fence;
    md.renderer.rules.fence = (tokens, idx, options, env, self) => {
      if (tokens[idx].info.trim() === "mermaid") {
        return `<pre class="mermaid">${tokens[idx].content}</pre>`;
      }
      return defaultFence(tokens, idx, options, env, self);
    };
  });

  // Everything we publish, newest first: release notes and project news from
  // src/news, malware post-mortems from src/discoveries. They share one page and
  // one feed — a reader following the project wants both, and splitting them
  // meant a discovery could only be found by someone who already knew to look.
  // Each post keeps its own tag (and so its own permalink shape), so a template
  // can still tell the two apart; see the listing's per-type meta line.
  eleventyConfig.addCollection("posts", function(api) {
    return api.getFilteredByTag("news")
      .concat(api.getFilteredByTag("discoveries"))
      .sort(function(a, b) { return b.date - a.date; });
  });

  eleventyConfig.addFilter("dateDisplay", function(date) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  eleventyConfig.addFilter("dateYM", function(date) {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${year}/${month}`;
  });

  eleventyConfig.addFilter("slugStripDate", function(slug) {
    if (!slug) return "";
    return slug.replace(/^\d{4}-\d{2}-\d{2}-/, "");
  });

  // Look up the first object in an array whose key === val (for joining the
  // per-benchmark leaderboards on the /compare/ page).
  eleventyConfig.addFilter("find", function(arr, key, val) {
    if (!Array.isArray(arr)) return null;
    return arr.find(function(o) { return o && o[key] === val; }) || null;
  });

  // Filter an array to objects whose key === val (splits the audit data into
  // known-bad and known-good tables on the /compare/ page).
  eleventyConfig.addFilter("where", function(arr, key, val) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function(o) { return o && o[key] === val; });
  });

  // Split an array on whether a key is set (truthy) vs not — used to separate the
  // corroborated detection cohort from skipped, provider-reported samples.
  eleventyConfig.addFilter("whereSet", function(arr, key) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function(o) { return o && o[key]; });
  });
  eleventyConfig.addFilter("whereUnset", function(arr, key) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(function(o) { return !(o && o[key]); });
  });

  // Turn the by-ecosystem map into a list sorted by how many samples each
  // ecosystem holds, most first. Every scanner sees every sample (as a verdict or
  // unsupported), so the sample count is the max tier-sum across the board.
  eleventyConfig.addFilter("byEcoSize", function(byEco) {
    const size = (board) => Math.max(0, ...(board || []).map(function(s) {
      return s.hostile + s.suspicious + s.benign + (s.errored || 0) + s.unsupported;
    }));
    return Object.entries(byEco || {})
      .map(function([eco, board]) { return { eco: eco, board: board, n: size(board) }; })
      .sort(function(a, b) { return b.n - a.n; });
  });

  // Turn the providers map into a list (each entry tagged with its key), sorted
  // by registry coverage, most first — the order of the /compare/ feature table.
  eleventyConfig.addFilter("byRegistries", function(providers) {
    if (!providers) return [];
    return Object.entries(providers)
      .map(function([key, p]) { return Object.assign({ key: key }, p); })
      .sort(function(a, b) { return (b.registries || []).length - (a.registries || []).length; });
  });

  // A block is a verdict of hostile, at the engine's default setting (see
  // gauntlet's points.go). flaggedRate is that rate as a 0..100 percentage, or
  // null when the engine scanned nothing.
  const flaggedRate = (s) => (s && s.supported) ? s.hostile / s.supported * 100 : null;

  // battle.json is the published window — every sample scored over the last
  // battle.window.days, pooled and scored as one cohort by gauntlet (see its
  // window.go) — so every figure here comes from the same samples. Only the trend
  // chart is per-run, and it reads history.json. A score is
  // { scanner, flagged, n }, flagged being what the engine blocked.
  function headlineScores(battle) {
    const board = (b) => ((b && b.leaderboard) || [])
      .map((s) => ({ scanner: s.scanner, flagged: s.hostile, n: s.supported }));
    const w = battle && battle.window;
    return {
      det: board(battle && battle.detection), fp: board(battle && battle.false_positive),
      nBad: (battle && battle.detection && battle.detection.sample_count) || 0,
      nGood: (battle && battle.false_positive && battle.false_positive.sample_count) || 0,
      window: w ? { days: w.days, runs: w.runs } : null,
    };
  }
  // The same, for one display ecosystem: its leaderboards and operating points.
  // Null when the ecosystem has no known-good files to score false positives on.
  function ecoScores(battle, eco) {
    const det = ((battle && battle.detection && battle.detection.by_ecosystem) || {})[eco];
    const fp = ((battle && battle.false_positive && battle.false_positive.by_ecosystem) || {})[eco];
    if (!det || !fp) return null;
    const board = (b) => b.map((s) => ({ scanner: s.scanner, flagged: s.hostile, n: s.supported }));
    const n = (b) => (b.find((s) => s.scanner === "ascan") || b[0] || {}).supported || 0;
    const w = battle.window;
    return {
      det: board(det), fp: board(fp), nBad: n(det), nGood: n(fp),
      window: w ? { days: w.days, runs: w.runs } : null,
      points: ((battle.operating_points_by_ecosystem || {})[eco]) || [],
    };
  }
  // scoresFor: the whole cohort, or one ecosystem when eco is given.
  const scoresFor = (battle, eco) => (eco ? ecoScores(battle, eco)
    : Object.assign(headlineScores(battle), { points: (battle && battle.operating_points) || [] }));
  // A score's rate as a 0..100 percentage, null when it scored nothing.
  const scoreRate = (s) => (s && s.n) ? s.flagged / s.n * 100 : null;
  // Rates are shown to one decimal. pct keeps a rate numeric (for plotting and
  // comparison); fmtPct / the pct1 filter render it as %.1f.
  const pct = (x) => Math.round(x * 10) / 10;
  const fmtPct = (x) => Number(x).toFixed(1);
  eleventyConfig.addFilter("pct1", fmtPct);

  // headline distills the figures to the one line a skim-reader needs: how the
  // subject (ascan) did on detection, how it compares with the best *other*
  // engine, and its false-positive rate. Null if ascan didn't scan.
  eleventyConfig.addFilter("headline", function(battle) {
    const src = headlineScores(battle);
    const usDet = scoreRate(src.det.find((s) => s.scanner === "ascan"));
    if (usDet === null) return null;
    let best = null; // best competing detection rate
    for (const s of src.det) {
      if (s.scanner === "ascan") continue;
      const r = scoreRate(s);
      if (r === null) continue;
      if (!best || r > best.det) best = { name: s.scanner, det: r };
    }
    // parity: Atomdrift at the loosest -l whose false-positive rate is no worse
    // than the strongest rival's at its default — the like-for-like comparison
    // the headline makes. Null when no -l stop qualifies.
    let parity = null;
    if (best) {
      const rivalFp = scoreRate(src.fp.find((s) => s.scanner === best.name));
      const pts = ((battle && battle.operating_points) || []).filter((p) => p.scanner === "ascan");
      const stops = pts.map(opPoint).filter((o) => rivalFp !== null && o.fp <= pct(rivalFp));
      const at = stops.reduce((a, b) => (!a || b.det >= a.det ? b : a), null);
      if (at) parity = { level: at.level, det: at.det, fp: at.fp, rival: best.name, rivalDet: pct(best.det), rivalFp: pct(rivalFp) };
    }
    return {
      parity: parity,
      bestName: best ? best.name : null,
      bestDet: best ? pct(best.det) : null,
      leads: !best || usDet >= best.det,
      split: ascanSplit(battle),
      sampleCount: src.nBad,
      nGood: src.nGood,
      window: src.window,
    };
  });

  // trendPoints trims history to what the trend chart draws, so the page inlines
  // only the per-run detection rates it plots.
  eleventyConfig.addFilter("trendPoints", function(history) {
    return (history || []).map((p) => ({ at: p.at, bad: p.bad, detection: p.detection }));
  });

  // Engine draw order for anything that colors by engine (the quadrant, the trend
  // chart): the fixed categorical slot order declared in providers.json. Fixed
  // order, never cycled — an engine keeps its hue whichever chart it appears in
  // and whoever else is on screen.
  eleventyConfig.addFilter("bySlot", function(providers) {
    return Object.entries(providers || {})
      .filter(function([, p]) { return !p.hidden; })
      .map(function([key, p]) { return Object.assign({ key: key }, p); })
      .sort(function(a, b) { return (a.slot || 99) - (b.slot || 99); });
  });

  // ---------------------------------------------------------------------------
  // chartProviders: providers.json with a chart-only display name attached.
  //
  // A chart legend has room for a fuller label than a sentence does, and
  // VirusTotal's whole shape is that it is an aggregate of other engines — the
  // legend is where that belongs, so a reader isn't comparing one scanner's
  // result against seventy pooled ones without being told. Prose, the audit
  // table's narrow per-engine columns and the methodology line keep the short
  // `name`, so a sentence still reads "the next-best engine, VirusTotal at 61%".
  //
  // The count is measured, not declared: VT reports how many engines actually
  // scanned each sample and that varies run to run and file to file (60-71 in a
  // recent run, as engines time out or skip a type), so this takes the run's
  // median rather than a hardcoded number that goes stale as VT's roster moves.
  // ---------------------------------------------------------------------------

  // vtEngineTotal is the median engine count across a run's VirusTotal verdicts,
  // or null if none are readable. The total lives in the verdict detail, which
  // gauntlet writes as "2/70 engines (malicious=2, suspicious=0)"; a detail that
  // doesn't match is skipped, so a format change downgrades the label to the
  // plain name instead of printing a wrong count.
  function vtEngineTotal(battle) {
    const totals = [];
    for (const s of (battle && battle.samples) || []) {
      for (const v of s.verdicts || []) {
        if (v.scanner !== "virustotal") continue;
        const m = /^\d+\/(\d+) engines/.exec(v.detail || "");
        if (m) totals.push(Number(m[1]));
      }
    }
    if (!totals.length) return null;
    totals.sort(function(a, b) { return a - b; });
    const mid = totals.length >> 1;
    return totals.length % 2 ? totals[mid] : Math.round((totals[mid - 1] + totals[mid]) / 2);
  }

  eleventyConfig.addGlobalData("chartProviders", function() {
    let providers = {}, battle = {};
    try {
      providers = require("./src/_data/providers.json");
      battle = require("./src/_data/battle.json");
    } catch (e) {
      return providers;
    }
    const out = {};
    for (const [key, p] of Object.entries(providers)) out[key] = Object.assign({}, p);
    const n = vtEngineTotal(battle);
    if (n && out.virustotal) out.virustotal.chartName = out.virustotal.name + " [" + n + " engines]";
    return out;
  });

  // ---------------------------------------------------------------------------
  // blindSpots: the two gaps a hosted scanner has that a local engine does not.
  // (Named for the claim, not the mechanic — `coverage` is already this file's
  // filter for per-engine file-type capability, and the two would silently collide.)
  //
  //   unreadable — the artifact isn't a package in a registry they index, so
  //                there is nothing to look up. This is the same shape as a
  //                company's own code and its private dependencies: no purl, no
  //                registry, no vendor coverage, ever.
  //   noRecord   — the artifact IS a package they index, and they had no entry
  //                for it at the moment we asked. That is the detection gap:
  //                the window between a package going live and a vendor listing
  //                it, which is the entire window an attack operates in.
  //
  // Both are read straight off the same leaderboard the bars use, so this table
  // can never disagree with the chart above it.
  // ---------------------------------------------------------------------------
  eleventyConfig.addFilter("blindSpots", function(battle, providers) {
    const provs = providers || {};
    const board = (battle && battle.detection && battle.detection.leaderboard) || [];
    if (!board.length) return null;
    const rows = [];
    for (const s of board) {
      if (isHidden(provs, s.scanner)) continue;
      const unreadable = s.unsupported || 0, noRecord = s.nodata || 0;
      const p = provs[s.scanner] || {};
      rows.push({
        key: s.scanner, name: p.name || s.scanner, color: p.color || "#6b7280",
        hosted: !!p.hosted, us: s.scanner === "ascan",
        unreadable: unreadable, lookups: s.supported - unreadable, noRecord: noRecord,
        caught: s.hostile, n: s.supported,
      });
    }
    // Only the engines with a gap to show, worst first; the rest are named in prose.
    const gapped = rows.filter((r) => r.unreadable > 0 || r.noRecord > 0)
      .sort((a, b) => (b.unreadable - a.unreadable) || (b.noRecord - a.noRecord));
    if (!gapped.length) return null;
    // A sample with no purl is not a registry package at all — the population the
    // "unreadable" column is counting, verified from the samples rather than
    // inferred from the leaderboard.
    const cohort = ((battle && battle.samples) || [])
      .filter((s) => s.label === "bad" && !s.excluded);
    const nonPackage = cohort.filter((s) => !(s.purl || s.purl_base)).length;
    return {
      rows: gapped,
      clean: rows.filter((r) => r.unreadable === 0 && r.noRecord === 0),
      n: rows.length ? rows[0].n : 0,
      nonPackage: nonPackage,
      cohort: cohort.length,
    };
  });

  // ---------------------------------------------------------------------------
  // quadrant: the zero-day detection / false-positive plot.
  //
  // Everything the SVG needs is computed here — axes, the target quadrant, the
  // operating curve, and the hard part, label placement.
  //
  // Three decisions shape it:
  //
  //   1. The y axis is *cropped* at YMAX. On a typical run six of eight engines
  //      sit between 0% and 2%, and one engine crying wolf at 32% would stretch
  //      the scale until the entire decision is squashed into the top sixth of
  //      the plot. Anything past the crop is drawn in a marked off-scale strip
  //      below an axis break, at its true value, never silently clipped.
  //
  //   2. Each engine gets ONE line of text plus, only when it has any, a count of
  //      false positives underneath. The marker's height already states the
  //      false-positive rate, so repeating it beside the name is the redundant
  //      ink that used to collide.
  //
  //   3. Atomdrift is the only emphasized mark. Every rival is drawn at the same
  //      size and weight as every other rival — de-emphasis is size and weight
  //      only, never hue, so an engine keeps the colour it has in the bars and
  //      the trend chart.
  //
  // The y axis is inverted — 0% false positives at the top — so up and to the
  // right is unambiguously better.
  // ---------------------------------------------------------------------------
  const QW = 960, QH = 512;
  const QPL = 84, QPR = 904, QPT = 108, QPB = 426;
  const QSTRIP = 46;                       // off-scale strip below the axis break
  const QMB = QPB - QSTRIP;                // bottom of the in-scale band
  const QZERO = QPT + 36;                  // the 0% row, low enough for a leader above it
  const YMAX = 10;                         // false-positive crop
  const XDIV = 50, YDIV = 5;               // quadrant dividers
  const LINE_H = 14;

  function overlapArea(a, b) {
    const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return dx > 0 && dy > 0 ? dx * dy : 0;
  }

  // --- operating points ---------------------------------------------------------
  //
  // gauntlet publishes every engine at each setting it can run at
  // (battle.operating_points; see its points.go), scored over the same samples as
  // the bars: what the engine blocks as hostile there, and how many known-good
  // files it blocks with them. One setting per engine is the `default` — the one
  // every other figure on the page uses — and it equals the engine's bar.
  const DIAL_DEFAULT = 25;   // atomscan's shipped default

  function opPoint(p) {
    const r = (n, of) => (of ? pct((100 * n) / of) : 0);
    return {
      setting: p.setting, level: p.level || 0, isDefault: !!p.default,
      det: r(p.detected, p.cohort_n), fp: r(p.false_positives, p.fp_cohort_n),
    };
  }
  // Each engine's settings, in the order gauntlet published them.
  function pointsBy(points) {
    const out = {};
    for (const p of points || []) (out[p.scanner] = out[p.scanner] || []).push(opPoint(p));
    return out;
  }

  // ascanSplit: the hero's figures — everything Atomdrift detects (hostile +
  // suspicious), split into the two, on the malware and the known-good cohort.
  // `at` is one of its operating points; without one, its default, from the
  // leaderboards. Moving -l only moves verdicts between hostile and suspicious —
  // atomscan's suspicious band ends at a fixed level (gauntlet's
  // ascanSuspiciousCeiling) — so the total is the same at every stop, and a stop's
  // suspicious count is the total less what it blocks there.
  function ascanSplit(battle, at) {
    const us = (side) => ((battle && battle[side] && battle[side].leaderboard) || [])
      .find((s) => s.scanner === "ascan");
    const bad = us("detection"), good = us("false_positive");
    if (!bad || !bad.supported || !good || !good.supported) return null;
    const all = bad.hostile + bad.suspicious, fpAll = good.hostile + good.suspicious;
    const h = at ? at.detected : bad.hostile, fh = at ? at.false_positives : good.hostile;
    const r = (n, of) => pct((100 * n) / of);
    return {
      all: r(all, bad.supported), hostile: r(h, bad.supported), suspicious: r(all - h, bad.supported),
      fpAll: r(fpAll, good.supported), fpHostile: r(fh, good.supported), fpSuspicious: r(fpAll - fh, good.supported),
    };
  }

  // The hero dial walks Atomdrift's -l settings: at each stop, the split above.
  eleventyConfig.addFilter("ascanDial", function(battle) {
    const pts = ((battle && battle.operating_points) || []).filter((p) => p.scanner === "ascan");
    if (pts.length < 2 || !ascanSplit(battle)) return null;
    return pts.map((p) => Object.assign({ l: p.level || 0 }, ascanSplit(battle, p)));
  });
  eleventyConfig.addFilter("curveStop", function(curve, l) {
    if (!curve || !curve.length) return null;
    let out = curve[0];
    for (const c of curve) if (c.l <= l) out = c;
    return out;
  });
  eleventyConfig.addFilter("curveIndex", function(curve, l) {
    if (!curve || !curve.length) return 0;
    let i = 0;
    for (let k = 0; k < curve.length; k++) if (curve[k].l <= l) i = k;
    return i;
  });
  eleventyConfig.addGlobalData("dialDefault", () => DIAL_DEFAULT);

  const rateText = (p) => fmtPct(p.det) + "% · " + fmtPct(p.fp) + "% FP";

  // detectedBoard: the "Detected per engine" bars — a leaderboard with each
  // engine's detections at its most sensitive, hostile and suspicious alike, sorted
  // by that rate, highest first; engines that scanned nothing sort last. Detected
  // is the hostile + suspicious tally, or the loosest published setting where that
  // flags more: only VirusTotal's does, since its tiers call a lone engine benign
  // and at n=1 it counts. providers.json's `detect` names that threshold in the
  // engine's own terms; an engine with no weaker level has none.
  eleventyConfig.addFilter("detectedBoard", function(board, battle, providers, eco) {
    const points = (eco ? ((battle && battle.operating_points_by_ecosystem) || {})[eco]
      : battle && battle.operating_points) || [];
    const rate = (s) => (s.supported ? s.detected / s.supported : -1);
    return (board || []).map((s) => {
      const looser = points.filter((p) => p.scanner === s.scanner).map((p) => p.detected);
      return Object.assign({}, s, {
        detected: Math.max(s.hostile + s.suspicious, ...looser),
        threshold: ((providers || {})[s.scanner] || {}).detect || null,
      });
    }).sort((a, b) => rate(b) - rate(a));
  });

  // weightedDetected: the appendix's population-weighted rates (gauntlet's
  // hostile + suspicious weighting) as 0..100, highest first. gauntlet omits a
  // rate of 0, which is still a measured 0, so every engine stays listed.
  eleventyConfig.addFilter("weightedDetected", function(board) {
    return (board || []).map((s) => ({ scanner: s.scanner, rate: 100 * (s.weighted_flagged_rate || 0) }))
      .sort((a, b) => b.rate - a.rate);
  });

  // ascanFalsePositives: every known-good file Atomdrift flagged, hostile or
  // suspicious, sorted by file type then name — the rows behind the card's
  // false-positive rates, from the same samples the leaderboard counts.
  eleventyConfig.addFilter("ascanFalsePositives", function(samples) {
    const out = [];
    for (const s of samples || []) {
      if (s.label !== "good" || s.excluded === "ascan") continue;
      const v = (s.verdicts || []).find((x) => x.scanner === "ascan");
      if (!v || (v.tier !== "hostile" && v.tier !== "suspicious")) continue;
      out.push({ sha256: s.sha256, name: s.filename, filetype: s.filetype || "other", ecosystem: s.ecosystem, tier: v.tier });
    }
    return out.sort((a, b) => a.filetype.localeCompare(b.filetype) || a.name.localeCompare(b.name));
  });

  // quadrant: every engine as one coloured point at its default setting, labelled
  // the same way for all of them — bold name, plain rates, and the setting in grey
  // when there is a choice of one. An engine's other settings are grey dots on a
  // grey line; selecting one (script below the chart) moves the engine's point
  // and label there. With script off, the page is the defaults.
  eleventyConfig.addFilter("quadrant", function(battle, providers, eco) {
    const provs = providers || {};
    const src = scoresFor(battle, eco);
    if (!src) return null;
    const by = pointsBy(src.points);
    const fpBy = {};
    for (const s of src.fp) fpBy[s.scanner] = s;

    const engines = [];
    for (const d of src.det) {
      if (isHidden(provs, d.scanner)) continue;
      const p = provs[d.scanner] || {};
      let opts = by[d.scanner] || [];
      if (!opts.length) {
        // An older battle.json without points: the bar is the one setting.
        const f = fpBy[d.scanner];
        if (scoreRate(d) === null || scoreRate(f) === null) continue;
        opts = [{ setting: "", level: 0, isDefault: true, det: pct(scoreRate(d)), fp: pct(scoreRate(f)) }];
      }
      const def = opts.find((o) => o.isDefault) || opts[0];
      engines.push({
        key: d.scanner, name: p.name || d.scanner, color: p.color || "#6b7280", us: d.scanner === "ascan",
        opts: opts, def: def,
      });
    }
    if (engines.length < 2) return null;

    // A setting past the crop is drawn in a strip below an axis break, at its
    // true detection rate, with its false-positive rate in its label — never
    // clipped to the frame, which would understate it.
    const anyStrip = engines.some((e) => e.opts.some((o) => o.fp > YMAX));
    const pt = 24;
    const zero = pt + (QZERO - QPT);
    const mb = zero + (QMB - QZERO);
    const pb = mb + (anyStrip ? QSTRIP : 0);
    const stripY = mb + 30;
    const h = pb + (QH - QPB);
    const xOf = (v) => QPL + 18 + (v / 100) * (QPR - QPL - 40);
    const yOf = (v) => (v > YMAX ? stripY : zero + (v / YMAX) * (mb - zero));

    // --- labels ----------------------------------------------------------------
    // One line each. Width is estimated from character count; close enough for
    // collisions at these sizes, and it costs no layout pass.
    const NAME_PX = 7.2, RATE_PX = 6.3;
    const marks = [];
    for (const e of engines) {
      e.tuned = e.opts.length > 1;
      e.x = xOf(e.def.det);
      e.y = yOf(e.def.fp);
      e.rates = rateText(e.def);
      e.setting = e.tuned ? e.def.setting : "";
      e.optsView = e.opts.map((o) => ({
        setting: o.setting, level: o.level, isDefault: o.isDefault, rates: rateText(o),
        x: xOf(o.det), y: yOf(o.fp), onPlot: true, strip: o.fp > YMAX,
        title: e.name + (o.setting ? " " + o.setting : "") + ": " + fmtPct(o.det) + "% of malware blocked, " +
          fmtPct(o.fp) + "% of known-good blocked",
      }));
      const onPlot = e.optsView.filter((o) => o.onPlot);
      // The line joins the settings on the plot; the strip is below a break, so
      // nothing is drawn across it.
      const inScale = onPlot.filter((o) => !o.strip);
      e.line = e.tuned && inScale.length > 1 ? inScale.map((o) => o.x.toFixed(1) + "," + o.y.toFixed(1)).join(" ") : "";
      // The engine's slider runs strictest to loosest — by what each setting
      // blocks, ties kept in published order — whichever way its own scale runs
      // (VirusTotal's n and GuardDog's risk count down as they loosen).
      e.slider = onPlot.map((o, i) => ({ o: o, i: i }))
        .sort((a, b) => (a.o.x - b.o.x) || (a.i - b.i)).map((x) => x.o);
      e.slider.forEach((o, i) => { o.idx = i; });
      e.sliderDefault = e.slider.findIndex((o) => o.isDefault);
      e.title = e.optsView.find((o) => o.isDefault).title;
      const w = e.name.length * NAME_PX + 8 + e.rates.length * RATE_PX + (e.setting ? 8 + e.setting.length * RATE_PX : 0);
      marks.push({ x: e.x, y: e.y, r: e.us ? 6 : 5, w: w, h: LINE_H, engine: e });
    }

    // --- placement -------------------------------------------------------------
    // Candidate sides per label, preferring open space, then nudged until it
    // clears every dot, every line, the quadrant caption and the labels already
    // placed. Every label gets a leader to its dot.
    const obstacles = [];
    for (const e of engines) {
      for (const o of e.optsView) if (o.onPlot) obstacles.push({ x: o.x - 6, y: o.y - 6, w: 12, h: 12 });
      const pts = e.optsView.filter((o) => o.onPlot && !o.strip);
      for (let i = 1; i < pts.length && e.line; i++) {
        const a = pts[i - 1], b = pts[i];
        const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 6);
        for (let k = 0; k <= steps; k++) {
          obstacles.push({ x: a.x + ((b.x - a.x) * k) / steps - 2, y: a.y + ((b.y - a.y) * k) / steps - 2, w: 4, h: 4 });
        }
      }
    }
    const capW = 250, capH = 20;
    const placed = [{ x: QPR - 10 - capW, y: yOf(YDIV) - 10 - capH, w: capW, h: capH }];
    // Labels keep off the axis break: text sitting on it reads as struck through.
    if (anyStrip) placed.push({ x: QPL, y: mb + 4, w: QPR - QPL, h: 12 });
    const GAP = 14;
    const BOUND = { x: QPL + 4, y: pt - 2, w: QPR - QPL - 8, h: pb - pt + 4 };
    function candidates(m) {
      const right = { x: m.x + GAP, y: m.y - m.h / 2, anchor: "start" };
      const left = { x: m.x - GAP - m.w, y: m.y - m.h / 2, anchor: "end" };
      const below = { x: m.x - m.w / 2, y: m.y + GAP, anchor: "middle" };
      const above = { x: m.x - m.w / 2, y: m.y - GAP - m.h, anchor: "middle" };
      const horiz = m.x > (QPL + QPR) / 2 ? [left, right] : [right, left];
      const vert = m.y < zero + 40 ? [above, below] : [below, above];
      return horiz.concat(vert);
    }
    function cost(b) {
      let c = 0;
      for (const k of obstacles) c += overlapArea(b, k) * 3;
      for (const p of placed) c += overlapArea(b, p) * 4;
      const outX = Math.max(0, BOUND.x - b.x) + Math.max(0, b.x + b.w - (BOUND.x + BOUND.w));
      const outY = Math.max(0, BOUND.y - b.y) + Math.max(0, b.y + b.h - (BOUND.y + BOUND.h));
      return c + (outX + outY) * 400;
    }
    // The best box for a label of width w at a dot, and where its leader runs.
    function place(m, extra) {
      let best = null;
      for (const c of candidates(m)) {
        for (const [dx, dy] of [[0, 0], [0, 14], [0, -14], [0, 28], [0, -28], [0, 44], [0, -44],
          [40, 28], [40, -28], [-40, 28], [-40, -28], [0, 64], [60, 44], [-60, 44], [0, 84], [80, 64]]) {
          const b = { x: c.x + dx, y: c.y + dy, w: m.w, h: m.h, anchor: c.anchor };
          let sc = cost(b) + (Math.abs(dx) + Math.abs(dy)) * 2;
          for (const p of extra || []) sc += overlapArea(b, p) * 4;
          if (!best || sc < best.sc) best = { b: b, sc: sc };
          if (sc === 0) break;
        }
        if (best && best.sc === 0) break;
      }
      const b = best.b;
      const out = {
        box: b, anchor: b.anchor, y: b.y + 11,
        tx: b.anchor === "end" ? b.x + m.w : (b.anchor === "middle" ? b.x + m.w / 2 : b.x),
        leader: null,
      };
      const ex = Math.max(b.x, Math.min(m.x, b.x + m.w));
      const ey = Math.max(b.y, Math.min(m.y, b.y + m.h));
      const a = Math.atan2(ey - m.y, ex - m.x);
      const sx = m.x + Math.cos(a) * (m.r + 3), sy = m.y + Math.sin(a) * (m.r + 3);
      if (Math.hypot(ex - sx, ey - sy) > 3) out.leader = { x1: sx, y1: sy, x2: ex, y2: ey };
      return out;
    }
    const order = marks.slice().sort((a, b) => (b.engine.us - a.engine.us) || b.x - a.x);
    for (const m of order) {
      const at = place(m);
      m.engine.label = at;
      m.engine.leader = at.leader;
      placed.push(at.box);
    }
    // Every other setting gets its label placed too, against every other engine at
    // its default, so selecting it moves the label somewhere it fits rather than
    // dragging it by the offset it had at the default.
    for (const m of marks) {
      const e = m.engine;
      const others = placed.filter((b) => b !== e.label.box);
      for (const o of e.optsView) {
        if (o.isDefault || !o.onPlot) continue;
        const w = m.w - e.rates.length * RATE_PX + o.rates.length * RATE_PX +
          (e.setting ? (o.setting.length - e.setting.length) * RATE_PX : 0);
        const saved = placed.splice(0, placed.length, ...others);
        const at = place({ x: o.x, y: o.y, r: m.r, w: w, h: LINE_H });
        placed.splice(0, placed.length, ...saved);
        o.label = at;
      }
      const def = e.optsView.find((o) => o.isDefault);
      if (def) def.label = e.label;
    }

    return {
      w: QW, h: h, pl: QPL, pr: QPR, pt: pt, pb: pb, mb: mb, zero: zero,
      yMax: YMAX,
      xTicks: [0, 25, 50, 75, 100].map((v) => ({ v: v, x: xOf(v) })),
      yTicks: [0, 2, 4, 6, 8, 10].map((v) => ({ v: v, y: yOf(v) })),
      xDiv: xOf(XDIV), yDiv: yOf(YDIV), xDivVal: XDIV, yDivVal: YDIV,
      engines: engines,
      strip: anyStrip ? { y: stripY, breakY: mb + 10 } : null,
      nBad: src.nBad, nGood: src.nGood,
      window: src.window,
    };
  });

  // Capability coverage: the share of a sample set's constituent files a scanner
  // can actually analyze, per a declared filetype map (outer + inner types) and an
  // optional registry gate. This is computed from the file composition, not from
  // the verdict — a scanner returning "benign" tells you nothing about whether it
  // could even see the malware. Returns null for scanners not in the model below.
  //
  // ascan's --show=all gives each member a content-detected `type`; we grade every
  // engine against that real vocabulary. Atomdrift's own support is data-driven
  // (battle.ascan_types), so these sets are only for the other engines. Grouped by
  // what the file *is*:
  const union = (...sets) => new Set(sets.flatMap(function(s) { return [...s]; }));
  const T_SOURCE = new Set(["javascript", "typescript", "python", "go", "c", "cpp", "php", "ruby", "rust",
    "kotlin", "lua", "swift", "objc", "java", "csharp", "scala", "elixir", "clojure", "perl", "applescript",
    "zig", "dart", "groovy", "haskell"]);
  // What malcontent's programkind recognizes as a program: most source, plus the
  // scripts/binaries below — but NOT ruby/rust/kotlin/swift/etc. (no programkind
  // entry), and never data, docs, or images.
  const MAL_SOURCE = new Set(["javascript", "typescript", "python", "go", "c", "cpp", "php", "perl", "lua", "objc", "java"]);
  const T_SCRIPT = new Set(["shell", "powershell", "batch", "applescript"]);
  const T_BINARY = new Set(["elf", "pe", "macho", "python_bytecode", "java_class", "wasm", "beam", "msi", "dmg", "upx"]);
  const T_IMAGE = new Set(["png", "jpeg", "jpg", "gif", "bmp", "tiff", "svg"]);
  // Archive members (the outer wrapper is already excluded); engines that unpack
  // and recurse cover these.
  const T_ARCHIVE = new Set(["npm", "zip", "gz", "tar.zst", "tar.gz", "tgz", "whl", "nupkg", "crx", "vsix",
    "crate", "conda", "deb", "rpm", "apk", "jar", "war", "7z", "bz2", "xz", "zst", "tar"]);
  const T_DOC = new Set(["markdown", "text", "html", "rtf", "pdf"]);
  // Manifest files — how a deps service identifies a package within its ecosystem
  // (it reads these, plus the package source, to assess the dependency).
  const T_MANIFEST = new Set(["package.json", "package-lock.json", "npm-shrinkwrap.json", "pnpm-lock.yaml",
    "yarn.lock", "go.mod", "go.sum", "requirements.txt", "pyproject.toml", "poetry.lock", "pkg_info",
    "gemspec", "gemfile.lock", "cargo.toml", "cargo.lock", "composerjson", "composer.lock", "srcinfo",
    "chrome-manifest", "github_actions", "github-actions"]);
  // Registry gates for the deps services (the package ecosystems each indexes):
  const SOCKET_ECOS = new Set(["javascript", "python", "go", "php", "ruby", "rust", "java",
    "csharp", "dotnet", "huggingface", "chrome", "vscode"]);
  const AIKIDO_ECOS = new Set(["javascript", "typescript", "npm", "python", "pypi",
    "csharp", "dotnet", "nuget", "go", "golang", "php", "packagist", "vscode", "openvsx",
    "chrome", "rust", "crates", "ruby", "rubygems", "java", "maven", "jetbrains",
    "wordpress", "github-actions", "github_actions", "firefox", "edge", "homebrew", "github", "skills_sh"]);
  const GUARDDOG_ECOS = new Set(["javascript", "python", "go", "golang", "ruby", "rubygems", "github-actions", "github_actions"]);
  // SafeDep's community malware-analysis API — the ecosystems safeDepEcosystem()
  // in gauntlet maps a sample onto; anything else it reports as unsupported.
  const SAFEDEP_ECOS = new Set(["javascript", "typescript", "npm", "node", "nodejs", "python", "pypi",
    "java", "maven", "ruby", "rubygems", "gem", "csharp", "dotnet", "nuget", "rust", "cargo", "crates",
    "crates.io", "go", "golang", "php", "packagist", "composer", "github-actions", "github_actions",
    "actions", "terraform", "terraform_module", "terraform_provider", "vscode", "openvsx", "homebrew",
    "github", "github_release", "github_repo", "github_repository"]);
  // Per-engine supported file types, in ascan's vocabulary. ascan is special-cased
  // to battle.ascan_types in computeCoverage. ecos gates a deps service to the
  // package ecosystems it indexes.
  const COVERAGE_MODEL = {
    // malcontent (programkind): source, scripts, binaries, and archives it unpacks
    // — not data/manifests, docs, or images.
    malcontent: { types: union(MAL_SOURCE, T_SCRIPT, T_BINARY, T_ARCHIVE) },
    // ClamAV: binaries, archives it unpacks, images, and HTML/docs — signatures,
    // not source or manifests.
    clamav: { types: union(T_BINARY, T_ARCHIVE, T_IMAGE, new Set(["html", "text"])) },
    // Deps services assess a package within the ecosystems they index — its
    // manifest (how they identify it) plus its source/scripts; they don't parse
    // binaries, images, or loose data files.
    socket: { types: union(T_SOURCE, T_SCRIPT, T_MANIFEST), ecos: SOCKET_ECOS },
    // Aikido also parses Markdown (agent skills, prompt-injection content), so it
    // counts within any ecosystem Aikido indexes — not just skills.sh.
    aikido: { types: union(T_SOURCE, T_SCRIPT, T_MANIFEST, new Set(["markdown"])), ecos: AIKIDO_ECOS },
    guarddog: { types: union(T_SOURCE, T_SCRIPT, T_MANIFEST), ecos: GUARDDOG_ECOS },
    safedep: { types: union(T_SOURCE, T_SCRIPT, T_MANIFEST), ecos: SAFEDEP_ECOS },
    // VT takes any file: it identifies by hash, so every byte sequence is in
    // scope and no registry or file type gates it. Coverage is capability, not
    // knowledge — whether VT has a *record* of a file is scored as detection.
    virustotal: { any: true },
  };

  // innerFiles is a sample's member file-type counts with the outer archive
  // container itself removed — coverage is graded on the files *within* the
  // package, not the wrapper. A sample whose only recorded member is its own
  // archive type then contributes no gradable files (we never saw inside it).
  function innerFiles(s) {
    const fts = Object.assign({}, s.file_types || {});
    if (s.filetype && fts[s.filetype]) {
      fts[s.filetype] -= 1;
      if (fts[s.filetype] <= 0) delete fts[s.filetype];
    }
    return fts;
  }

  // modelFor returns the supported-type set for a scanner: ascan's is data-driven
  // (the types it processed this run), every other engine's is hardcoded above.
  function modelFor(scanner, ascanTypes) {
    if (scanner === "ascan") return { types: new Set(ascanTypes || []) };
    return COVERAGE_MODEL[scanner] || null;
  }

  function computeCoverage(samples, scanner, ascanTypes) {
    const m = modelFor(scanner, ascanTypes);
    if (!m) return null;
    let total = 0, supported = 0;
    const uncovered = new Set();
    for (const s of samples || []) {
      const fts = innerFiles(s);
      const files = Object.values(fts).reduce(function(a, b) { return a + b; }, 0);
      if (!files) continue;
      total += files;
      if (m.any) { supported += files; continue; }
      if (m.ecos && !m.ecos.has(s.ecosystem)) { uncovered.add((s.ecosystem || "unknown") + " (ecosystem)"); continue; }
      for (const t in fts) {
        if (m.types.has(t)) supported += fts[t];
        else uncovered.add(t);
      }
    }
    return { rate: total ? supported / total : 0, supported: supported, total: total, uncovered: Array.from(uncovered).sort() };
  }
  eleventyConfig.addFilter("coverage", computeCoverage);

  // An engine is hidden from the rendered charts by setting "hidden": true on its
  // providers.json entry — for a sporadic entrant whose intermittent points would
  // misread as a real contestant. The data (battle.json, history.json) is kept
  // either way. providers.json is the single list every chart draws from, so an
  // engine can no longer be present in one graph and missing from the next.
  const isHidden = (providers, key) => !!((providers || {})[key] || {}).hidden;

  // Coverage as a sortable board for the bar chart: one row per engine that has a
  // coverage model, highest coverage first. Hidden engines are omitted.
  // `ran` is a leaderboard: pass it and coverage is restricted to the engines
  // that actually competed this run, so no engine can appear in one chart and be
  // missing from the next (a hosted engine can drop out of a run — quota, outage
  // — and its capability row would otherwise linger here alone).
  eleventyConfig.addFilter("coverageBoard", function(samples, providers, ascanTypes, ran) {
    const out = [];
    const competed = Array.isArray(ran) && ran.length
      ? new Set(ran.map(function(s) { return s.scanner; }))
      : null;
    for (const key in (providers || {})) {
      if (isHidden(providers, key)) continue;
      if (competed && !competed.has(key)) continue;
      const cov = computeCoverage(samples, key, ascanTypes);
      if (cov) out.push(Object.assign({ scanner: key, name: (providers[key] || {}).name || key }, cov));
    }
    return out.sort(function(a, b) { return b.rate - a.rate; });
  });

  // coverageGaps: for one engine, the files it couldn't analyze and why — split
  // into whole samples skipped because the ecosystem is unsupported, and file
  // types it can't read inside an otherwise-supported archive. Each is a
  // [name, fileCount] list, biggest gap first. null for engines with no model.
  eleventyConfig.addFilter("coverageGaps", function(samples, scanner, ascanTypes) {
    const m = modelFor(scanner, ascanTypes);
    if (!m) return null;
    const ecoMissed = {}, typeMissed = {};
    for (const s of samples || []) {
      const fts = innerFiles(s);
      const files = Object.values(fts).reduce(function(a, b) { return a + b; }, 0);
      if (!files) continue;
      if (m.any) continue;
      if (m.ecos && !m.ecos.has(s.ecosystem)) {
        const eco = s.ecosystem || "unknown";
        ecoMissed[eco] = (ecoMissed[eco] || 0) + files;
        continue;
      }
      for (const t in fts) {
        if (!m.types.has(t)) typeMissed[t] = (typeMissed[t] || 0) + fts[t];
      }
    }
    const sorted = (o) => Object.entries(o).sort(function(a, b) { return b[1] - a[1]; });
    return { ecoMissed: sorted(ecoMissed), typeMissed: sorted(typeMissed) };
  });

  // ---------------------------------------------------------------------------
  // evidence: the run as a raw sample × engine grid.
  //
  // The bars on /compare/ are aggregates, and an aggregate is exactly what a
  // sceptical reader can't check. This hands back the grid they're computed
  // from — one row per malware sample, one cell per engine, every cell carrying
  // the verdict text the engine actually returned — so the claim can be audited
  // sample by sample instead of taken on trust.
  //
  // A cell's tier is the engine's own word for what happened, and the three
  // ways of not catching something stay separate because they are different
  // failures: `benign` means it read the file and called it clean, `nodata`
  // means it looked the package up and had no record (the day-zero case), and
  // `unsupported` means it never read the bytes at all.
  //
  // Rows sort hardest-first: the fewer engines that flagged a sample, the
  // further up it sits, so the top of the grid is precisely the set the rest of
  // the field missed rather than a flattering hand-picked selection.
  // ---------------------------------------------------------------------------
  eleventyConfig.addFilter("evidence", function(battle, providers, label) {
    const provs = providers || {};
    const cohort = label || "bad";
    // Only engines that actually competed this run get a column — a hosted
    // engine can drop out (quota, outage) and an empty column would read as a
    // total miss rather than an absence.
    const ran = new Set((((battle || {}).detection || {}).leaderboard || []).map(function(s) { return s.scanner; }));
    const engines = Object.entries(provs)
      .filter(function([key, p]) { return !p.hidden && ran.has(key); })
      .sort(function(a, b) { return (a[1].slot || 99) - (b[1].slot || 99); })
      .map(function([key, p]) { return { key: key, name: p.name || key, hosted: !!p.hosted }; });

    const flagged = (t) => t === "hostile" || t === "suspicious";
    // How old the package was when the run scanned it. This is the whole point
    // of the exercise — a verdict on a two-day-old file is a lookup, a verdict
    // on a six-hour-old one isn't — so it travels with the sample.
    const generated = Date.parse((battle && battle.generated_at) || "");
    const rows = [];
    for (const s of (battle && battle.samples) || []) {
      if (s.excluded || s.label !== cohort) continue;
      const cells = engines.map(function(e) {
        const v = (s.verdicts || []).find(function(x) { return x && x.scanner === e.key; });
        return {
          key: e.key,
          name: e.name,
          tier: (v && v.tier) || "nodata",
          detail: (v && v.detail) || "",
        };
      });
      const us = cells.find(function(c) { return c.key === "ascan"; });
      const created = Date.parse(s.created_at || "");
      rows.push({
        sha256: s.sha256,
        ageHours: (generated && created) ? Math.max(0, Math.round((generated - created) / 3600000)) : null,
        // purl when the sample came from a registry, filename otherwise — never
        // `package`, which for feed samples is just the sha256 again.
        name: s.purl || s.filename || s.sha256,
        filename: s.filename,
        ecosystem: s.ecosystem || s.filetype || "file",
        cells: cells,
        caught: cells.filter(function(c) { return flagged(c.tier); }).length,
        usCaught: !!(us && flagged(us.tier)),
        // Engines that never returned a verdict on this sample — couldn't open
        // it, or had no record of it.
        blind: cells.filter(function(c) { return c.tier === "unsupported" || c.tier === "nodata"; }).length,
      });
    }
    rows.sort(function(a, b) { return a.caught - b.caught || String(a.name).localeCompare(String(b.name)); });

    return {
      engines: engines,
      rows: rows,
      total: rows.length,
      // Samples this run that no other engine flagged, and we did — the column
      // of the grid that is the whole argument for running it locally.
      onlyUs: rows.filter(function(r) { return r.usCaught && r.caught === 1; }).length,
      // The same set as a list, ordered for a page that shows one sample in
      // full. Fewest excuses first: a sample every other engine was able to
      // look at and still didn't flag is a stronger case than one they were
      // never built to open, and it can't be waved away as an unfair file.
      // Freshest breaks the tie, because age is the rest of the argument.
      solo: rows.filter(function(r) { return r.usCaught && r.caught === 1; })
        .sort(function(a, b) {
          return a.blind - b.blind ||
            (a.ageHours == null ? 1e9 : a.ageHours) - (b.ageHours == null ? 1e9 : b.ageHours);
        }),
      // Samples nobody flagged at all: published, not buried. A benchmark its
      // own author runs is only worth reading if the losses are on the page too.
      nobody: rows.filter(function(r) { return r.caught === 0; }).length,
    };
  });

  // blindRate: the share of a cohort an engine never returned a verdict on —
  // files it couldn't open plus packages it had no record of. Detection rates
  // are quoted over the whole cohort, so this is the part of the score that is
  // scope rather than skill, and it deserves to be nameable in prose.
  eleventyConfig.addFilter("blindRate", function(board, scanner) {
    const s = (board || []).find(function(x) { return x && x.scanner === scanner; });
    if (!s || !s.supported) return null;
    const blind = (s.unsupported || 0) + (s.nodata || 0);
    return { n: blind, of: s.supported, pct: Math.round((100 * blind) / s.supported) };
  });

  // blindBoard: every engine's blind share of a cohort, worst first — so prose can
  // name the gap ("four engines never opened half the cohort") from the run rather
  // than from a number typed into the copy once and left to rot.
  eleventyConfig.addFilter("blindBoard", function(board, providers) {
    const provs = providers || {};
    return (board || [])
      .filter(function(s) { return s && s.supported; })
      .map(function(s) {
        const blind = (s.unsupported || 0) + (s.nodata || 0);
        return {
          scanner: s.scanner,
          name: (provs[s.scanner] || {}).name || s.scanner,
          n: blind,
          of: s.supported,
          pct: Math.round((100 * blind) / s.supported),
          unsupported: s.unsupported || 0,
          nodata: s.nodata || 0,
        };
      })
      .sort(function(a, b) { return b.pct - a.pct; });
  });

  // ---------------------------------------------------------------------------
  // classBoard: the field grouped the way a buyer groups it — services you rent
  // vs open-source scanners you run vs us — with each group's measured range.
  //
  // A three-column decision table needs one honest cell per group, and a range
  // is the honest cell: quoting the weakest rented service as "what SaaS
  // scores" would be a strawman, and quoting the strongest would understate the
  // spread a reader will see in the bars two sections down. The membership test
  // is providers.json's own `hosted` flag, so nothing is sorted by hand.
  // ---------------------------------------------------------------------------
  eleventyConfig.addFilter("classBoard", function(board, providers) {
    const provs = providers || {};
    const stat = (s) => {
      const rate = flaggedRate(s);
      const blind = (s.unsupported || 0) + (s.nodata || 0);
      return {
        key: s.scanner,
        name: (provs[s.scanner] || {}).name || s.scanner,
        rate: rate === null ? null : Math.round(rate),
        blind: blind,
        unsupported: s.unsupported || 0,
        of: s.supported || 0,
      };
    };
    const group = (rows) => {
      const rates = rows.map(function(r) { return r.rate; }).filter(function(v) { return v !== null; });
      const unsup = rows.map(function(r) { return r.unsupported; });
      const blind = rows.map(function(r) { return r.blind; });
      return {
        blindLo: blind.length ? Math.min.apply(null, blind) : null,
        blindHi: blind.length ? Math.max.apply(null, blind) : null,
        rows: rows.sort(function(a, b) { return (b.rate || 0) - (a.rate || 0); }),
        names: rows.map(function(r) { return r.name; }),
        lo: rates.length ? Math.min.apply(null, rates) : null,
        hi: rates.length ? Math.max.apply(null, rates) : null,
        unsupLo: unsup.length ? Math.min.apply(null, unsup) : null,
        unsupHi: unsup.length ? Math.max.apply(null, unsup) : null,
        of: rows.length ? rows[0].of : 0,
      };
    };
    const all = (board || []).filter(function(s) { return s && !((provs[s.scanner] || {}).hidden); }).map(stat);
    return {
      rented: group(all.filter(function(r) { return (provs[r.key] || {}).hosted && r.key !== "ascan"; })),
      oss: group(all.filter(function(r) { return !(provs[r.key] || {}).hosted && r.key !== "ascan"; })),
      us: all.find(function(r) { return r.key === "ascan"; }) || null,
    };
  });

  // errorLines: one "package — detail" line per scanner error within a cohort
  // (label bad/good, excluded samples omitted) — the errored bar segment's
  // mouseover on the /compare/ benchmark charts. Samples that share a package
  // and a reason collapse to "name ×N": an engine timing out on seven versions
  // of one module is one failure to read, and the tooltip has to stay readable.
  const ERROR_TIP_MAX = 10;
  const SHA_NAME = /^[0-9a-f]{64}$/;
  eleventyConfig.addFilter("errorLines", function(samples, scanner, label) {
    const groups = new Map();
    for (const s of samples || []) {
      if (s.excluded || s.label !== label) continue;
      for (const v of s.verdicts || []) {
        if (!v || v.scanner !== scanner || v.status !== "error") continue;
        // A sha-named package is a loose file that never came from a registry;
        // its filename is the part a reader recognises.
        const name = s.package && !SHA_NAME.test(s.package)
          ? s.package
          : (s.filename || (s.sha256 || "").slice(0, 12));
        const detail = v.detail || "error";
        const g = groups.get(name + " " + detail);
        if (g) g.n += 1;
        else groups.set(name + " " + detail, { name, version: s.version, detail, n: 1 });
      }
    }
    const lines = [...groups.values()].map(function(g) {
      const head = g.n > 1 ? g.name + " ×" + g.n
        : (g.version ? g.name + "@" + g.version : g.name);
      return head + " — " + g.detail;
    });
    if (lines.length > ERROR_TIP_MAX) {
      const rest = lines.length - ERROR_TIP_MAX;
      return lines.slice(0, ERROR_TIP_MAX).concat("…and " + rest + " more");
    }
    return lines;
  });

  // Pull the first <img> src out of rendered post content, for listing thumbnails.
  eleventyConfig.addFilter("firstImage", function(content) {
    if (!content) return "";
    const m = content.match(/<img\b[^>]*\bsrc="([^"]+)"/i);
    return m ? m[1] : "";
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts"
    }
  };
};
