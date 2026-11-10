// Small things about sits that the player, the review and the history list all share.
import { esc } from '../lib/util.js';
import { SCENE_NAMES } from './scenes.js';

export const FEELS = ['Calm', 'Focused', 'Distracted', 'Anxious', 'Tired', 'Restless', 'Uncomfortable', 'Sleepy', 'Peaceful', 'Sad', 'Frustrated'];
export const TAG_DEFAULTS = ['Physical discomfort', 'Planning', 'Worry', 'Sounds', 'Memory', 'Sleepy'];
export const REMINDER_DEFAULTS = [
  'Nothing to fix. Just begin again.',
  'Noticing is the practice.',
  'There you are.',
  'Welcome back.',
  'This is the rep.',
  'Gently, back to the breath.',
];
export const MIN_RECORD_MS = 20000;   // shorter sits aren't saved or counted

// Returns across all sittings add up to a name. Not a score: just a long road with markers on it.
const LEVELS = [500, 1000, 2000, 5000, 10000, 15000, 20000, 50000, 75000, 100000];
const LEVEL_NAMES = ['Newcomer', 'Spark', 'Ember', 'Flame', 'Lantern', 'Anchor', 'Tide', 'Mountain', 'Sky', 'Stillness', 'Boundless'];
export function levelOf(n) {
  let l = 0;
  while (l < LEVELS.length && n >= LEVELS[l]) l++;
  const lo = l ? LEVELS[l - 1] : 0, hi = LEVELS[l];
  return { i: l, name: LEVEL_NAMES[l], next: LEVEL_NAMES[l + 1], lo, hi, frac: hi ? (n - lo) / (hi - lo) : 1, left: hi ? hi - n : 0 };
}

const KIND_NAMES = { future: 'Worrying about the future', ruminating: 'Ruminating', body: 'Physical sensation', lost: 'Lost in thought' };
const TAG_COLORS = ['#E0954F', '#7F8FE0', '#5FB58A', '#D07AAE', '#C9B25A', '#5AA9C9', '#B07FD6', '#D4786A'];
// Old Come back sits stored a "kind" id instead of a label.
export const entryLabel = (e) => (e ? (e.label ? String(e.label).trim() : KIND_NAMES[e.kind] || '') : '');
export function labelColor(label) {
  let h = 0;
  for (const c of String(label).toLowerCase()) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}
export function tally(entries) {
  const m = new Map();
  for (const e of entries || []) {
    const l = entryLabel(e);
    if (!l) continue;
    const k = l.toLowerCase();
    m.set(k, { name: l, n: (m.get(k)?.n || 0) + 1 });
  }
  return [...m.values()].sort((a, b) => b.n - a.n);
}

export const fmtClock = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return (h ? `${h}:${String(m).padStart(2, '0')}` : `${m}`) + `:${String(s % 60).padStart(2, '0')}`;
};
export const fmtDur = (ms) => {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} sec`;
  const m = Math.floor(sec / 60), h = Math.floor(m / 60);
  return h ? `${h} h ${m % 60} min` : `${m} min`;
};
export const fmtRate = (r) => r.toFixed(r >= 10 ? 0 : 1);

// A line for the whole sit with a tick wherever you came back, coloured by what pulled you away when that was named.
export function timeline(entries, dur, small = false) {
  const ticks = (entries || []).filter((e) => e && typeof e.at === 'number' && dur > 0).map((e) => {
    const lb = entryLabel(e);
    return `<i class="tl-tick" style="left:${Math.max(0, Math.min(100, (e.at / dur) * 100)).toFixed(2)}%${lb ? `;background:${labelColor(lb)}` : ''}" title="${esc(fmtClock(e.at) + (lb ? ` · ${lb}` : ''))}"></i>`;
  }).join('');
  const tl = tally(entries);
  const plain = (entries || []).filter((e) => !entryLabel(e)).length;
  const legend = tl.length && !small
    ? `<div class="tl-legend">${tl.slice(0, 8).map((x) => `<span><i style="background:${labelColor(x.name)}"></i>${esc(x.name)} <b>×${x.n}</b></span>`).join('')}${plain ? `<span><i></i>Just a return <b>×${plain}</b></span>` : ''}</div>`
    : '';
  return `<div class="tl ${small ? 'sm' : ''}"><div class="tl-track">${ticks}</div>${small ? '' : `<div class="tl-axis"><span>0:00</span><span>${fmtClock(dur)}</span></div>`}</div>${legend}`;
}
export function shapeLine(entries, dur) {
  const timed = (entries || []).filter((e) => typeof e.at === 'number');
  const n = timed.length;
  if (n < 3 || !(dur > 0)) return '';
  const th = [0, 0, 0];
  timed.forEach((e) => { th[Math.max(0, Math.min(2, Math.floor((e.at / dur) * 3)))]++; });
  const mx = th.indexOf(Math.max(...th));
  return th[mx] / n >= 0.5
    ? `${th[mx]} of your ${n} returns came in the ${['first third', 'middle third', 'last third'][mx]} of the sit.`
    : 'Your returns were spread fairly evenly through the sit.';
}

/** What to call a sit in a list, whichever app recorded it. */
export function sitTitle(r) {
  if (r.title) return r.title;
  if (r.kind === 'breathe') return 'Breathing';
  return SCENE_NAMES[r.scene] ? `Sat with ${SCENE_NAMES[r.scene].toLowerCase()}` : 'Sat';
}
