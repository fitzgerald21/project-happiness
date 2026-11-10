// One day, gathered from everything the app knows: check-ins, sits, present moments, pauses and the line.
// This is what makes the parts one app. Today shows it as a thread; the Book shows it beside each page.
import { keyOfTs, dayKey } from './dates.js';
import { plural } from './util.js';
import { REACHING_FOR } from './content.js';
import { fmtDur } from '../sit/common.js';

export const COLORS = { check: '#74c5bf', sit: '#e9b863', presence: '#e39a8f', urge: '#8fa3e6', line: '#f1ead6' };
const targetName = (id) => (REACHING_FOR.find((x) => x.id === id)?.label || 'something').toLowerCase();

export function sitsOn(store, k) { return store.state.sessions.filter((r) => keyOfTs(r.start) === k); }
export function urgesOn(store, k) { return Object.values(store.state.urges).filter((u) => keyOfTs(u.ts) === k); }

export function thread(store, k = dayKey()) {
  const day = store.day(k), out = [];
  for (const c of day.checks || []) {
    const bits = [c.settled ? `mind ${c.settled}/5` : '', c.heart ? `heart ${c.heart}/5` : '', c.word ? `"${c.word}"` : ''].filter(Boolean).join(', ');
    out.push({ ts: c.ts, type: 'check', text: `${c.after === 'sit' ? 'After sitting' : c.after === 'pause' ? 'After pausing' : 'Checked in'}: ${bits}` });
  }
  for (const r of sitsOn(store, k)) {
    out.push({ ts: r.start, type: 'sit', text: `Sat ${fmtDur(r.dur)}${r.returns ? ` and came back ${plural(r.returns, 'time')}` : ''}${r.stage ? ` · stage ${r.stage}` : ''}` });
  }
  for (const p of day.presence || []) out.push({ ts: p.ts, type: 'presence', text: `Really there with ${p.with}` });
  for (const u of urgesOn(store, k)) {
    const t = targetName(u.target);
    out.push({ ts: u.ts, type: 'urge', text: u.outcome === 'redirected' ? `Caught the pull of ${t} → ${String(u.detail || 'something else').toLowerCase()}` : u.outcome === 'chose' ? `Chose ${u.detail} min of ${t}, on purpose` : `Noticed ${t} afterward` });
  }
  const e = store.state.entries[k];
  if (e?.t && e.u && keyOfTs(e.u) === k) out.push({ ts: e.u, type: 'line', text: "Wrote today's line" });
  return out.sort((a, b) => a.ts - b.ts).map((x) => ({ ...x, color: COLORS[x.type] }));
}

/** A few plain words about a day, for the margin of its page. */
export function facts(store, k) {
  const day = store.day(k), sits = sitsOn(store, k), urges = urgesOn(store, k), out = [];
  if (sits.length) {
    const ms = sits.reduce((a, r) => a + r.dur, 0), n = sits.reduce((a, r) => a + (r.returns || 0), 0);
    out.push(`sat ${fmtDur(ms)}${n ? `, came back ${plural(n, 'time')}` : ''}`);
  }
  const who = [...new Set((day.presence || []).map((p) => p.with))];
  if (who.length) out.push(`there with ${who.join(' and ')}`);
  if (urges.length) out.push(`${plural(urges.length, 'pull')} noticed`);
  const last = (day.checks || []).filter((c) => c.settled).at(-1);
  if (last) out.push(`mind ${last.settled}/5`);
  const word = (day.checks || []).map((c) => c.word).filter(Boolean).at(-1);
  if (word) out.push(`"${word}"`);
  return out;
}
