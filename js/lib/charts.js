// Small, quiet SVG charts. One series each, so no legends needed; tap or hover
// a point/bar to see its value.
import { esc } from './util.js';

const W = 320;
const H = 120;
const PAD = { l: 22, r: 8, t: 10, b: 20 };

function frame(days, labelFn) {
  const iw = W - PAD.l - PAD.r;
  const step = iw / days.length;
  const x = (i) => PAD.l + step * i + step / 2;
  const labels = days
    .map((d, i) => (i % 2 === (days.length - 1) % 2 ? `<text x="${x(i)}" y="${H - 5}" class="ax">${esc(labelFn(d))}</text>` : ''))
    .join('');
  return { iw, step, x, labels };
}

// values: array of numbers or null (gap), range lo..hi
export function lineChart({ days, values, lo = 1, hi = 5, labelFn, tipFn, ticks = [1, 3, 5] }) {
  const { step, x, labels } = frame(days, labelFn);
  const ih = H - PAD.t - PAD.b;
  const y = (v) => PAD.t + ih - ((v - lo) / (hi - lo)) * ih;
  const grid = ticks
    .map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${PAD.l - 6}" y="${y(t) + 3}" class="ax ax-y">${t}</text>`)
    .join('');
  let path = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) { pen = false; return; }
    path += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
    pen = true;
  });
  const dots = values
    .map((v, i) => (v == null ? '' : `<circle cx="${x(i)}" cy="${y(v)}" r="4" class="pt"/>`))
    .join('');
  const hits = days
    .map((d, i) => `<rect x="${x(i) - step / 2}" y="0" width="${step}" height="${H}" class="hit" data-tip="${esc(tipFn(d, values[i]))}" data-x="${x(i)}"/>`)
    .join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${grid}${labels}<path d="${path}" class="ln"/>${dots}<line class="xhair" y1="${PAD.t}" y2="${H - PAD.b}" x1="-10" x2="-10"/>${hits}</svg><div class="tip" hidden></div></div>`;
}

export function barChart({ days, values, labelFn, tipFn }) {
  const { step, x, labels } = frame(days, labelFn);
  const ih = H - PAD.t - PAD.b;
  const max = Math.max(10, ...values);
  const top = Math.ceil(max / 10) * 10;
  const y = (v) => PAD.t + ih - (v / top) * ih;
  const ticks = [0, top / 2, top];
  const grid = ticks
    .map((t) => `<line x1="${PAD.l}" x2="${W - PAD.r}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="${PAD.l - 6}" y="${y(t) + 3}" class="ax ax-y">${t}</text>`)
    .join('');
  const bw = Math.min(14, step - 4);
  const bars = values
    .map((v, i) => {
      if (!v) return '';
      const h = Math.max(3, (v / top) * ih);
      const bx = x(i) - bw / 2;
      const by = PAD.t + ih - h;
      const r = Math.min(4, bw / 2, h);
      // rounded top, square base
      return `<path class="bar" d="M${bx},${by + h}V${by + r}Q${bx},${by} ${bx + r},${by}H${bx + bw - r}Q${bx + bw},${by} ${bx + bw},${by + r}V${by + h}Z"/>`;
    })
    .join('');
  const hits = days
    .map((d, i) => `<rect x="${x(i) - step / 2}" y="0" width="${step}" height="${H}" class="hit" data-tip="${esc(tipFn(d, values[i]))}" data-x="${x(i)}"/>`)
    .join('');
  return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img">${grid}${labels}${bars}<line class="xhair" y1="${PAD.t}" y2="${H - PAD.b}" x1="-10" x2="-10"/>${hits}</svg><div class="tip" hidden></div></div>`;
}

// Wire up tooltips for every chart inside root.
export function bindCharts(root) {
  root.querySelectorAll('.chart').forEach((c) => {
    const tip = c.querySelector('.tip');
    const xh = c.querySelector('.xhair');
    const svg = c.querySelector('svg');
    const show = (rect) => {
      tip.textContent = rect.dataset.tip;
      tip.hidden = false;
      c.classList.add('active');
      const bx = Number(rect.dataset.x);
      xh.setAttribute('x1', bx);
      xh.setAttribute('x2', bx);
      const pct = bx / W;
      const cw = c.clientWidth;
      const left = Math.min(Math.max(pct * cw, 60), cw - 60);
      tip.style.left = `${left}px`;
    };
    const hide = () => {
      tip.hidden = true;
      c.classList.remove('active');
      xh.setAttribute('x1', -10);
      xh.setAttribute('x2', -10);
    };
    svg.addEventListener('pointerover', (e) => e.target.classList.contains('hit') && show(e.target));
    svg.addEventListener('pointerdown', (e) => e.target.classList.contains('hit') && show(e.target));
    svg.addEventListener('pointerleave', (e) => e.pointerType === 'mouse' && hide());
  });
}
