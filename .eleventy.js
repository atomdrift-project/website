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
  eleventyConfig.addPassthroughCopy("src/_redirects");

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

  // Sort a leaderboard by its displayed flagged rate ((hostile+suspicious) /
  // supported), highest first — so every bar chart reads top-to-bottom, biggest
  // bar first. Engines that scanned nothing (supported 0) sort to the bottom.
  eleventyConfig.addFilter("byFlagged", function(board) {
    if (!Array.isArray(board)) return [];
    const rate = (s) => (s && s.supported) ? (s.hostile + s.suspicious) / s.supported : -1;
    return board.slice().sort((a, b) => rate(b) - rate(a));
  });

  // Turn the providers map into a list (each entry tagged with its key), sorted
  // by registry coverage, most first — the order of the /compare/ feature table.
  eleventyConfig.addFilter("byRegistries", function(providers) {
    if (!providers) return [];
    return Object.entries(providers)
      .map(function([key, p]) { return Object.assign({ key: key }, p); })
      .sort(function(a, b) { return (b.registries || []).length - (a.registries || []).length; });
  });

  // Flagged rate ((hostile+suspicious)/supported) as a 0..100 percentage, or null
  // when the engine scanned nothing — the single rate both the bars and these
  // synthesis views are built from, so nothing downstream can disagree with the chart.
  const flaggedRate = (s) => (s && s.supported) ? (s.hostile + s.suspicious) / s.supported * 100 : null;

  // headline distills a run to the one line a skim-reader needs: how the subject
  // (ascan) did on detection, how far it leads the best *other* engine, and its
  // false-positive rate. Computed from the same leaderboards the bars use, so the
  // banner can never drift from the chart below it. Null if ascan didn't scan.
  eleventyConfig.addFilter("headline", function(battle) {
    const det = (battle && battle.detection && battle.detection.leaderboard) || [];
    const fp = (battle && battle.false_positive && battle.false_positive.leaderboard) || [];
    const us = det.find((s) => s.scanner === "ascan");
    const usDet = flaggedRate(us);
    if (usDet === null) return null;
    let best = null; // best competing detection rate — the bar we're beating
    for (const s of det) {
      if (s.scanner === "ascan") continue;
      const r = flaggedRate(s);
      if (r === null) continue;
      if (!best || r > best.det) best = { name: s.scanner, det: r };
    }
    const usFp = flaggedRate(fp.find((s) => s.scanner === "ascan"));
    return {
      detRate: Math.round(usDet),
      fpRate: usFp === null ? null : Math.round(usFp),
      bestName: best ? best.name : null,
      bestDet: best ? Math.round(best.det) : null,
      lead: best && best.det > 0 ? usDet / best.det : null, // multiple, e.g. 2.2
      leadPts: best ? Math.round(usDet - best.det) : null,   // percentage-point gap
      sampleCount: (battle.detection && battle.detection.sample_count) || 0,
    };
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

  // --- Atomdrift's operating curve -------------------------------------------
  //
  // `-l N` is a false-positive budget: N flagged benign files per 100 million,
  // calibrated per file type. battle.json publishes `ascan_curve` at nine grid
  // stops, but each sample's verdict detail records the level it was actually
  // assigned ("level 25 (p=0.83)"), and the tier rule is atomscan's own —
  // hostile at lvl <= N, suspicious out to min(gridMax, 4N). Replaying that over
  // every budget rather than the nine we happen to publish is what lets the
  // figure claim a curve instead of a scatter of grid stops.
  //
  // We do not trust that replay blindly: it is checked against every published
  // stop first, and a single disagreement falls back to the grid. A wrong curve
  // drawn confidently is worse than a coarse one.
  const DIAL_DEFAULT = 25;   // atomscan's shipped default
  const DIAL_MAX = 2500;     // the top of the range this page quotes, dial included
  const GRID_MAX = 25000;    // atomscan's own ceiling — a property of the engine

  function ascanLevels(battle) {
    const out = { bad: [], good: [] };
    for (const s of (battle && battle.samples) || []) {
      for (const v of s.verdicts || []) {
        if (v.scanner !== "ascan") continue;
        const m = /^level (-?\d+)/.exec(v.detail || "");
        if (m && out[s.label]) out[s.label].push(Number(m[1]));
      }
    }
    return out;
  }

  function tally(lvls, n) {
    const cap = Math.min(GRID_MAX, 4 * n);
    let hostile = 0, suspicious = 0;
    for (const l of lvls) {
      if (l < 0) continue;
      if (l <= n) hostile++;
      else if (l <= cap) suspicious++;
    }
    return { hostile: hostile, suspicious: suspicious };
  }

  // The precise curve, or null when the levels can't reproduce what we published.
  function preciseCurve(battle) {
    const raw = (battle && battle.ascan_curve) || [];
    if (raw.length < 2) return null;
    const lv = ascanLevels(battle);
    if (!lv.bad.length || !lv.good.length) return null;
    const nBad = raw[0].cohort_n, nGood = raw[0].fp_cohort_n;
    if (!nBad || !nGood) return null;
    for (const p of raw) {                       // the check that earns the sweep
      const b = tally(lv.bad, p.level), g = tally(lv.good, p.level);
      if (b.hostile !== p.hostile || b.suspicious !== p.suspicious ||
          g.hostile !== p.fp_hostile || g.suspicious !== p.fp_suspicious) return null;
    }
    const out = [];
    for (let n = 0; n <= DIAL_MAX; n++) {
      const b = tally(lv.bad, n), g = tally(lv.good, n);
      const caught = b.hostile + b.suspicious, flagged = g.hostile + g.suspicious;
      const det = Math.round((100 * caught) / nBad), fp = Math.round((100 * flagged) / nGood);
      const prev = out[out.length - 1];
      if (prev && prev.det === det && prev.fp === fp) { prev.lHi = n; continue; }
      out.push({ det: det, fp: fp, caught: caught, flagged: flagged, lLo: n, lHi: n });
    }
    return out.length >= 2 ? out : null;
  }

  // Fallback: the published grid stops, collapsed the same way.
  function gridCurve(battle) {
    const raw = (battle && battle.ascan_curve) || [];
    if (raw.length < 2) return null;
    const out = [];
    for (const p of raw) {
      if (p.level > DIAL_MAX) continue;
      const det = Math.round((100 * p.caught) / p.cohort_n);
      const fp = Math.round((100 * p.fp_flagged) / p.fp_cohort_n);
      const prev = out[out.length - 1];
      if (prev && prev.det === det && prev.fp === fp) { prev.lHi = p.level; continue; }
      out.push({ det: det, fp: fp, caught: p.caught, flagged: p.fp_flagged,
                 lLo: p.level, lHi: p.level });
    }
    return out.length >= 2 ? out : null;
  }

  function ascanCurve(battle) {
    return preciseCurve(battle) || gridCurve(battle);
  }
  eleventyConfig.addFilter("ascanCurve", function(battle) {
    // The hero slider walks the published grid, capped at the same ceiling the
    // chart quotes so the two can never advertise different maximums. The grid's
    // own stops jump 1000 -> 3000, straddling the cap, so the ceiling is appended
    // as a stop of its own — otherwise the slider would end at -l 1000 while the
    // figure beside it claims a range up to -l 2500.
    const raw = (battle && battle.ascan_curve) || [];
    if (!raw.length) return null;
    const nBad = raw[0].cohort_n, nGood = raw[0].fp_cohort_n;
    const out = raw.filter((p) => p.level <= DIAL_MAX).map((p) => ({
      l: p.level,
      det: nBad ? Math.round((100 * p.caught) / nBad) : 0,
      fp: nGood ? Math.round((100 * p.fp_flagged) / nGood) : 0,
      caught: p.caught, flagged: p.fp_flagged,
    }));
    if (!out.length) return null;
    if (out[out.length - 1].l < DIAL_MAX) {
      // Measured at the cap where the per-sample levels allow it; otherwise the
      // last grid stop below the cap still describes it, since nothing on the
      // grid changes in between.
      const lv = ascanLevels(battle);
      const last = out[out.length - 1];
      let stop = { l: DIAL_MAX, det: last.det, fp: last.fp, caught: last.caught, flagged: last.flagged };
      if (lv.bad.length && lv.good.length && nBad && nGood) {
        const b = tally(lv.bad, DIAL_MAX), g = tally(lv.good, DIAL_MAX);
        const caught = b.hostile + b.suspicious, flagged = g.hostile + g.suspicious;
        stop = {
          l: DIAL_MAX, caught: caught, flagged: flagged,
          det: Math.round((100 * caught) / nBad), fp: Math.round((100 * flagged) / nGood),
        };
      }
      out.push(stop);
    }
    if (out.length < 2) return null;
    return out.some((c) => c.det !== out[0].det || c.fp !== out[0].fp) ? out : null;
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
  eleventyConfig.addGlobalData("dialMax", () => DIAL_MAX);
  eleventyConfig.addGlobalData("dialMaxLabel", () => DIAL_MAX.toLocaleString("en-US"));

  // Fritsch-Carlson monotone cubic: smooth, and it cannot overshoot into values
  // the measurement never produced — no dipping below zero false positives on the
  // way between two stops that both measured zero.
  function monotoneSlopes(xs, ys) {
    const n = xs.length, h = [], d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) { h.push(xs[i + 1] - xs[i]); d.push((ys[i + 1] - ys[i]) / h[i]); }
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) {
      if (d[i - 1] * d[i] <= 0) { m[i] = 0; continue; }
      const w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
    return m;
  }

  function curvePath(verts, xOf, yOf) {
    const xs = verts.map((v) => v.det), ys = verts.map((v) => v.fp);
    const m = monotoneSlopes(xs, ys);
    const at = (x, y) => xOf(x).toFixed(1) + "," + yOf(y).toFixed(1);
    const parts = ["M " + at(xs[0], ys[0])];
    for (let i = 0; i < xs.length - 1; i++) {
      const h = xs[i + 1] - xs[i];
      parts.push("C " + at(xs[i] + h / 3, ys[i] + (m[i] * h) / 3) + " " +
                 at(xs[i + 1] - h / 3, ys[i + 1] - (m[i + 1] * h) / 3) + " " +
                 at(xs[i + 1], ys[i + 1]));
    }
    return parts.join(" ");
  }

  eleventyConfig.addFilter("quadrant", function(battle, providers) {
    const provs = providers || {};
    const det = (battle && battle.detection && battle.detection.leaderboard) || [];
    const fp = (battle && battle.false_positive && battle.false_positive.leaderboard) || [];
    const fpBy = {};
    for (const s of fp) fpBy[s.scanner] = s;

    const curve = ascanCurve(battle);

    // One point per engine that has both measures. Atomdrift is a curve, not a
    // dot, whenever the curve is recoverable.
    const pts = [];
    for (const d of det) {
      if (isHidden(provs, d.scanner)) continue;
      if (curve && d.scanner === "ascan") continue;
      const dr = flaggedRate(d), f = fpBy[d.scanner], fr = flaggedRate(f);
      if (dr === null || fr === null) continue;
      const p = provs[d.scanner] || {};
      pts.push({
        key: d.scanner, name: p.name || d.scanner, color: p.color || "#6b7280",
        det: Math.round(dr), fp: Math.round(fr),
        flagged: f.hostile + f.suspicious, nGood: f.supported,
        caught: d.hostile + d.suspicious, nBad: d.supported,
      });
    }
    if (pts.length < 2) return null;

    const xOf = (v) => QPL + 18 + (v / 100) * (QPR - QPL - 40);
    const yOf = (v) => QZERO + (Math.min(v, YMAX) / YMAX) * (QMB - QZERO);

    // Anything past the crop keeps its true value in a labelled strip rather than
    // being clipped to the frame edge, which would understate it.
    const offscale = pts.filter((p) => p.fp > YMAX).sort((a, b) => b.fp - a.fp);
    const inScale = pts.filter((p) => p.fp <= YMAX);

    // --- label boxes ---------------------------------------------------------
    // Width is estimated from character count; close enough for collisions at
    // these sizes, and it costs no layout pass.
    const NAME_PX = 6.2, FP_PX = 5.3, US_PX = 7.3;
    function box(head, sub, us) {
      const cw = us ? US_PX : NAME_PX;
      return {
        head: head, sub: sub, us: us,
        w: Math.max(head.length * cw, sub ? sub.length * FP_PX : 0),
        h: sub ? 2 * LINE_H : LINE_H,
      };
    }
    const fpText = (n) => (n ? n + " false positive" + (n === 1 ? "" : "s") : null);

    const marks = [];
    for (const p of inScale) {
      marks.push(Object.assign({
        x: xOf(p.det), y: yOf(p.fp), r: 5, kind: "engine",
      }, box(p.name + "  " + p.det + "%", fpText(p.flagged), false), { engine: p }));
    }

    // --- the curve and the three stops worth naming --------------------------
    let curveGeo = null;
    if (curve) {
      const verts = curve;
      const first = verts[0], last = verts[verts.length - 1];
      let dflt = null;
      for (const v of verts) if (v.lLo <= DIAL_DEFAULT && DIAL_DEFAULT <= v.lHi) dflt = v;
      const named = [];
      const nameOf = (v) => v === last ? "Atomdrift@L" + DIAL_MAX.toLocaleString("en-US")
        : (v === dflt ? "Atomdrift@L" + DIAL_DEFAULT + " (default)"
        : "Atomdrift@L" + v.lLo.toLocaleString("en-US"));
      for (const v of [first, dflt, last]) {
        if (v && named.indexOf(v) === -1) named.push(v);
      }
      for (const v of named) {
        marks.push(Object.assign({
          x: xOf(v.det), y: yOf(v.fp), r: 5.5, kind: "stop",
        }, box(nameOf(v) + "  " + v.det + "%", fpText(v.flagged), true), { stop: v }));
      }
      curveGeo = {
        path: curvePath(verts, xOf, yOf),
        color: (provs.ascan && provs.ascan.color) || "#2a78d6",
        x1: xOf(first.det), x2: xOf(last.det),
        verts: verts, named: named,
      };
    }

    // --- placement -----------------------------------------------------------
    // Candidate sides per mark, preferring open space, then nudged until the box
    // clears the markers, the quadrant caption and everything already placed.
    const markerBoxes = marks.map((m) => ({ x: m.x - m.r - 4, y: m.y - m.r - 4, w: 2 * m.r + 8, h: 2 * m.r + 8 }));
    const capW = 250, capH = 20;
    const placed = [{ x: QPR - 10 - capW, y: yOf(YDIV) - 10 - capH, w: capW, h: capH }];
    const GAP = 14;
    const BOUND = { x: 8, y: QPT - 2, w: QW - 16, h: QPB - QPT + 4 };

    function candidates(m) {
      const right = { x: m.x + GAP, y: m.y - m.h / 2, anchor: "start" };
      const left = { x: m.x - GAP - m.w, y: m.y - m.h / 2, anchor: "end" };
      const below = { x: m.x - m.w / 2, y: m.y + GAP, anchor: "middle" };
      const above = { x: m.x - m.w / 2, y: m.y - GAP - m.h, anchor: "middle" };
      const vert = m.y < QZERO + 40 ? [above, below] : [below, above];
      const horiz = m.x > (QPL + QPR) / 2 ? [left, right] : [right, left];
      return vert.concat(horiz);
    }
    function cost(b) {
      let c = 0;
      for (const k of markerBoxes) c += overlapArea(b, k) * 3;
      for (const p of placed) c += overlapArea(b, p);
      const outX = Math.max(0, BOUND.x - b.x) + Math.max(0, b.x + b.w - (BOUND.x + BOUND.w));
      const outY = Math.max(0, BOUND.y - b.y) + Math.max(0, b.y + b.h - (BOUND.y + BOUND.h));
      return c + (outX + outY) * 400;
    }

    // Atomdrift's stops get the clean positions, then the rest by catch rate.
    const order = marks.slice().sort((a, b) =>
      (b.kind === "stop") - (a.kind === "stop") || b.x - a.x);
    for (const m of order) {
      let best = null;
      for (const c of candidates(m)) {
        for (const dy of [0, 14, -14, 28, -28, 44, -44]) {
          const b = { x: c.x, y: c.y + dy, w: m.w, h: m.h, anchor: c.anchor };
          const sc = cost(b) + Math.abs(dy) * 2;
          if (!best || sc < best.sc) best = { b: b, sc: sc };
          if (sc === 0) break;
        }
        if (best && best.sc === 0) break;
      }
      const b = best.b;
      m.label = {
        anchor: b.anchor,
        tx: b.anchor === "end" ? b.x + m.w : (b.anchor === "middle" ? b.x + m.w / 2 : b.x),
        y1: b.y + 11,
        y2: b.y + 11 + LINE_H,
      };
      // Every mark gets a leader: which ring a label names should never be
      // something the reader works out from proximity, least of all on the 0% row
      // where the curve runs horizontally through a crowd.
      const ex = Math.max(b.x, Math.min(m.x, b.x + m.w));
      const ey = Math.max(b.y, Math.min(m.y, b.y + m.h));
      const a = Math.atan2(ey - m.y, ex - m.x);
      const sx = m.x + Math.cos(a) * (m.r + 3), sy = m.y + Math.sin(a) * (m.r + 3);
      if (Math.hypot(ex - sx, ey - sy) > 3) m.leader = { x1: sx, y1: sy, x2: ex, y2: ey };
      placed.push(b);
    }

    // --- the headline, generated from the run so it cannot drift -------------
    //
    // Stated as a claim, so it has to survive the chart under it: on a run where
    // a rival out-detects us, or where the default costs a false positive, the
    // wording steps down rather than overclaiming.
    const nBad = (battle.detection && battle.detection.sample_count) || 0;
    const nGood = (battle.false_positive && battle.false_positive.sample_count) || 0;
    let head = null;
    if (curve) {
      const dflt = curveGeo.named.filter((v) => v.lLo <= DIAL_DEFAULT && DIAL_DEFAULT <= v.lHi)[0]
        || curveGeo.named[0];
      const rivals = inScale.concat(offscale);
      const best = rivals.slice().sort((a, b) => b.det - a.det)[0];
      const beatsAll = rivals.every((p) => dflt.det >= p.det);
      head = {
        title: beatsAll && dflt.flagged === 0
          ? "Highest detection rate, and nothing flagged that shouldn't be."
          : (beatsAll ? "Highest detection rate on this run."
          : "Where Atomdrift's dial sits against the field."),
        sub: dflt.det + "% of " + nBad + " zero-day supply-chain samples caught, " +
          dflt.flagged + " of " + nGood + " known-safe packages flagged." +
          (best ? "  Next best: " + best.name + ", " + best.det + "% with " +
            best.flagged + " false positive" + (best.flagged === 1 ? "" : "s") + "." : ""),
      };
    }

    return {
      w: QW, h: QH, pl: QPL, pr: QPR, pt: QPT, pb: QPB, mb: QMB, zero: QZERO,
      yMax: YMAX,
      xTicks: [0, 25, 50, 75, 100].map((v) => ({ v: v, x: xOf(v) })),
      yTicks: [0, 2, 4, 6, 8, 10].map((v) => ({ v: v, y: yOf(v) })),
      xDiv: xOf(XDIV), yDiv: yOf(YDIV), xDivVal: XDIV, yDivVal: YDIV,
      marks: marks,
      curve: curveGeo,
      head: head,
      offscale: offscale.map((p, i) => ({
        engine: p, x: xOf(p.det), y: QMB + 30 + i * 26,
        fpText: fpText(p.flagged),
      })),
      breakY: QMB + 10,
      lineH: LINE_H,
      nBad: nBad, nGood: nGood,
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
  // mouseover on the /compare/ benchmark charts.
  eleventyConfig.addFilter("errorLines", function(samples, scanner, label) {
    const out = [];
    for (const s of samples || []) {
      if (s.excluded || s.label !== label) continue;
      for (const v of s.verdicts || []) {
        if (v && v.scanner === scanner && v.status === "error") {
          out.push((s.purl || s.filename) + " — " + (v.detail || "error"));
        }
      }
    }
    return out;
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
