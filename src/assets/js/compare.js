(() => {
  const root = document.getElementById("compare-scoreboard");
  const data = JSON.parse(document.getElementById("compare-chart-data").textContent);
  const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
  const percent = (value) => value == null ? "—" : (100 * value).toFixed(1) + "%";

  const ecosystem = root.querySelector("#compare-ecosystem");
  if (ecosystem) {
    const table = root.querySelector(".scores tbody");
    const count = root.querySelector("#compare-count");
    const templates = new Map(Array.from(root.querySelectorAll("template[data-cohort]"),
      (template) => [template.dataset.cohort, template]));
    ecosystem.addEventListener("change", () => {
      const template = templates.get(ecosystem.value);
      table.replaceChildren(...template.content.querySelector("tbody").cloneNode(true).childNodes);
      count.textContent = template.dataset.count;
    });
  }

  function mark(svg, tag, attributes, label) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
    if (label) element.textContent = label;
    svg.append(element);
    return element;
  }
  function graph(svg, height, draw) {
    const render = () => {
      const width = Math.round(svg.getBoundingClientRect().width);
      if (!width) return;
      svg.replaceChildren();
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      draw(width);
    };
    new ResizeObserver(render).observe(svg);
    render();
    return render;
  }
  function yTick(svg, left, right, y, label) {
    mark(svg, "line", { x1: left, y1: y, x2: right, y2: y, class: "grid" });
    mark(svg, "text", { x: left - 6, y: y + 4, "text-anchor": "end" }, label);
  }

  const trend = root.querySelector(".trend-plot");
  if (trend) {
    const peer = root.querySelector("#compare-peer");
    const legend = root.querySelector(".peer-name");
    const drawTrend = graph(trend, 142, (width) => {
      const left = 35, right = width - 14, top = 12, bottom = 112;
      const x = (at) => left + (at - data.start) * (right - left) / (data.end - data.start);
      const y = (value) => bottom - value * (bottom - top);
      const peerName = data.labels[peer.value];
      legend.textContent = peerName;
      trend.setAttribute("aria-label", `Run-by-run malware detection for Atomdrift and ${peerName}`);
      for (const value of [0, .5, 1]) yTick(trend, left, right, y(value), 100 * value + "%");
      const ticks = width < 430 ? [[0, "start"], [1, "end"]] : [[0, "start"], [.5, "middle"], [1, "end"]];
      for (const [part, anchor] of ticks) {
        const at = data.start + (data.end - data.start) * part;
        mark(trend, "text", { x: x(at), y: bottom + 19, "text-anchor": anchor }, date.format(at));
      }
      for (const [engine, style] of [[peer.value, "virustotal"], ["ascan", "ascan"]]) {
        let path = "", continuing = false;
        for (const run of data.runs) {
          const value = run.values[engine];
          if (value == null) { continuing = false; continue; }
          path += `${continuing ? "L" : "M"}${x(run.at).toFixed(1)},${y(value).toFixed(1)}`;
          continuing = true;
        }
        if (path) mark(trend, "path", { d: path, class: `series ${style}` });
      }
      for (const [index, run] of data.runs.entries()) {
        const previous = data.runs[index - 1], next = data.runs[index + 1];
        const a = previous ? x((previous.at + run.at) / 2) : left;
        const b = next ? x((next.at + run.at) / 2) : right;
        const hit = mark(trend, "rect", { x: a, y: top, width: b - a, height: bottom - top, class: "hit" });
        mark(hit, "title", {}, `${date.format(run.at)} ${time.format(run.at)} UTC · ${run.n} samples · Atomdrift ${percent(run.values.ascan)} · ${peerName} ${percent(run.values[peer.value])}`);
      }
    });
    peer.addEventListener("change", drawTrend);
  }

  const sensitivity = root.querySelector(".sensitivity-plot");
  if (sensitivity) {
    const series = Array.from(root.querySelectorAll(".sensitivity-control"), (control) => ({
      key: control.dataset.engine,
      points: data.sensitivity[control.dataset.engine],
      range: control.querySelector("input"),
      readout: control.querySelector("output"),
      endpoints: control.querySelectorAll(".sensitivity-ends span"),
    }));
    function setting(key, name) {
      return key === "ascan" ? name : name.slice(1) + (name === "n≥1" ? " engine" : " engines");
    }
    const selected = (engine) => engine.points[Number(engine.range.value)];
    function readout(engine) {
      const point = selected(engine);
      const level = setting(engine.key, point.setting) + (point.default ? " (default)" : "");
      const text = `${level} · ${percent(point.detected / point.n)} detected · ${percent(point.fp / point.good)} false positives`;
      engine.readout.textContent = text;
      engine.range.setAttribute("aria-valuetext", text);
    }
    for (const engine of series) {
      engine.range.max = String(engine.points.length - 1);
      engine.range.value = String(Math.max(0, engine.points.findIndex((point) => point.default)));
      engine.endpoints[0].textContent = setting(engine.key, engine.points[0].setting);
      engine.endpoints[1].textContent = setting(engine.key, engine.points.at(-1).setting);
      readout(engine);
    }
    const drawSensitivity = graph(sensitivity, 222, (width) => {
      const left = 37, right = width - 16, top = 30, bottom = 175;
      const max = Math.max(0, ...series.flatMap((engine) => engine.points.map((p) => p.fp / p.good)));
      const tick = max > .05 ? Math.ceil(max * 20) / 100 : max > .025 ? .01 : .005;
      const steps = Math.max(1, Math.ceil(max / tick));
      const x = (value) => left + value * (right - left);
      const y = (value) => bottom - value / (steps * tick) * (bottom - top);
      mark(sensitivity, "text", { x: 0, y: 13 }, "False positives");
      mark(sensitivity, "text", { x: (left + right) / 2, y: 218, "text-anchor": "middle" }, "Malware marked hostile");
      for (let step = 0; step <= steps; step++) {
        const value = step * tick;
        yTick(sensitivity, left, right, y(value), Number((100 * value).toFixed(1)) + "%");
      }
      for (const value of [0, .25, .5, .75, 1]) {
        mark(sensitivity, "text", { x: x(value), y: bottom + 19, "text-anchor": "middle" }, 100 * value + "%");
      }
      const coordinates = (point) => [x(point.detected / point.n), y(point.fp / point.good)];
      function drawPoint(engine, point, active, label) {
        const [cx, cy] = coordinates(point);
        const size = active ? 6 : 3.5;
        const cls = `${engine.key} ${active ? "selected" : "point"}`;
        const node = engine.key === "ascan"
          ? mark(sensitivity, "circle", { cx, cy, r: size, class: cls })
          : mark(sensitivity, "rect", { x: cx - size, y: cy - size, width: size * 2, height: size * 2, class: cls });
        mark(node, "title", {}, `${data.labels[engine.key]} · ${label}`);
      }
      for (const engine of series) {
        mark(sensitivity, "polyline", { points: engine.points.map(coordinates).join(" "), class: `series ${engine.key}` });
        const grouped = new Map();
        for (const point of engine.points) {
          const key = coordinates(point).join(",");
          if (!grouped.has(key)) grouped.set(key, []);
          grouped.get(key).push(point);
        }
        for (const points of grouped.values()) {
          drawPoint(engine, points[0], false, points.map((p) => setting(engine.key, p.setting)).join(", "));
        }
      }
      for (const engine of series) drawPoint(engine, selected(engine), true, engine.readout.textContent);
    });
    for (const engine of series) engine.range.addEventListener("input", () => {
      readout(engine);
      drawSensitivity();
    });
  }
})();
