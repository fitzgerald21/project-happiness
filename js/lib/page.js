// A page of the book: one date, a row for each year you wrote on it. The row for the page's own year is
// where you write; the others are that same day in other years.
import { esc } from './util.js';
import { parseKey, dayKey } from './dates.js';
import { facts } from './day.js';

const pad = (n) => String(n).padStart(2, '0');
const wd = (y, m, d) => new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short' });

/** The years to show on a date's page: every year with a line on that date, plus the page's own year (five at most). */
export function pageYears(store, k) {
  const [y, m, d] = k.split('-').map(Number);
  const md = `-${pad(m)}-${pad(d)}`;
  const others = Object.keys(store.state.entries).filter((x) => x.endsWith(md) && store.state.entries[x]?.t).map((x) => Number(x.slice(0, 4))).filter((x) => x !== y).sort((a, b) => a - b);
  return [...others.slice(-4), y].sort((a, b) => a - b);
}

export function pageHTML(store, k, { placeholder = 'One line for today…' } = {}) {
  const [y, m, d] = k.split('-').map(Number);
  const date = parseKey(k);
  const rows = pageYears(store, k).map((yr) => {
    const key = `${yr}-${pad(m)}-${pad(d)}`, own = yr === y, text = store.line(key);
    const f = facts(store, key);
    return `<div class="year-row ${own ? 'now' : ''}">
      <div><div class="year-badge">${yr}</div><span class="wd">${wd(yr, m, d)}</span></div>
      <div>${own
        ? `<textarea class="hand" data-line="${key}" rows="2" maxlength="2000" placeholder="${esc(placeholder)}" aria-label="Line for ${key}">${esc(text)}</textarea>`
        : `<a class="hand block" href="#/book/${key}" style="text-decoration:none">${esc(text)}</a>`}
        ${f.length ? `<p class="paper-foot">${esc(f.join(' · '))}</p>` : ''}</div>
    </div>`;
  }).join('');
  return `<article class="paper">
    <header class="paper-date"><b>${date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}</b><span>${k === dayKey() ? 'today' : date.toLocaleDateString(undefined, { weekday: 'long' })}</span></header>
    ${rows}
  </article>`;
}

/** Saves a line as it's typed (a moment after the last keystroke, and when leaving the field). */
export function bindPage(root, store) {
  let timer = 0, pendingEl = null;
  const grow = (el) => { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; };
  const flush = () => { clearTimeout(timer); if (pendingEl) { store.setLine(pendingEl.dataset.line, pendingEl.value); pendingEl = null; } };
  const onInput = (e) => {
    if (!e.target.dataset?.line) return;
    grow(e.target);
    pendingEl = e.target;
    clearTimeout(timer);
    timer = setTimeout(flush, 700);
  };
  root.addEventListener('input', onInput);
  root.addEventListener('focusout', flush);
  root.querySelectorAll('textarea[data-line]').forEach(grow);
  return () => { flush(); root.removeEventListener('input', onInput); root.removeEventListener('focusout', flush); };
}
