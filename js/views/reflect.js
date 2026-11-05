import { dayKey, keyOfTs, lastNDays, fmtShort, parseKey } from '../lib/dates.js';
import { esc, uid, toast, hashStr, fmtMin } from '../lib/util.js';
import { JOURNAL_PROMPTS } from '../lib/content.js';
import { lineChart, barChart, bindCharts } from '../lib/charts.js';

const ui = { tab: 'insights', promptOffset: 0, draft: '' };

const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

function insights(s) {
  const days = lastNDays(14);
  const settled = days.map((d) => s.checkins[d]?.settled ?? null);
  const sitByDay = Object.fromEntries(days.map((d) => [d, 0]));
  s.sits.forEach((x) => { const k = keyOfTs(x.ts); if (k in sitByDay) sitByDay[k] += x.minutes; });
  const sitVals = days.map((d) => Math.round(sitByDay[d]));
  const inRange = (arr) => arr.filter((x) => keyOfTs(x.ts) >= days[0]);
  const sits14 = inRange(s.sits);
  const urges14 = inRange(s.urges);
  const presence14 = inRange(s.presence);
  const label = (d) => String(parseKey(d).getDate());

  // Gentle patterns across all history: does sitting / presence line up with a settled mind?
  const sitDays = new Set(s.sits.map((x) => keyOfTs(x.ts)));
  const presDays = new Set(s.presence.map((x) => keyOfTs(x.ts)));
  const entries = Object.entries(s.checkins).filter(([, c]) => c.settled);
  const compare = (set, what) => {
    const withV = entries.filter(([d]) => set.has(d)).map(([, c]) => c.settled);
    const without = entries.filter(([d]) => !set.has(d)).map(([, c]) => c.settled);
    if (withV.length < 3 || without.length < 3) return '';
    return `<li>On days you ${what}, your mind averaged <strong>${avg(withV).toFixed(1)}</strong> on settledness, compared with <strong>${avg(without).toFixed(1)}</strong> on days you didn't.</li>`;
  };
  const pats = [compare(sitDays, 'sat'), compare(presDays, 'logged a present moment')].filter(Boolean);

  const words = days.map((d) => s.checkins[d]?.word).filter(Boolean).slice(-8);

  return `
    <section class="tiles">
      <div class="tile"><span class="tile-n">${sits14.length}</span><span class="tile-l">sits</span></div>
      <div class="tile"><span class="tile-n">${Math.round(sits14.reduce((a, b) => a + b.minutes, 0))}</span><span class="tile-l">minutes</span></div>
      <div class="tile"><span class="tile-n">${urges14.length}</span><span class="tile-l">urges noticed</span></div>
      <div class="tile"><span class="tile-n">${presence14.length}</span><span class="tile-l">present moments</span></div>
    </section>
    <p class="muted small center">Last 14 days</p>

    <section class="card">
      <h2>Settled mind</h2>
      <p class="muted small">From your check-ins. 1 is scattered, 5 is settled.</p>
      ${settled.some((v) => v != null)
        ? lineChart({ days, values: settled, labelFn: label, tipFn: (d, v) => `${fmtShort(d)}: ${v == null ? 'no check-in' : `${v} of 5`}` })
        : '<p class="empty">Check in on the Today page and your line will show up here.</p>'}
    </section>

    <section class="card">
      <h2>Minutes sat</h2>
      ${sitVals.some(Boolean)
        ? barChart({ days, values: sitVals, labelFn: label, tipFn: (d, v) => `${fmtShort(d)}: ${v ? fmtMin(v) : 'no sit'}` })
        : '<p class="empty">Your sits will show up here.</p>'}
    </section>

    ${words.length ? `<section class="card"><h2>Your words lately</h2><div class="chips">${words.map((w) => `<span class="chip static">${esc(w)}</span>`).join('')}</div></section>` : ''}

    <section class="card soft">
      <h2>What seems to help</h2>
      ${pats.length ? `<ul class="pats">${pats.join('')}</ul>` : '<p class="small">After a couple of weeks of check-ins, simple patterns will show up here, like whether sitting lines up with a more settled mind.</p>'}
      <p class="muted small">This isn't science. It's just paying attention.</p>
    </section>`;
}

function journal(s) {
  const t = dayKey();
  const idx = (hashStr(t) + ui.promptOffset) % JOURNAL_PROMPTS.length;
  const prompt = JOURNAL_PROMPTS[idx];
  const entries = [...s.journal].sort((a, b) => b.ts - a.ts);
  return `
    <section class="card">
      <p class="eyebrow">Tonight's question</p>
      <h2 class="prompt">${esc(prompt)}</h2>
      <textarea name="entry" rows="5" placeholder="A few lines is plenty.">${esc(ui.draft)}</textarea>
      <div class="row mt">
        <button class="btn primary" data-action="save-entry" data-prompt="${esc(prompt)}">Save</button>
        <button class="btn ghost" data-action="next-prompt">Different question</button>
      </div>
    </section>
    ${entries.length ? `<section class="card"><h2>Past entries</h2>
      ${entries.slice(0, 30).map((j) => `<details class="past">
        <summary><strong>${esc(fmtShort(j.day))}</strong> <span class="muted small">· ${esc(j.prompt)}</span></summary>
        <p class="pre">${esc(j.text)}</p>
        <button class="link small danger" data-action="del-entry" data-id="${j.id}">Delete</button>
      </details>`).join('')}
    </section>` : ''}`;
}

function map(s) {
  return `
    <section class="card">
      <h2>What I know brings me happiness</h2>
      <p class="muted small">You already know what works for you. Keep it written here for the days you forget. These also show up as intentions on Today and as alternatives when you pause.</p>
      <ul class="hlist">
        ${s.profile.happiness.map((h, i) => `<li><span>${esc(h)}</span><button class="icon-x" data-action="del-h" data-i="${i}" aria-label="Remove ${esc(h)}">×</button></li>`).join('')}
      </ul>
      <div class="row"><input name="new-h" maxlength="60" placeholder="Add something…"><button class="btn" data-action="add-h">Add</button></div>
    </section>
    <section class="card">
      <h2>My why</h2>
      <p class="muted small">This shows up when you pause on an urge. Write it in your own words.</p>
      <textarea name="why" rows="5">${esc(s.profile.why)}</textarea>
      <button class="btn mt" data-action="save-why">Save</button>
    </section>`;
}

export function render(root, ctx) {
  const { store } = ctx;
  const s = store.state;
  const tabs = [['insights', 'Insights'], ['journal', 'Journal'], ['map', 'Happiness map']];
  const body = ui.tab === 'journal' ? journal(s) : ui.tab === 'map' ? map(s) : insights(s);

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Reflect</p>
      <h1>Look back, gently.</h1>
    </header>
    <div class="seg tabs-seg">${tabs.map(([k, l]) => `<button type="button" class="seg-btn ${ui.tab === k ? 'on' : ''}" data-action="tab" data-v="${k}">${l}</button>`).join('')}</div>
    ${body}`;

  bindCharts(root);

  root.oninput = (e) => { if (e.target.name === 'entry') ui.draft = e.target.value; };
  root.onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.name === 'new-h') root.querySelector('[data-action="add-h"]').click();
  };
  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'tab') { ui.tab = el.dataset.v; ctx.rerender(); }
    else if (a === 'next-prompt') { ui.promptOffset++; ctx.rerender(); }
    else if (a === 'save-entry') {
      const text = root.querySelector('[name="entry"]').value.trim();
      if (!text) { toast('Write a line or two first.'); return; }
      store.update((st) => st.journal.push({ id: uid(), ts: Date.now(), day: dayKey(), prompt: el.dataset.prompt, text }));
      ui.draft = '';
      toast('Saved. Thank you for looking.');
      ctx.rerender();
    } else if (a === 'del-entry') {
      if (!confirm('Delete this entry?')) return;
      store.update((st) => { st.journal = st.journal.filter((j) => j.id !== el.dataset.id); });
      ctx.rerender();
    } else if (a === 'add-h') {
      const v = root.querySelector('[name="new-h"]').value.trim();
      if (!v) return;
      store.update((st) => st.profile.happiness.push(v));
      ctx.rerender();
    } else if (a === 'del-h') {
      store.update((st) => st.profile.happiness.splice(Number(el.dataset.i), 1));
      ctx.rerender();
    } else if (a === 'save-why') {
      const v = root.querySelector('[name="why"]').value.trim();
      store.update((st) => { st.profile.why = v; });
      toast('Saved.');
    }
  };
  return () => { root.onkeydown = null; };
}
