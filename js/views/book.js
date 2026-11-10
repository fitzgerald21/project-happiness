// Book: the one-line-a-day book (the same pages as the One Line a Day app), everything you've written,
// and a look back across sits, check-ins, pulls and present moments together.
import { dayKey, keyOfTs, addDays, lastNDays, fmtShort, fmtTime, parseKey } from '../lib/dates.js';
import { esc, plural } from '../lib/util.js';
import { JOURNAL_PROMPTS } from '../lib/content.js';
import { lineChart, barChart, bindCharts } from '../lib/charts.js';
import { pageHTML, bindPage } from '../lib/page.js';
import { thread } from '../lib/day.js';
import { tally, fmtDur, fmtRate } from '../sit/common.js';
import { openBook } from '../lib/bookdoor.js';

const ui = { q: '', shown: 120 };
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

function pageView(ctx, k) {
  const { store } = ctx;
  const t = dayKey();
  const th = thread(store, k).filter((x) => x.type !== 'line');
  const day = store.day(k);
  const prompt = day.reflect?.prompt || JOURNAL_PROMPTS[Math.abs(parseKey(k).getTime() / 86400000 | 0) % JOURNAL_PROMPTS.length];
  return `
    <div class="paper-nav">
      <a class="round" href="#/book/${addDays(k, -1)}" aria-label="Previous day" style="display:grid;place-items:center;text-decoration:none">‹</a>
      <div class="row" style="justify-content:center">
        <input type="date" name="jump" value="${k}" aria-label="Jump to a date">
        ${k !== t ? '<a class="link small" href="#/book">Today</a>' : ''}
      </div>
      <a class="round" href="#/book/${addDays(k, 1)}" aria-label="Next day" style="display:grid;place-items:center;text-decoration:none">›</a>
    </div>
    ${pageHTML(store, k, { placeholder: k === t ? 'One line for today…' : 'Nothing written. Add a line…' })}
    <button class="btn wide" data-action="open-book" data-v="${k}">Open the book</button>
    ${th.length ? `<section class="card"><h2>That day</h2><ul class="thread">${th.map((x) => `<li><time>${fmtTime(x.ts)}</time><i style="--c:${x.color}"></i><span>${esc(x.text)}</span></li>`).join('')}</ul></section>` : ''}
    <section class="card">
      <p class="eyebrow">More to say?</p>
      <h3>${esc(prompt)}</h3>
      <textarea class="mt" name="reflect" rows="4" data-prompt="${esc(prompt)}" placeholder="This stays out of the book. A few lines is plenty.">${esc(day.reflect?.text || '')}</textarea>
    </section>`;
}

function allView(ctx) {
  const entries = ctx.store.state.entries;
  const q = ui.q.trim().toLowerCase();
  const keys = Object.keys(entries).filter((k) => entries[k]?.t && (!q || entries[k].t.toLowerCase().includes(q))).sort().reverse();
  const md = dayKey().slice(4);
  const onThisDay = q ? [] : Object.keys(entries).filter((k) => k.endsWith(md) && k !== dayKey() && entries[k]?.t).sort().reverse();
  let year = '', rows = '';
  for (const k of keys.slice(0, ui.shown)) {
    if (k.slice(0, 4) !== year) { year = k.slice(0, 4); rows += `<h2 class="yhead">${year}</h2>`; }
    rows += `<a class="jrow" href="#/book/${k}"><time>${parseKey(k).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</time><p class="hand">${esc(entries[k].t)}</p></a>`;
  }
  return `
    <input name="q" type="text" placeholder="Search your lines…" value="${esc(ui.q)}" aria-label="Search" class="mt">
    ${onThisDay.length ? `<section class="card soft"><p class="eyebrow">On this day</p>${onThisDay.map((k) => `<a class="jrow" href="#/book/${k}" style="border:0;padding:6px 0"><time>${k.slice(0, 4)}</time><p class="hand">${esc(entries[k].t)}</p></a>`).join('')}</section>` : ''}
    <div id="rows">${rows || `<p class="empty">${q ? 'Nothing matches.' : 'Nothing written yet. Your first line can be tonight.'}</p>`}</div>
    ${keys.length > ui.shown ? `<button class="btn wide mt" data-action="more">Show more (${keys.length - ui.shown} left)</button>` : ''}`;
}

function insightsView(ctx) {
  const { store } = ctx;
  const s = store.state;
  const t = dayKey();
  const days = lastNDays(14);
  const label = (d) => String(parseKey(d).getDate());
  const settledOf = (d) => avg((s.days[d]?.checks || []).map((c) => c.settled).filter(Boolean));
  const settled = days.map((d) => { const v = settledOf(d); return v == null ? null : Math.round(v * 10) / 10; });
  const sitByDay = {};
  s.sessions.forEach((r) => { const k = keyOfTs(r.start); sitByDay[k] = (sitByDay[k] || 0) + r.dur / 60000; });
  const sitVals = days.map((d) => Math.round(sitByDay[d] || 0));
  const urges = Object.values(s.urges);
  const in14 = (ts) => keyOfTs(ts) >= days[0];
  const sits14 = s.sessions.filter((r) => in14(r.start));
  const presence14 = days.reduce((a, d) => a + (s.days[d]?.presence?.length || 0), 0);
  const lines14 = days.filter((d) => s.entries[d]?.t).length;

  // gentle patterns across everything: what lines up with a settled mind?
  const scored = Object.keys(s.days).map((d) => [d, settledOf(d)]).filter(([, v]) => v != null);
  const compare = (has, what) => {
    const a = scored.filter(([d]) => has(d)).map(([, v]) => v), b = scored.filter(([d]) => !has(d)).map(([, v]) => v);
    if (a.length < 3 || b.length < 3) return '';
    return `<li>On days you ${what}, your mind averaged <strong>${avg(a).toFixed(1)}</strong>, against <strong>${avg(b).toFixed(1)}</strong> on days you didn't.</li>`;
  };
  const urgeDays = new Set(urges.filter((u) => u.outcome === 'lapsed').map((u) => keyOfTs(u.ts)));
  const allChecks = Object.values(s.days).flatMap((d) => d.checks || []).filter((c) => c.settled);
  const afterSit = allChecks.filter((c) => c.after === 'sit').map((c) => c.settled), plain = allChecks.filter((c) => !c.after).map((c) => c.settled);
  const timed = s.sessions.filter((r) => r.dur >= 180000 && r.returns);
  const rate = (list) => avg(list.map((r) => r.returns / (r.dur / 60000)));
  const pats = [
    compare((d) => sitByDay[d] > 0, 'sat'),
    compare((d) => s.days[d]?.presence?.length > 0, 'logged a present moment'),
    compare((d) => !!s.entries[d]?.t, 'wrote your line'),
    compare((d) => urgeDays.has(d), 'got pulled in and noticed afterward'),
    afterSit.length >= 3 && plain.length >= 3 ? `<li>Right after sitting, your mind averages <strong>${avg(afterSit).toFixed(1)}</strong>. At other check-ins it's <strong>${avg(plain).toFixed(1)}</strong>.</li>` : '',
    timed.length >= 10 ? `<li>You've been coming back about <strong>${fmtRate(rate(timed.slice(-5)))}</strong> times a minute lately, and <strong>${fmtRate(rate(timed.slice(0, -5)))}</strong> before that. More isn't better or worse. It's just how often you notice.</li>` : '',
  ].filter(Boolean);

  // which days you sat, last 17 weeks, ending this week
  const end = addDays(t, 6 - parseKey(t).getDay());
  const heat = lastNDays(17 * 7, end).map((d) => {
    const m = sitByDay[d] || 0;
    return `<i data-l="${m ? Math.min(4, 1 + Math.floor(m / 15)) : 0}" class="${d > t ? 'future' : ''}" title="${esc(`${fmtShort(d)}: ${m ? fmtDur(m * 60000) : 'no sit'}`)}"></i>`;
  }).join('');
  const since = addDays(t, -29);
  const pulled = tally(s.sessions.filter((r) => keyOfTs(r.start) >= since).flatMap((r) => r.entries || [])).slice(0, 6);
  const maxPull = pulled[0]?.n || 1;
  const words = Object.keys(s.days).sort().flatMap((d) => (s.days[d].checks || []).map((c) => c.word)).filter(Boolean).slice(-10);
  const totalMs = s.sessions.reduce((a, r) => a + r.dur, 0);
  const lineKeys = Object.keys(s.entries).filter((k) => s.entries[k]?.t);

  return `
    <section class="tiles">
      <div class="tile"><b>${sits14.length}</b><span>sits</span></div>
      <div class="tile"><b>${Math.round(sits14.reduce((a, r) => a + r.dur, 0) / 60000)}</b><span>minutes</span></div>
      <div class="tile"><b>${urges.filter((u) => in14(u.ts)).length}</b><span>pulls noticed</span></div>
      <div class="tile"><b>${presence14}</b><span>present moments</span></div>
      <div class="tile"><b>${lines14}</b><span>lines written</span></div>
    </section>
    <p class="muted small center">The last 14 days</p>
    <section class="card">
      <h2>Settled mind</h2>
      <p class="muted small">From your check-ins. 1 is scattered, 5 is settled.</p>
      ${settled.some((v) => v != null) ? lineChart({ days, values: settled, labelFn: label, tipFn: (d, v) => `${fmtShort(d)}: ${v == null ? 'no check-in' : `${v} of 5`}` }) : '<p class="empty">Check in on Today and your line will show up here.</p>'}
    </section>
    <section class="card">
      <h2>Minutes sat</h2>
      ${sitVals.some(Boolean) ? barChart({ days, values: sitVals, labelFn: label, tipFn: (d, v) => `${fmtShort(d)}: ${v ? `${v} min` : 'no sit'}` }) : '<p class="empty">Your sits will show up here.</p>'}
    </section>
    <section class="card soft">
      <h2>What seems to help</h2>
      ${pats.length ? `<ul class="pats">${pats.join('')}</ul>` : '<p class="small">After a couple of weeks of check-ins, simple patterns show up here: whether sitting, being present, or writing your line lines up with a more settled mind.</p>'}
      <p class="muted small">This isn't science. It's just paying attention.</p>
    </section>
    <section class="card">
      <div class="card-head"><h2>Days you sat</h2><span class="muted small">17 weeks</span></div>
      <div class="heat">${heat}</div>
      <p class="muted small mt">${s.sessions.length ? `${plural(s.sessions.length, 'sit')} and ${fmtDur(totalMs)} in all. ${store.totalReturns().toLocaleString()} returns.` : 'Nothing yet.'}</p>
    </section>
    ${pulled.length ? `<section class="card"><h2>What pulls you away on the cushion</h2><p class="muted small">Named returns, last 30 days.</p>${pulled.map((x) => `<div class="hbar"><span>${esc(x.name)}</span><span class="hbar-track"><span class="hbar-fill" style="width:${(x.n / maxPull) * 100}%"></span></span><span class="hbar-n">${x.n}</span></div>`).join('')}</section>` : ''}
    ${words.length ? `<section class="card"><h2>Your words lately</h2><div class="chips">${words.map((w) => `<span class="chip static">${esc(w)}</span>`).join('')}</div></section>` : ''}
    <section class="card">
      <h2>The book</h2>
      <p class="muted">${lineKeys.length ? `${plural(lineKeys.length, 'line')} across ${plural(new Set(lineKeys.map((k) => k.slice(0, 4))).size, 'year')}, since ${fmtShort(lineKeys.sort()[0])}, ${lineKeys[0].slice(0, 4)}.` : 'No lines yet.'}</p>
    </section>`;
}

export function render(root, ctx) {
  const { store } = ctx;
  const [arg] = ctx.args;
  const tab = arg === 'all' ? 'all' : arg === 'insights' ? 'insights' : 'page';
  const k = isDate(arg) ? arg : dayKey();
  const tabs = [['page', 'The page', ''], ['all', 'Every line', '/all'], ['insights', 'Looking back', '/insights']];
  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Book</p>
      <h1>${tab === 'insights' ? 'Look back, gently.' : tab === 'all' ? 'Everything you kept.' : 'One line a day.'}</h1>
    </header>
    <div class="seg subtabs">${tabs.map(([id, l, href]) => `<a class="seg-btn ${tab === id ? 'on' : ''}" href="#/book${href}" style="text-decoration:none;text-align:center">${l}</a>`).join('')}</div>
    ${tab === 'insights' ? insightsView(ctx) : tab === 'all' ? allView(ctx) : pageView(ctx, k)}`;

  bindCharts(root);
  const unbind = bindPage(root, store);
  let qTimer = 0;
  root.oninput = (e) => {
    if (e.target.name !== 'q') return;
    ui.q = e.target.value; ui.shown = 120;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => {   // repaint the list without stealing the cursor
      const tmp = document.createElement('div');
      tmp.innerHTML = allView(ctx);
      root.querySelector('#rows').replaceWith(tmp.querySelector('#rows'));
    }, 150);
  };
  root.onchange = (e) => {
    if (e.target.name === 'jump' && isDate(e.target.value)) location.hash = `#/book/${e.target.value}`;
    else if (e.target.name === 'reflect') {
      const text = e.target.value.trim();
      store.patchDay(k, { reflect: text ? { prompt: e.target.dataset.prompt, text } : null });
    }
  };
  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (el?.dataset.action === 'more') { ui.shown += 200; ctx.rerender(); }
    else if (el?.dataset.action === 'open-book') openBook(ctx, el.dataset.v);
  };
  return () => { clearTimeout(qTimer); unbind(); };
}
