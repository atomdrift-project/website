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
  // quadrant: the catch-rate / false-alarm trade-off plot.
  //
  // Everything the SVG needs is computed here — axes, quadrant dividers, marker
  // positions and, the hard part, label placement. Labels are laid out against
  // real bounding boxes: engines that scored identically collapse into one
  // marker with a stacked label, and every remaining box is placed by trying
  // candidate sides and nudging until it clears the markers and the boxes
  // already placed. Doing this in the template is what produced the pile-up of
  // overlapping text and labels stranded from their circles.
  //
  // The y axis is *inverted* — 0% false alarms at the top — so that up and to
  // the right is unambiguously better and the four quadrants read the way a
  // reader expects: Precise top-right, Trailing bottom-left.
  // ---------------------------------------------------------------------------
  const QW = 960, QH = 500;            // viewBox
  const QPL = 66, QPR = 830, QPT = 54, QPB = 404; // plot rect (right gutter holds labels)
  const NAME_PX = 7.4, VAL_PX = 5.9, SWATCH = 15, LINE_H = 15;
  const XDIV = 50;                     // catch-rate divider (%)
  const YDIV = 5;                      // false-alarm divider (%)

  function overlaps(a, b, pad) {
    const p = pad || 0;
    return !(a.x + a.w + p <= b.x || b.x + b.w + p <= a.x || a.y + a.h + p <= b.y || b.y + b.h + p <= a.y);
  }
  function overlapArea(a, b) {
    const dx = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const dy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return dx > 0 && dy > 0 ? dx * dy : 0;
  }

  eleventyConfig.addFilter("quadrant", function(battle, providers) {
    const provs = providers || {};
    const det = (battle && battle.detection && battle.detection.leaderboard) || [];
    const fp = (battle && battle.false_positive && battle.false_positive.leaderboard) || [];
    const fpBy = {};
    for (const s of fp) fpBy[s.scanner] = s;

    // One point per engine that has both measures this run.
    const pts = [];
    for (const d of det) {
      if (isHidden(provs, d.scanner)) continue;
      const dr = flaggedRate(d), fr = flaggedRate(fpBy[d.scanner]);
      if (dr === null || fr === null) continue;
      const p = provs[d.scanner] || {};
      pts.push({
        key: d.scanner, name: p.name || d.scanner, color: p.color || "#6b7280",
        det: Math.round(dr), fp: Math.round(fr), us: d.scanner === "ascan",
      });
    }
    if (pts.length < 2) return null;

    // y scale: enough headroom above the worst false-alarm rate to keep the
    // divider on screen, so a run where nobody cries wolf still reads as a
    // quadrant instead of a single line of dots pinned to the top edge.
    const maxFp = Math.max(...pts.map((p) => p.fp));
    let yMax = Math.max(10, Math.ceil((maxFp * 1.35) / 5) * 5);
    const yStep = yMax > 60 ? 20 : (yMax > 20 ? 10 : 5);
    // The data band is inset from the plot frame: a run where every engine holds
    // its fire puts the whole field on the 0% line, and without headroom those
    // markers would straddle the frame edge. The band above 0% also gives the
    // top quadrant captions somewhere to sit that data never reaches.
    const dataTop = QPT + 34, dataBottom = QPB - 16;
    const dataLeft = QPL + 14, dataRight = QPR - 14;
    const xOf = (v) => dataLeft + (v / 100) * (dataRight - dataLeft);
    const yOf = (v) => dataTop + (v / yMax) * (dataBottom - dataTop); // inverted: 0% at the top

    // Engines that scored identically share a marker — four dots stacked on one
    // pixel with four labels fighting over it is the overlap the reader sees.
    const groups = [];
    const byPos = {};
    for (const p of pts) {
      const k = p.det + "|" + p.fp;
      if (!byPos[k]) {
        byPos[k] = { det: p.det, fp: p.fp, x: xOf(p.det), y: yOf(p.fp), engines: [], us: false };
        groups.push(byPos[k]);
      }
      byPos[k].engines.push(p);
      if (p.us) byPos[k].us = true;
    }

    // Label box for a group: one line per engine (swatch + name), then the
    // shared value line. Sizes are estimated from character counts — close
    // enough for collision purposes at these font sizes.
    for (const g of groups) {
      g.n = g.engines.length;
      g.r = g.n > 1 ? 11 : (g.us ? 9 : 6.5);
      // A shared marker is drawn neutral with its count inside — painting it one
      // member's hue would credit that engine with the position alone.
      g.color = g.n > 1 ? "#6b7280" : g.engines[0].color;
      g.value = g.det + "% caught · " + g.fp + "% false";
      const nameW = Math.max(...g.engines.map((e) => e.name.length * NAME_PX)) + SWATCH;
      g.w = Math.max(nameW, g.value.length * VAL_PX);
      g.h = (g.engines.length + 1) * LINE_H;
    }

    const markerBoxes = groups.map((g) => ({ x: g.x - g.r - 3, y: g.y - g.r - 3, w: 2 * g.r + 6, h: 2 * g.r + 6 }));
    // The four quadrant captions are drawn in the corners; seed them as
    // obstacles so a data label never lands on top of one.
    const CW = 140, CH = 22;
    const placed = [
      { x: QPL + 8, y: QPT + 4, w: CW, h: CH },             // conservative
      { x: QPR - 8 - CW, y: QPT + 4, w: CW, h: CH },        // precise
      { x: QPL + 8, y: QPB - 4 - CH, w: CW, h: CH },        // trailing
      { x: QPR - 8 - CW, y: QPB - 4 - CH, w: CW, h: CH },   // aggressive
    ];
    const GAP = 13;   // marker-to-label clearance
    const BOUND = { x: 6, y: 6, w: QW - 12, h: QH - 12 };

    // Candidate sides, preferred order per point: away from the nearer edge
    // first, so labels lean into open space instead of off the plot.
    function candidates(g) {
      const right = { x: g.x + GAP, y: g.y - g.h / 2, anchor: "start" };
      const left = { x: g.x - GAP - g.w, y: g.y - g.h / 2, anchor: "end" };
      const below = { x: g.x - g.w / 2, y: g.y + GAP, anchor: "middle" };
      const above = { x: g.x - g.w / 2, y: g.y - GAP - g.h, anchor: "middle" };
      const horizFirst = g.x > (QPL + QPR) / 2 ? [left, right] : [right, left];
      const vertFirst = g.y < dataTop + 50 ? [below, above] : [above, below];
      return horizFirst.concat(vertFirst);
    }

    // Cost of a placement: how much it collides with markers and already-placed
    // labels, plus a penalty for leaving the frame.
    function cost(box) {
      let c = 0;
      for (const m of markerBoxes) c += overlapArea(box, m) * 3;
      for (const p of placed) c += overlapArea(box, p);
      const outX = Math.max(0, BOUND.x - box.x) + Math.max(0, (box.x + box.w) - (BOUND.x + BOUND.w));
      const outY = Math.max(0, BOUND.y - box.y) + Math.max(0, (box.y + box.h) - (BOUND.y + BOUND.h));
      return c + (outX + outY) * 400;
    }

    // Subject first, then the crowded groups, then by catch rate — the labels
    // that matter most get the clean positions.
    const order = groups.slice().sort((a, b) =>
      (b.us - a.us) || (b.engines.length - a.engines.length) || (b.det - a.det));
    for (const g of order) {
      let best = null;
      for (const c of candidates(g)) {
        for (const dy of [0, 14, -14, 28, -28, 44, -44, 62, -62]) {
          const box = { x: c.x, y: c.y + dy, w: g.w, h: g.h, anchor: c.anchor };
          const sc = cost(box) + Math.abs(dy) * 2;
          if (!best || sc < best.sc) best = { box: box, sc: sc };
          if (sc === 0) break;
        }
        if (best && best.sc === 0) break;
      }
      const box = best.box;
      g.label = {
        x: box.x, y: box.y, w: g.w, h: g.h, anchor: box.anchor,
        // Text x per anchor: names run left-to-right from the swatch on a
        // start-anchored box, right-to-left into it on an end-anchored one.
        tx: box.anchor === "end" ? box.x + g.w : (box.anchor === "middle" ? box.x + g.w / 2 : box.x),
      };
      // A leader line whenever the box ended up away from its marker, so no
      // label is ever stranded from the circle it names.
      const cx = box.x + g.w / 2, cy = box.y + g.h / 2;
      const dist = Math.hypot(cx - g.x, cy - g.y);
      if (dist > g.r + GAP + 12) {
        const ex = Math.max(box.x, Math.min(g.x, box.x + g.w));
        const ey = Math.max(box.y, Math.min(g.y, box.y + g.h));
        const a = Math.atan2(ey - g.y, ex - g.x);
        g.leader = { x1: g.x + Math.cos(a) * (g.r + 2), y1: g.y + Math.sin(a) * (g.r + 2), x2: ex, y2: ey };
      }
      placed.push(box);
    }

    return {
      w: QW, h: QH, pl: QPL, pr: QPR, pt: QPT, pb: QPB,
      yMax: yMax,
      xTicks: [0, 25, 50, 75, 100].map((v) => ({ v: v, x: xOf(v) })),
      yTicks: (function() {
        const out = [];
        for (let v = 0; v <= yMax; v += yStep) out.push({ v: v, y: yOf(v) });
        return out;
      })(),
      xDiv: xOf(XDIV), yDiv: yOf(YDIV), xDivVal: XDIV, yDivVal: YDIV,
      groups: groups,
      lineH: LINE_H, swatch: SWATCH,
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
