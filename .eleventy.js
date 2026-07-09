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
      if (m.ecos && !m.ecos.has(s.ecosystem)) { uncovered.add(s.ecosystem + " (ecosystem)"); continue; }
      for (const t in fts) {
        if (m.types.has(t)) supported += fts[t];
        else uncovered.add(t);
      }
    }
    return { rate: total ? supported / total : 0, supported: supported, total: total, uncovered: Array.from(uncovered).sort() };
  }
  eleventyConfig.addFilter("coverage", computeCoverage);

  // Engines retained in the data (battle.json, history.json) but hidden from the
  // rendered graphs — sporadic entrants whose intermittent points would misread as
  // real contestants. Data is kept; only the charts filter it. Mirror this set in
  // the trend-chart script in compare/index.njk.
  const HIDDEN_ENGINES = new Set([]);

  // Coverage as a sortable board for the bar chart: one row per engine that has a
  // coverage model, highest coverage first. Hidden engines are omitted.
  eleventyConfig.addFilter("coverageBoard", function(samples, providers, ascanTypes) {
    const out = [];
    for (const key in (providers || {})) {
      if (HIDDEN_ENGINES.has(key)) continue;
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
      if (m.ecos && !m.ecos.has(s.ecosystem)) {
        ecoMissed[s.ecosystem] = (ecoMissed[s.ecosystem] || 0) + files;
        continue;
      }
      for (const t in fts) {
        if (!m.types.has(t)) typeMissed[t] = (typeMissed[t] || 0) + fts[t];
      }
    }
    const sorted = (o) => Object.entries(o).sort(function(a, b) { return b[1] - a[1]; });
    return { ecoMissed: sorted(ecoMissed), typeMissed: sorted(typeMissed) };
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
