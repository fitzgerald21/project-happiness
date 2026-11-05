import { dayKey, addDays, diffDays, fmtShort } from '../lib/dates.js';
import { esc, uid, toast } from '../lib/util.js';
import { EXPERIMENT_TEMPLATES } from '../lib/content.js';

// ---------- helpers (also used by Today) ----------

export const expDayIndex = (e, t = dayKey()) => diffDays(e.start, t) + 1;
export const isOver = (e, t = dayKey()) => expDayIndex(e, t) > e.days;
export const activeExperiments = (s, t = dayKey()) =>
  s.experiments.filter((e) => e.status === 'active' && expDayIndex(e, t) >= 1 && !isOver(e, t));

export function checkButtons(e, day) {
  const cur = e.checks[day];
  const b = (v, label) =>
    `<button type="button" class="seg-btn ${cur === v ? 'on' : ''} v-${v}" data-action="exp-check" data-id="${e.id}" data-day="${day}" data-v="${v}" aria-pressed="${cur === v}">${label}</button>`;
  return `<div class="seg small">${b('yes', 'Kept it')}${b('partly', 'Partly')}${b('no', 'Not today')}</div>`;
}

function dots(e, t) {
  return `<div class="dots" role="list">${Array.from({ length: e.days }, (_, i) => {
    const day = addDays(e.start, i);
    const st = e.checks[day] || '';
    const future = day > t;
    const label = `${fmtShort(day)}: ${st === 'yes' ? 'kept it' : st === 'partly' ? 'partly' : st === 'no' ? 'not that day' : future ? 'ahead' : 'not marked'}`;
    return `<button type="button" role="listitem" class="dot ${st} ${future ? 'future' : ''} ${day === t ? 'today' : ''}" ${future ? 'disabled' : ''} data-action="cycle" data-id="${e.id}" data-day="${day}" aria-label="${esc(label)}" title="${esc(label)}"></button>`;
  }).join('')}</div>`;
}

function keptCount(e) {
  const v = Object.values(e.checks);
  return { yes: v.filter((x) => x === 'yes').length, partly: v.filter((x) => x === 'partly').length };
}

// ---------- view ----------

const ui = { creating: false, draft: null, reflecting: null };

const blankDraft = (title = '') => ({ title, days: 7, why: '', ifSlip: '', startTomorrow: false });

export function render(root, ctx) {
  const { store } = ctx;
  const s = store.state;
  const t = dayKey();

  const active = s.experiments.filter((e) => e.status === 'active');
  const past = s.experiments.filter((e) => e.status !== 'active').sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

  const activeHtml = active
    .map((e) => {
      const di = expDayIndex(e, t);
      const over = isOver(e, t);
      const notYet = di < 1;
      const reflecting = ui.reflecting === e.id;
      const k = keptCount(e);
      let body;
      if (reflecting || over) {
        body = `
          <div class="reflect-box">
            <p class="eyebrow">${over ? 'Complete' : 'Opening the door early'}</p>
            <p>${over ? `You did ${e.days} days of this. However it went, you learned something.` : "That's allowed. Ending something on purpose is very different from drifting away from it."}</p>
            <label class="field"><span>What did you notice?</span>
              <textarea name="reflection" rows="3" placeholder="How did it feel? What surprised you? What did you miss, or not miss?"></textarea>
            </label>
            <p class="muted small">What now?</p>
            <div class="stack">
              <button class="btn primary" data-action="end" data-id="${e.id}" data-how="kept">${over ? `Do another ${e.days} days` : `Start a fresh ${e.days} days from today`}</button>
              <button class="btn" data-action="end" data-id="${e.id}" data-how="lighter">Keep a lighter version</button>
              <button class="btn" data-action="end" data-id="${e.id}" data-how="released">Let it go. I got what I needed.</button>
              ${!over ? `<button class="btn ghost" data-action="cancel-reflect">Never mind, keep going</button>` : ''}
            </div>
          </div>`;
      } else if (notYet) {
        body = `<p class="muted">Starts ${fmtShort(e.start)}.</p>`;
      } else {
        body = `
          ${dots(e, t)}
          <p class="small muted">Today:</p>
          ${checkButtons(e, t)}
          ${e.checks[t] === 'no' ? `<p class="slip">${e.ifSlip ? `Your plan for this: <em>${esc(e.ifSlip)}</em>` : "That's data, not failure. Nothing resets. Pick it back up whenever you're ready."}</p>` : ''}
          <button class="link small" data-action="reflect" data-id="${e.id}">Open the door early</button>`;
      }
      return `<article class="card exp">
        <div class="card-head"><h3>${esc(e.title)}</h3><span class="pill">${notYet ? 'soon' : over ? 'done' : `day ${di}/${e.days}`}</span></div>
        ${e.why ? `<p class="muted small">Why: ${esc(e.why)}</p>` : ''}
        ${!notYet && !over && !reflecting ? `<p class="muted small">${k.yes} kept${k.partly ? `, ${k.partly} partly` : ''}. Tap a dot to change it.</p>` : ''}
        ${body}
      </article>`;
    })
    .join('');

  const d = ui.draft || blankDraft();
  const createHtml = ui.creating
    ? `<section class="card">
        <h2>A new experiment</h2>
        <p class="muted small">Start with something to try. Pick one or write your own.</p>
        <div class="chips">${EXPERIMENT_TEMPLATES.map((x) => `<button type="button" class="chip ${d.title === x ? 'on' : ''}" data-action="template" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <label class="field mt"><span>The experiment</span><input name="title" maxlength="80" value="${esc(d.title)}" placeholder="e.g. No YouTube"></label>
        <p class="field-label">How long? Short is good. You can always extend it.</p>
        <div class="seg">${[3, 7, 14, 21, 30].map((n) => `<button type="button" class="seg-btn ${d.days === n ? 'on' : ''}" data-action="days" data-v="${n}">${n} days</button>`).join('')}</div>
        <label class="field mt"><span>Why I'm trying it (optional)</span><input name="why" maxlength="140" value="${esc(d.why)}" placeholder="So my evenings feel like mine again"></label>
        <label class="field"><span>If I slip, I'll… (optional)</span><input name="ifSlip" maxlength="140" value="${esc(d.ifSlip)}" placeholder="Notice it without drama and start again next moment"></label>
        <label class="check"><input type="checkbox" name="startTomorrow" ${d.startTomorrow ? 'checked' : ''}> Start tomorrow instead of today</label>
        <div class="row mt">
          <button class="btn primary" data-action="create">Start it</button>
          <button class="btn ghost" data-action="cancel-create">Cancel</button>
        </div>
      </section>`
    : `<button class="btn primary wide" data-action="new">+ New experiment</button>`;

  const pastHtml = past.length
    ? `<section class="card">
        <h2>Past experiments</h2>
        ${past
          .map((e) => {
            const k = keptCount(e);
            const how = { kept: 'Kept going', lighter: 'Kept a lighter version', released: 'Let it go' }[e.status] || '';
            return `<details class="past">
              <summary><strong>${esc(e.title)}</strong> <span class="muted small">· ${fmtShort(e.start)} · ${k.yes}/${e.days} kept</span></summary>
              <p class="small">${esc(how)}</p>
              ${e.reflection ? `<blockquote>${esc(e.reflection)}</blockquote>` : ''}
            </details>`;
          })
          .join('')}
      </section>`
    : '';

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Experiments</p>
      <h1>Boxes with doors.</h1>
      <p class="lede">These aren't rules. They're experiments you choose. You pick the box, how long it lasts, and where the door is. Sometimes stepping away completely for a while is what makes it work. When it ends, you decide what to keep.</p>
    </header>

    <section class="card soft">
      <p class="small"><strong>The middle way.</strong> If it's too tight it snaps, and if it's too loose nothing happens. Short and specific usually works best. Missing a day doesn't reset anything. It's just one more dot.</p>
    </section>

    ${activeHtml}
    ${createHtml}
    ${pastHtml}
  `;

  const readDraft = () => {
    const q = (n) => root.querySelector(`[name="${n}"]`);
    if (!q('title')) return;
    ui.draft = {
      ...ui.draft,
      title: q('title').value,
      why: q('why').value,
      ifSlip: q('ifSlip').value,
      startTomorrow: q('startTomorrow').checked,
    };
  };

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'new') {
      ui.creating = true;
      ui.draft = blankDraft();
      ctx.rerender();
    } else if (a === 'cancel-create') {
      ui.creating = false;
      ctx.rerender();
    } else if (a === 'template') {
      readDraft();
      ui.draft.title = el.dataset.v;
      ctx.rerender();
    } else if (a === 'days') {
      readDraft();
      ui.draft.days = Number(el.dataset.v);
      ctx.rerender();
    } else if (a === 'create') {
      readDraft();
      const dd = ui.draft;
      if (!dd.title.trim()) { toast('Give it a name first.'); return; }
      store.update((st) => st.experiments.push({
        id: uid(),
        title: dd.title.trim(),
        why: dd.why.trim(),
        ifSlip: dd.ifSlip.trim(),
        days: dd.days,
        start: dd.startTomorrow ? addDays(t, 1) : t,
        checks: {},
        status: 'active',
        createdAt: Date.now(),
      }));
      ui.creating = false;
      ui.draft = null;
      toast('Started. Hold it lightly.');
      ctx.rerender();
    } else if (a === 'exp-check') {
      const { id, v, day } = el.dataset;
      store.update((st) => {
        const ex = st.experiments.find((x) => x.id === id);
        if (ex.checks[day] === v) delete ex.checks[day];
        else ex.checks[day] = v;
      });
      ctx.rerender();
    } else if (a === 'cycle') {
      const { id, day } = el.dataset;
      const order = [undefined, 'yes', 'partly', 'no'];
      store.update((st) => {
        const ex = st.experiments.find((x) => x.id === id);
        const next = order[(order.indexOf(ex.checks[day]) + 1) % order.length];
        if (next) ex.checks[day] = next;
        else delete ex.checks[day];
      });
      ctx.rerender();
    } else if (a === 'reflect') {
      ui.reflecting = el.dataset.id;
      ctx.rerender();
    } else if (a === 'cancel-reflect') {
      ui.reflecting = null;
      ctx.rerender();
    } else if (a === 'end') {
      const { id, how } = el.dataset;
      const reflection = el.closest('.reflect-box').querySelector('[name="reflection"]').value.trim();
      const ex = s.experiments.find((x) => x.id === id);
      store.update((st) => {
        const x = st.experiments.find((y) => y.id === id);
        x.status = how;
        x.reflection = reflection;
        x.endedAt = Date.now();
        if (how === 'kept') {
          st.experiments.push({
            id: uid(), title: x.title, why: x.why, ifSlip: x.ifSlip, days: x.days,
            start: t, checks: {}, status: 'active', createdAt: Date.now(),
          });
        }
      });
      ui.reflecting = null;
      if (how === 'lighter') {
        ui.creating = true;
        ui.draft = { ...blankDraft(`Lighter: ${ex.title}`), why: ex.why, ifSlip: ex.ifSlip };
        toast('Adjust it however feels right.');
      } else if (how === 'kept') {
        toast('Another round. Same box, same door.');
      } else {
        toast('Released. Thanks for trying it.');
      }
      ctx.rerender();
    }
  };
}
