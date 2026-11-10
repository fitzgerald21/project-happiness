// Path: the long view. The ten stages of sitting practice, the experiments you run on your own life,
// and the compass that says what all of it is for.
import { dayKey, addDays, fmtShort } from '../lib/dates.js';
import { esc, uid, toast, plural } from '../lib/util.js';
import { EXPERIMENT_TEMPLATES } from '../lib/content.js';
import { STAGES, MILESTONES } from '../content/stages.js';
import { HINDRANCES, FACTORS, GLOSSARY } from '../content/concepts.js';
import { allExperiments, expDayIndex, isOver, checkButtons, setCheck, dots, keptCount } from '../lib/experiments.js';

const TABS = [['', 'The stages'], ['experiments', 'Experiments'], ['compass', 'Compass']];
const ui = { creating: false, draft: null, reflecting: null, finder: null };
const blankDraft = (title = '') => ({ title, days: 7, why: '', ifSlip: '', startTomorrow: false });
const list = (items) => `<ul class="bul">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`;

// ---------- the stages ----------
function stagesView(ctx) {
  const { store } = ctx;
  const here = store.state.prefs.stage;
  const st = STAGES[here - 1];
  const mine = store.state.sessions.filter((r) => r.stage === here);
  const rated = mine.filter((r) => r.stability).slice(-5);
  const avg = (k) => (rated.reduce((a, r) => a + (r[k] || 0), 0) / rated.length).toFixed(1);
  const finder = ui.finder != null ? (() => {
    const f = STAGES[ui.finder];
    return `<section class="card">
      <p class="eyebrow">Find your stage · ${ui.finder + 1} of 10</p>
      <h2>Is this true of most of your sits?</h2>
      <p>${esc(f.mastery)}</p>
      <div class="row mt">
        <button class="btn primary" data-action="finder-yes">Yes, mostly</button>
        <button class="btn" data-action="finder-no">Not yet</button>
        <button class="link small" data-action="finder-stop">Cancel</button>
      </div>
      <p class="muted small">Be generous but honest. Most people sit at a stage or two below where they'd like to be, and that's exactly where the progress is.</p>
    </section>`;
  })() : '';
  return `
    <section class="card">
      <p class="eyebrow">You are here · ${esc(st.phase)}</p>
      <h2>Stage ${st.n}: ${esc(st.short)}</h2>
      <p>${esc(st.essence)}</p>
      <p class="muted small">${mine.length ? `${plural(mine.length, 'sit')} at this stage.${rated.length >= 3 ? ` Lately: stability ${avg('stability')}, clarity ${avg('clarity')} out of 5.` : ''}` : 'No sits at this stage yet.'} You've mastered it when: ${esc(st.mastery)}</p>
      <div class="row mt">
        <button class="btn primary" data-action="sit-stage">Sit · ${store.state.prefs.minutes} min</button>
        <a class="btn ghost" href="#/path/stage/${st.n}">Read the stage</a>
      </div>
    </section>
    ${finder || '<button class="link small" data-action="finder">Not sure this is your stage? Find it.</button>'}
    <div class="stages">
      ${STAGES.map((x) => `
        <a class="stage-row ${x.n < here ? 'past' : x.n === here ? 'here' : ''}" href="#/path/stage/${x.n}">
          <span class="stage-n">${x.n}</span>
          <span><strong>${esc(x.short)}</strong><span>${esc(x.goal)}</span></span>
        </a>
        ${MILESTONES.filter((m) => m.after === x.n).map((m) => `<div class="milestone"><b>Milestone ${m.n}: ${esc(m.title)}.</b> ${esc(m.text)}</div>`).join('')}`).join('')}
    </div>
    <section class="card">
      <h2>Five things that get in the way</h2>
      <p class="muted small">The hindrances. They show up on the cushion and at the phone alike.</p>
      ${HINDRANCES.map((h) => `<details class="tech"><summary>${esc(h.name)}</summary><p class="muted">${esc(h.feels)}</p><p>${esc(h.antidote)}</p></details>`).join('')}
    </section>
    <section class="card">
      <h2>Seven things that grow</h2>
      ${FACTORS.map((f) => `<p><strong>${esc(f.name)}.</strong> <span class="muted">${esc(f.text)}</span></p>`).join('')}
    </section>
    <section class="card">
      <h2>Words</h2>
      ${GLOSSARY.map((g) => `<details class="tech"><summary>${esc(g.term)}</summary><p>${esc(g.def)}</p></details>`).join('')}
    </section>
    <p class="muted small center">The stages follow <em>The Mind Illuminated</em> by Culadasa, Matthew Immergut and Jeremy Graves, paraphrased as a study companion. Read the book for the real teaching.</p>`;
}

function stagePage(ctx, n) {
  const st = STAGES[Math.min(10, Math.max(1, n)) - 1];
  const here = ctx.store.state.prefs.stage === st.n;
  return `
    <a class="link small" href="#/path">‹ All stages</a>
    <header class="page-head" style="padding-top:8px">
      <p class="eyebrow">Stage ${st.n} · ${esc(st.phase)}</p>
      <h1>${esc(st.title)}</h1>
      <p class="lede">${esc(st.essence)}</p>
    </header>
    <div class="row">
      <button class="btn primary" data-action="sit-this" data-v="${st.n}">Sit this stage</button>
      ${here ? '<span class="stage-pill">This is your stage</span>' : `<button class="btn" data-action="set-stage" data-v="${st.n}">Make this my stage</button>`}
    </div>
    <section class="card">
      <p class="field-label">The goal</p><p>${esc(st.goal)}</p>
      <p class="field-label mt">What gets in the way</p>${list(st.obstacles)}
      <p class="field-label mt">What you're learning</p>${list(st.skills)}
      <p class="field-label mt">You've mastered it when</p><p>${esc(st.mastery)}</p>
    </section>
    <section class="card">${st.overview.map((p) => `<p>${esc(p)}</p>`).join('')}</section>
    <section class="card">
      <h2>Techniques</h2>
      ${st.techniques.map((t) => `<details class="tech">
        <summary>${esc(t.name)}</summary>
        <p class="muted">${esc(t.oneLine)}</p>
        <ol>${t.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <p class="small"><strong>Why it works.</strong> ${esc(t.why)}</p>
        ${t.drill ? `<button class="btn" data-action="drill" data-v="${t.drill}">Try it now</button>` : ''}
      </details>`).join('')}
    </section>
    <section class="card"><h2>Tips</h2>${list(st.tips)}<h2 class="mt">Pitfalls</h2>${list(st.pitfalls)}</section>
    <section class="card soft"><p class="field-label">You're likely here if</p>${list(st.signs)}</section>
    <div class="row" style="justify-content:space-between">
      ${st.n > 1 ? `<a class="btn ghost" href="#/path/stage/${st.n - 1}">‹ Stage ${st.n - 1}</a>` : '<span></span>'}
      ${st.n < 10 ? `<a class="btn ghost" href="#/path/stage/${st.n + 1}">Stage ${st.n + 1} ›</a>` : ''}
    </div>`;
}

// ---------- experiments ----------
function experimentsView(ctx) {
  const { store } = ctx;
  const t = dayKey();
  const all = allExperiments(store);
  const active = all.filter((e) => e.status === 'active');
  const past = all.filter((e) => e.status !== 'active').sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));
  const activeHtml = active.map((e) => {
    const di = expDayIndex(e, t), over = isOver(e, t), notYet = di < 1, reflecting = ui.reflecting === e.id, k = keptCount(e);
    let body;
    if (reflecting || over) {
      body = `<div class="reflect-box">
        <p class="eyebrow">${over ? 'Complete' : 'Opening the door early'}</p>
        <p>${over ? `You did ${e.days} days of this. However it went, you learned something.` : "That's allowed. Ending something on purpose is very different from drifting away from it."}</p>
        <label class="field"><span>What did you notice?</span><textarea name="reflection" rows="3" placeholder="How did it feel? What surprised you? What did you miss, or not miss?"></textarea></label>
        <div class="stack">
          <button class="btn primary" data-action="end" data-id="${e.id}" data-how="kept">${over ? `Do another ${e.days} days` : `Start a fresh ${e.days} days from today`}</button>
          <button class="btn" data-action="end" data-id="${e.id}" data-how="lighter">Keep a lighter version</button>
          <button class="btn" data-action="end" data-id="${e.id}" data-how="released">Let it go. I got what I needed.</button>
          ${!over ? '<button class="btn ghost" data-action="cancel-reflect">Never mind, keep going</button>' : ''}
        </div>
      </div>`;
    } else if (notYet) body = `<p class="muted">Starts ${fmtShort(e.start)}.</p>`;
    else body = `
      ${dots(e, t)}
      <p class="small muted">Today:</p>
      ${checkButtons(e, t)}
      ${e.checks?.[t] === 'no' ? `<p class="slip">${e.ifSlip ? `Your plan for this: <em>${esc(e.ifSlip)}</em>` : "That's data, not failure. Nothing resets. Pick it back up whenever you're ready."}</p>` : ''}
      <button class="link small" data-action="reflect" data-id="${e.id}">Open the door early</button>`;
    return `<article class="card">
      <div class="card-head"><h3>${esc(e.title)}</h3><span class="pill">${notYet ? 'soon' : over ? 'done' : `day ${di}/${e.days}`}</span></div>
      ${e.why ? `<p class="muted small">Why: ${esc(e.why)}</p>` : ''}
      ${!notYet && !over && !reflecting ? `<p class="muted small">${k.yes} kept${k.partly ? `, ${k.partly} partly` : ''}. Tap a dot to change it.</p>` : ''}
      ${body}
    </article>`;
  }).join('');

  const d = ui.draft || blankDraft();
  const createHtml = ui.creating ? `<section class="card">
      <h2>A new experiment</h2>
      <p class="muted small">Start with something to try. Pick one or write your own.</p>
      <div class="chips">${EXPERIMENT_TEMPLATES.map((x) => `<button type="button" class="chip ${d.title === x ? 'on' : ''}" data-action="template" data-v="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <label class="field"><span>The experiment</span><input name="title" maxlength="80" value="${esc(d.title)}" placeholder="e.g. No YouTube"></label>
      <p class="field-label">How long? Short is good. You can always extend it.</p>
      <div class="seg">${[3, 7, 14, 21, 30].map((n) => `<button type="button" class="seg-btn ${d.days === n ? 'on' : ''}" data-action="days" data-v="${n}">${n} days</button>`).join('')}</div>
      <label class="field"><span>Why I'm trying it (optional)</span><input name="why" maxlength="140" value="${esc(d.why)}" placeholder="So my evenings feel like mine again"></label>
      <label class="field"><span>If I slip, I'll… (optional)</span><input name="ifSlip" maxlength="140" value="${esc(d.ifSlip)}" placeholder="Notice it without drama and start again next moment"></label>
      <label class="check"><input type="checkbox" name="startTomorrow" ${d.startTomorrow ? 'checked' : ''}> Start tomorrow instead of today</label>
      <div class="row mt"><button class="btn primary" data-action="create">Start it</button><button class="btn ghost" data-action="cancel-create">Cancel</button></div>
    </section>` : '<button class="btn primary wide" data-action="new">+ New experiment</button>';

  const pastHtml = past.length ? `<section class="card"><h2>Past experiments</h2>
    ${past.map((e) => `<details class="past">
      <summary><strong>${esc(e.title)}</strong> <span class="muted small">· ${fmtShort(e.start)} · ${keptCount(e).yes}/${e.days} kept</span></summary>
      <p class="small">${{ kept: 'Kept going', lighter: 'Kept a lighter version', released: 'Let it go' }[e.status] || ''}</p>
      ${e.reflection ? `<blockquote>${esc(e.reflection)}</blockquote>` : ''}
    </details>`).join('')}</section>` : '';

  return `
    <section class="card soft">
      <p><strong>Boxes with doors.</strong> These aren't rules. You pick the box, how long it lasts, and where the door is. Too tight and it snaps; too loose and nothing happens. Missing a day resets nothing. It's just one more dot.</p>
    </section>
    ${activeHtml}${createHtml}${pastHtml}`;
}

// ---------- compass ----------
function compassView(ctx) {
  const p = ctx.store.state.profile;
  return `
    <section class="card">
      <h2>My why</h2>
      <p class="muted small">This shows up when you pause on an urge. Write it in your own words.</p>
      <textarea name="why" rows="5">${esc(p.why)}</textarea>
      <button class="btn mt" data-action="save-why">Save</button>
    </section>
    <section class="card">
      <h2>What I know brings me happiness</h2>
      <p class="muted small">You already know what works. Keep it here for the days you forget. These become the day's intentions, and the alternatives when you pause.</p>
      <ul class="hlist">${p.happiness.map((h, i) => `<li><span>${esc(h)}</span><button class="icon-x" data-action="del-h" data-i="${i}" aria-label="Remove ${esc(h)}">×</button></li>`).join('')}</ul>
      <div class="row"><input name="new-h" maxlength="60" placeholder="Add something…"><button class="btn" data-action="add-h">Add</button></div>
    </section>
    <section class="card">
      <h2>Who I want to be there for</h2>
      <ul class="hlist">${p.people.map((h, i) => `<li><span>${esc(h)}</span><button class="icon-x" data-action="del-p" data-i="${i}" aria-label="Remove ${esc(h)}">×</button></li>`).join('')}</ul>
      <div class="row"><input name="new-p" maxlength="40" placeholder="my wife, my baby, a friend…"><button class="btn" data-action="add-p">Add</button></div>
    </section>`;
}

export function render(root, ctx) {
  const { store } = ctx;
  const [sub, arg] = ctx.args;
  const t = dayKey();
  const isStage = sub === 'stage';
  const tab = isStage ? '' : TABS.some(([k]) => k === sub) ? sub : '';
  const body = isStage ? stagePage(ctx, Number(arg) || 1) : tab === 'experiments' ? experimentsView(ctx) : tab === 'compass' ? compassView(ctx) : stagesView(ctx);

  root.innerHTML = isStage ? `<div style="padding-top:calc(18px + env(safe-area-inset-top))">${body}</div>` : `
    <header class="page-head">
      <p class="eyebrow">Path</p>
      <h1>${tab === 'experiments' ? 'Try it and see.' : tab === 'compass' ? 'What this is for.' : 'One stage at a time.'}</h1>
    </header>
    <div class="seg subtabs">${TABS.map(([k, l]) => `<a class="seg-btn ${tab === k ? 'on' : ''}" href="#/path${k ? `/${k}` : ''}" style="text-decoration:none;text-align:center">${l}</a>`).join('')}</div>
    ${body}`;

  const readDraft = () => {
    const q = (n) => root.querySelector(`[name="${n}"]`);
    if (!q('title')) return;
    ui.draft = { ...ui.draft, title: q('title').value, why: q('why').value, ifSlip: q('ifSlip').value, startTomorrow: q('startTomorrow').checked };
  };
  const exp = (id) => store.state.experiments[id];
  const newExp = (x) => ({ id: uid(), checks: {}, status: 'active', createdAt: Date.now(), ...x });

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action, v = el.dataset.v;
    const prefs = store.state.prefs;
    if (a === 'sit-stage') ctx.startSit({ practice: 'stage', stage: prefs.stage, minutes: prefs.minutes });
    else if (a === 'sit-this') ctx.startSit({ practice: 'stage', stage: Number(v), minutes: prefs.minutes });
    else if (a === 'set-stage') { store.setPrefs({ stage: Number(v) }); toast(`Stage ${v} it is.`); ctx.rerender(); }
    else if (a === 'drill') ctx.startSit({ practice: 'drill', drill: v, scene: 'guide' });
    else if (a === 'finder') { ui.finder = 0; ctx.rerender(); }
    else if (a === 'finder-stop') { ui.finder = null; ctx.rerender(); }
    else if (a === 'finder-yes') {
      if (ui.finder >= 9) { store.setPrefs({ stage: 10 }); ui.finder = null; } else ui.finder++;
      ctx.rerender();
    } else if (a === 'finder-no') { store.setPrefs({ stage: ui.finder + 1 }); toast(`Stage ${ui.finder + 1}. A good place to work.`); ui.finder = null; ctx.rerender(); }
    // experiments
    else if (a === 'new') { ui.creating = true; ui.draft = blankDraft(); ctx.rerender(); }
    else if (a === 'cancel-create') { ui.creating = false; ctx.rerender(); }
    else if (a === 'template') { readDraft(); ui.draft.title = v; ctx.rerender(); }
    else if (a === 'days') { readDraft(); ui.draft.days = Number(v); ctx.rerender(); }
    else if (a === 'create') {
      readDraft();
      const dd = ui.draft;
      if (!dd.title.trim()) { toast('Give it a name first.'); return; }
      store.putExperiment(newExp({ title: dd.title.trim(), why: dd.why.trim(), ifSlip: dd.ifSlip.trim(), days: dd.days, start: dd.startTomorrow ? addDays(t, 1) : t }));
      ui.creating = false; ui.draft = null;
      toast('Started. Hold it lightly.');
      ctx.rerender();
    } else if (a === 'exp-check') { setCheck(store, el.dataset.id, el.dataset.day, v); ctx.rerender(); }
    else if (a === 'cycle') {
      const order = [undefined, 'yes', 'partly', 'no'];
      const cur = exp(el.dataset.id)?.checks?.[el.dataset.day];
      const next = order[(order.indexOf(cur) + 1) % order.length];
      // setCheck toggles off when given the current value
      setCheck(store, el.dataset.id, el.dataset.day, next || cur);
      ctx.rerender();
    } else if (a === 'reflect') { ui.reflecting = el.dataset.id; ctx.rerender(); }
    else if (a === 'cancel-reflect') { ui.reflecting = null; ctx.rerender(); }
    else if (a === 'end') {
      const { id, how } = el.dataset;
      const reflection = el.closest('.reflect-box').querySelector('[name="reflection"]').value.trim();
      const x = exp(id);
      store.putExperiment({ ...x, status: how, reflection, endedAt: Date.now() });
      ui.reflecting = null;
      if (how === 'kept') {
        store.putExperiment(newExp({ title: x.title, why: x.why, ifSlip: x.ifSlip, days: x.days, start: t }));
        toast('Another round. Same box, same door.');
      } else if (how === 'lighter') {
        ui.creating = true;
        ui.draft = { ...blankDraft(`Lighter: ${x.title}`), why: x.why || '', ifSlip: x.ifSlip || '' };
        toast('Adjust it however feels right.');
      } else toast('Released. Thanks for trying it.');
      ctx.rerender();
    }
    // compass
    else if (a === 'save-why') { store.setProfile({ why: root.querySelector('[name="why"]').value.trim() }); toast('Saved.'); }
    else if (a === 'add-h' || a === 'add-p') {
      const key = a === 'add-h' ? 'happiness' : 'people';
      const val = root.querySelector(`[name="new-${a === 'add-h' ? 'h' : 'p'}"]`).value.trim();
      if (!val) return;
      store.setProfile({ [key]: [...store.state.profile[key], val] });
      ctx.rerender();
    } else if (a === 'del-h' || a === 'del-p') {
      const key = a === 'del-h' ? 'happiness' : 'people';
      store.setProfile({ [key]: store.state.profile[key].filter((_, i) => i !== Number(el.dataset.i)) });
      ctx.rerender();
    }
  };
  root.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.name === 'new-h') root.querySelector('[data-action="add-h"]').click();
    if (e.target.name === 'new-p') root.querySelector('[data-action="add-p"]').click();
  };
}
