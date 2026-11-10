// Experiments are "boxes with doors": time-boxed things you choose to try. Helpers shared by Today and Path.
import { dayKey, addDays, diffDays, fmtShort } from './dates.js';
import { esc } from './util.js';

export const expDayIndex = (e, t = dayKey()) => diffDays(e.start, t) + 1;
export const isOver = (e, t = dayKey()) => expDayIndex(e, t) > e.days;
export const allExperiments = (store) => Object.values(store.state.experiments).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
export const activeExperiments = (store, t = dayKey()) =>
  allExperiments(store).filter((e) => e.status === 'active' && expDayIndex(e, t) >= 1 && !isOver(e, t));

export function checkButtons(e, day) {
  const cur = e.checks?.[day];
  const b = (v, label) =>
    `<button type="button" class="seg-btn ${cur === v ? 'on' : ''} v-${v}" data-action="exp-check" data-id="${e.id}" data-day="${day}" data-v="${v}" aria-pressed="${cur === v}">${label}</button>`;
  return `<div class="seg small">${b('yes', 'Kept it')}${b('partly', 'Partly')}${b('no', 'Not today')}</div>`;
}
export function setCheck(store, id, day, v) {
  const e = store.state.experiments[id];
  if (!e) return null;
  const checks = { ...e.checks };
  if (!v || checks[day] === v) delete checks[day]; else checks[day] = v;
  store.putExperiment({ ...e, checks });
  return checks[day];
}
export function dots(e, t) {
  return `<div class="dots" role="list">${Array.from({ length: e.days }, (_, i) => {
    const day = addDays(e.start, i);
    const st = e.checks?.[day] || '';
    const future = day > t;
    const label = `${fmtShort(day)}: ${st === 'yes' ? 'kept it' : st === 'partly' ? 'partly' : st === 'no' ? 'not that day' : future ? 'ahead' : 'not marked'}`;
    return `<button type="button" role="listitem" class="dot ${st} ${future ? 'future' : ''} ${day === t ? 'today' : ''}" ${future ? 'disabled' : ''} data-action="cycle" data-id="${e.id}" data-day="${day}" aria-label="${esc(label)}" title="${esc(label)}"></button>`;
  }).join('')}</div>`;
}
export function keptCount(e) {
  const v = Object.values(e.checks || {});
  return { yes: v.filter((x) => x === 'yes').length, partly: v.filter((x) => x === 'partly').length };
}
