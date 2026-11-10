// The sky at the top of Today follows the real clock: colours through the day, the sun (or moon) on its arc.
const STOPS = [
  [0, '#0a0e24', '#1c2247'], [4.5, '#141a3d', '#3a2f5e'], [6, '#4a5a9a', '#e8a37c'], [8, '#4b8fd0', '#a9cfee'],
  [13, '#3f86cf', '#93c4ea'], [16.5, '#4a7fc4', '#e2b98a'], [18.5, '#3d3a78', '#e0805e'], [20, '#1a1f48', '#4d3a6c'], [24, '#0a0e24', '#1c2247'],
];
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, k) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k)).join(',')})`;
const RISE = 6.25, SET = 18.75;

export function sky(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  let i = 0;
  while (i < STOPS.length - 2 && h >= STOPS[i + 1][0]) i++;
  const [h0, a0, b0] = STOPS[i], [h1, a1, b1] = STOPS[i + 1];
  const k = (h - h0) / (h1 - h0);
  const day = h >= RISE && h <= SET;
  // how far the sun or moon is along its arc, 0 at rising, 1 at setting
  const along = day ? (h - RISE) / (SET - RISE) : ((h - SET + 24) % 24) / (24 - (SET - RISE));
  return { top: mix(a0, a1, k), bottom: mix(b0, b1, k), day, along, hour: h };
}

/** marks: [{ ts, color }] drawn on the horizon at the time they happened. */
export function skyArc(s, marks = []) {
  const W = 360, H = 96, base = 78, x0 = 20, x1 = W - 20;
  const ax = x0 + (x1 - x0) * s.along, ay = base - 248 * s.along * (1 - s.along);
  const hx = (hr) => x0 + (x1 - x0) * (hr / 24);
  const orb = s.day
    ? `<circle class="orb" cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="9" fill="#ffe7ad"/>`
    : `<g class="orb"><circle cx="${ax.toFixed(1)}" cy="${ay.toFixed(1)}" r="8" fill="#f1ead6"/><circle cx="${(ax + 4).toFixed(1)}" cy="${(ay - 2).toFixed(1)}" r="7" fill="${s.top}"/></g>`;
  const ticks = marks.map((m) => {
    const d = new Date(m.ts), x = hx(d.getHours() + d.getMinutes() / 60);
    return `<circle cx="${x.toFixed(1)}" cy="${base}" r="4" fill="${m.color}" class="mark"/>`;
  }).join('');
  return `<svg class="sky-arc" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <path class="path" d="M${x0} ${base} Q ${W / 2} ${base - 124} ${x1} ${base}"/>
    <line class="horizon" x1="0" x2="${W}" y1="${base}" y2="${base}"/>
    <line class="now" x1="${hx(s.hour).toFixed(1)}" x2="${hx(s.hour).toFixed(1)}" y1="${base - 5}" y2="${base + 5}"/>
    ${ticks}${orb}
  </svg>`;
}
