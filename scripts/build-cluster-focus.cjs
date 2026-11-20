const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const charts = join(__dirname, "..", "assets", "charts");
let svg = readFileSync(join(charts, "audience_cluster.svg"), "utf8");

function replaceOnce(before, after) {
  const index = svg.indexOf(before);
  if (index < 0 || svg.indexOf(before, index + before.length) >= 0) {
    throw new Error(`Expected one instance of ${before}`);
  }
  svg = svg.replace(before, after);
}

replaceOnce('width="1540" height="1070" viewBox="0 0 1540 1070"', 'width="1492" height="918" viewBox="-38 132 1492 918"');
replaceOnce('<rect x="0" y="0" width="1540" height="1070"', '<rect x="-38" y="132" width="1492" height="918"');
const title = svg.match(/<text\b[^>]*class="title"[^>]*>([^<]+)<\/text>/);
if (!title) throw new Error("Missing chart title");
replaceOnce(title[0], `<title>${title[1]}</title>`);

replaceOnce(".wave{font-size:20px", ".wave{font-size:28px");
replaceOnce(".axisnum{font-size:13px", ".axisnum{font-size:22px");
replaceOnce(".band{font-size:12px", ".band{font-size:21px");
replaceOnce("font-size:15px;font-weight:600;fill:#42545b", "font-size:23px;font-weight:600;fill:#42545b");
replaceOnce('font-size="19" font-weight="700" fill="#4e5f66" transform="rotate(-90 74 522.0)"',
  'font-size="32" font-weight="700" fill="#4e5f66" transform="rotate(-90 74 522.0)"');

svg = svg.replace(/<text x="182" y="([\d.]+)" text-anchor="end" class="axisnum"/g, (_, y) =>
  `<text x="152" y="${Number(y) + 3}" text-anchor="end" class="axisnum"`);
const bandLines = new Map([
  ["تعامل بسیار ضعیف", ["تعامل", "بسیار ضعیف"]],
  ["آشنایی یا مصرف محدود", ["آشنایی یا", "مصرف محدود"]],
  ["تعامل متوسط تا رو به رشد", ["تعامل متوسط", "تا رو به رشد"]],
  ["تعامل قوی / مخاطب فعال", ["تعامل قوی", "مخاطب فعال"]]
]);
svg = svg.replace(/<text x="1252" y="([\d.]+)" class="band">([^<]+)<\/text>/g, (_, y, label) => {
  const [first, second] = bandLines.get(label);
  const top = Number(y) - 11;
  return `<text x="1290" y="${top}" class="band" aria-label="${label}"><tspan x="1290" y="${top}">${first}</tspan><tspan x="1290" y="${top + 22}">${second}</tspan></text>`;
});
svg = svg.replace(/<rect x="1240" y="([\d.]+)" width="230" height="30"/g, (_, y) =>
  `<rect x="1172" y="${Number(y) - 8}" width="123" height="46"`);

const originalLegendY = [483, 509, 535, 561];
originalLegendY.forEach((originalY, index) => {
  const row = 472 + index * 34;
  replaceOnce(`<circle cx="1500" cy="${originalY}" r="7"`, `<circle cx="1428" cy="${row}" r="7"`);
  replaceOnce(`<text x="1460" y="${originalY + 5}" class="legend"`,
    `<text x="1382" y="${row + 7}" class="legend"`);
});

writeFileSync(join(charts, "audience_cluster_focus.svg"), svg, "utf8");

const clusterColors = ["#b6b0a4", "#5f8560", "#c56a4c", "#8a6cab"];
const groups = new Map();
for (const [, rawX, rawY, color] of svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="2\.55" fill="(#[0-9a-f]{6})" opacity="0\.95"/g)) {
  const x = Number(rawX);
  const y = Number(rawY);
  const wave = 3 + Math.round((x - 280) / 370);
  const cluster = clusterColors.indexOf(color) + 1;
  if (wave < 3 || wave > 5 || !cluster) throw new Error(`Unrecognized cluster point at ${x}, ${y}`);
  const key = `${wave}-${cluster}`;
  if (!groups.has(key)) groups.set(key, { wave, cluster, points: [] });
  groups.get(key).points.push({ x, y });
}
if (groups.size !== 9) throw new Error(`Expected nine wave-cluster pairs, got ${groups.size}`);

function hullEdge(points) {
  const edge = [];
  for (const point of points) {
    while (edge.length >= 2) {
      const a = edge[edge.length - 2];
      const b = edge[edge.length - 1];
      if ((b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) > 0) break;
      edge.pop();
    }
    edge.push(point);
  }
  return edge.slice(0, -1);
}

const hotspots = [...groups.values()].sort((a, b) => a.wave - b.wave || a.cluster - b.cluster).map(({ wave, cluster, points }) => {
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const edge = [...hullEdge(sorted), ...hullEdge(sorted.reverse())];
  const middle = points.reduce((sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }), { x: 0, y: 0 });
  const vertices = edge.map(point => {
    const dx = point.x - middle.x;
    const dy = point.y - middle.y;
    const scale = 1 + 7 / Math.hypot(dx, dy);
    return `${(middle.x + dx * scale).toFixed(2)} ${(middle.y + dy * scale).toFixed(2)}`;
  });
  return {
    wave, cluster, outline: `M${vertices.join("L")}Z`,
    color: clusterColors[cluster - 1],
    points: points.map(({ x, y }) => [x, y])
  };
});
const data = hotspots.map(item => `  ${JSON.stringify(item)}`).join(",\n");
writeFileSync(join(__dirname, "cluster-hotspots.js"), `globalThis.clusterHotspots = [\n${data}\n];\n`, "utf8");
