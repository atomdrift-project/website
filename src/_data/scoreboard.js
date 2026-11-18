const battle = require("./battle.json");
const providers = require("./providers.json");

module.exports = function () {
  const labels = Object.fromEntries(Object.entries(providers)
    .filter(([, provider]) => !provider.hidden)
    .map(([key, provider]) => [key, provider.name]));
  const total = (rows) => rows[0]?.supported || 0;
  function cohort(detection, falsePositives, bad, good) {
    const knownGood = new Map(falsePositives.map((row) => [row.scanner, row]));
    const rows = detection.filter((row) => Object.hasOwn(labels, row.scanner))
      .map((row) => {
        const fp = knownGood.get(row.scanner);
        const judged = fp ? fp.hostile + fp.suspicious + fp.benign : 0;
        return {
          key: row.scanner,
          name: labels[row.scanner],
          hostile: 100 * row.hostile / bad,
          suspicious: 100 * row.suspicious / bad,
          errors: 100 * (row.errored || 0) / bad,
          breakdown: [[row.hostile, "hostile"], [row.suspicious, "suspicious"], [row.unsupported, "out of scope"],
            [row.nodata, "no record"], [row.errored, "errors"]].filter(([n]) => n).map(([n, label]) => n + " " + label).join(" · "),
          falsePositive: judged ? 100 * fp.hostile / good : null,
          judged,
        };
      }).sort((a, b) => (b.hostile + b.suspicious) - (a.hostile + a.suspicious)
        || b.hostile - a.hostile || a.name.localeCompare(b.name));
    return { bad, good, rows };
  }
  const detection = battle.detection;
  const falsePositives = battle.false_positive;
  const all = cohort(detection.leaderboard, falsePositives.leaderboard, detection.sample_count, falsePositives.sample_count);
  const ecosystems = Object.entries(detection.by_ecosystem || {}).map(([name, rows]) => {
    const good = falsePositives.by_ecosystem?.[name] || [];
    return { name, ...cohort(rows, good, total(rows), total(good)) };
  }).sort((a, b) => b.bad - a.bad || a.name.localeCompare(b.name));

  const end = Date.parse(battle.window?.to || battle.generated_at);
  const days = battle.window?.days || 0;
  const start = days ? end - days * 24 * 60 * 60 * 1000 : end;
  const byRun = new Map();
  for (const sample of battle.samples || []) {
    if (sample.label !== "bad") continue;
    const when = Date.parse(sample.scanned_at || battle.generated_at);
    if (!Number.isFinite(when) || when < start || when > end) continue;
    if (!byRun.has(when)) byRun.set(when, { at: when, n: 0, values: {} });
    const run = byRun.get(when);
    run.n++;
    for (const verdict of sample.verdicts || []) {
      const key = verdict.scanner;
      if (!Object.hasOwn(labels, key) || key === sample.excluded) continue;
      const flagged = verdict.tier === "hostile" || verdict.tier === "suspicious";
      run.values[key] = (run.values[key] || 0) + Number(flagged);
    }
  }
  const runs = Array.from(byRun.values()).sort((a, b) => a.at - b.at);
  for (const run of runs) {
    for (const key of Object.keys(run.values)) run.values[key] /= run.n;
  }
  const sensitivity = {};
  for (const key of ["ascan", "virustotal"]) {
    sensitivity[key] = (battle.operating_points || [])
      .filter((p) => p.scanner === key && p.cohort_n > 0 && p.fp_cohort_n > 0)
      .map((p) => ({ setting: p.setting, default: !!p.default, n: p.cohort_n, detected: p.detected,
        good: p.fp_cohort_n, fp: p.false_positives }));
  }
  const dateOptions = { month: "short", day: "numeric", timeZone: "UTC" };
  const period = new Intl.DateTimeFormat("en-US", { ...dateOptions, year: "numeric" });
  const dateFrom = battle.window?.from ? Date.parse(battle.window.from) : end;
  return {
    all, ecosystems, days, runs: runs.length,
    dateRange: period.formatRange(dateFrom, end),
    meanAge: battle.malware_age?.mean_hours,
    chart: { labels, runs, sensitivity, start, end },
  };
};
