import { dayKey, keyOfTs, lastNDays, fmtWeekday, fmtShort } from '../lib/dates.js';
import { esc, uid, toast, fmtMin } from '../lib/util.js';
import { BREATH_PATTERNS, REFRAMES } from '../lib/content.js';
import { bell, unlockAudio } from '../lib/audio.js';
import { keepAwake, letSleep } from '../lib/wakelock.js';

// ui survives route changes, so a sit keeps going if you peek at another tab.
const ui = {
  mode: 'sit', // sit | breathe | hard
  sitMin: null,
  breatheMin: 3,
  pattern: 'calm',
  state: 'setup', // setup | running | done
  run: null,
  lastId: null,
  hard: '',
};

const SIT_CHOICES = [1, 3, 5, 10, 15, 20, 30];
const BREATHE_CHOICES = [1, 2, 3, 5, 10];
const R = 108;
const CIRC = 2 * Math.PI * R;

const mmss = (ms) => {
  const t = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
};

function start(ctx, kind, minutes, pattern) {
  unlockAudio();
  if (ctx.store.state.settings.bell) bell();
  keepAwake();
  const total = minutes * 60000;
  ui.run = { kind, pattern, total, endAt: Date.now() + total, paused: false, remaining: total, phaseIdx: -1 };
  ui.state = 'running';
  ctx.rerender();
}

function remaining() {
  const r = ui.run;
  return r.paused ? r.remaining : r.endAt - Date.now();
}

function finish(ctx, early = false) {
  const r = ui.run;
  const elapsed = r.total - Math.max(0, remaining());
  letSleep();
  if (!early && ctx.store.state.settings.bell) bell();
  ui.run = null;
  if (elapsed < 30000) {
    ui.state = 'setup';
    toast('Stopped. Come back whenever.');
    ctx.rerender();
    return;
  }
  const rec = {
    id: uid(),
    ts: Date.now(),
    minutes: Math.round((elapsed / 60000) * 10) / 10,
    kind: r.kind,
    ...(r.pattern ? { pattern: r.pattern } : {}),
  };
  ctx.store.update((st) => st.sits.push(rec));
  ui.lastId = rec.id;
  ui.state = 'done';
  ctx.rerender();
}

function renderRunning(root, ctx) {
  const r = ui.run;
  const isBreathe = r.kind === 'breathe';
  const pat = isBreathe ? BREATH_PATTERNS[r.pattern] : null;
  root.innerHTML = `
    <section class="running">
      ${isBreathe
        ? `<div class="breath-wrap big"><div class="breath-circle" id="circle"></div></div>
           <p class="phase" id="phase">Get comfortable</p>
           <p class="muted" id="time">${mmss(remaining())}</p>`
        : `<div class="ring-wrap">
             <svg viewBox="0 0 240 240" class="ring" aria-hidden="true">
               <circle cx="120" cy="120" r="${R}" class="ring-bg"/>
               <circle cx="120" cy="120" r="${R}" class="ring-fg" id="ring" stroke-dasharray="${CIRC}" stroke-dashoffset="0"/>
             </svg>
             <div class="ring-center"><div class="big-time" id="time">${mmss(remaining())}</div><div class="muted small" id="status">${r.paused ? 'paused' : 'sitting'}</div></div>
           </div>
           <p class="muted center">Rest your attention on the breath. When you wander off, notice it and come back. That noticing is the whole practice.</p>`}
      <div class="row center mt">
        <button class="btn" data-action="toggle">${r.paused ? 'Resume' : 'Pause'}</button>
        <button class="btn ghost" data-action="end">End</button>
      </div>
      <p class="muted small center">The screen stays on while this runs.</p>
    </section>`;

  const timeEl = root.querySelector('#time');
  const ringEl = root.querySelector('#ring');
  const circle = root.querySelector('#circle');
  const phaseEl = root.querySelector('#phase');
  const statusEl = root.querySelector('#status');
  if (circle) circle.style.transform = 'scale(0.55)';

  const cycle = pat ? pat.phases.reduce((a, p) => a + p.secs, 0) : 0;
  const tick = () => {
    const rem = remaining();
    if (rem <= 0) { finish(ctx); return; }
    timeEl.textContent = mmss(rem);
    if (ringEl) ringEl.setAttribute('stroke-dashoffset', String(CIRC * (1 - rem / r.total)));
    if (pat && !r.paused) {
      const elapsed = (r.total - rem) / 1000;
      let pos = elapsed % cycle;
      let idx = 0;
      while (idx < pat.phases.length - 1 && pos >= pat.phases[idx].secs) { pos -= pat.phases[idx].secs; idx++; }
      const cycleNo = Math.floor(elapsed / cycle);
      const key = cycleNo * 10 + idx;
      if (key !== r.phaseIdx) {
        r.phaseIdx = key;
        const p = pat.phases[idx];
        const left = p.secs - pos;
        circle.style.transition = `transform ${left}s ease-in-out`;
        circle.style.transform = `scale(${p.scale})`;
        phaseEl.textContent = p.label;
      }
    }
  };
  tick();
  const iv = setInterval(tick, 200);
  const onVis = () => document.visibilityState === 'visible' && tick();
  document.addEventListener('visibilitychange', onVis);

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'toggle') {
      if (r.paused) {
        r.endAt = Date.now() + r.remaining;
        r.paused = false;
        r.phaseIdx = -1;
        keepAwake();
      } else {
        r.remaining = r.endAt - Date.now();
        r.paused = true;
        letSleep();
      }
      el.textContent = r.paused ? 'Resume' : 'Pause';
      if (statusEl) statusEl.textContent = r.paused ? 'paused' : 'sitting';
      if (phaseEl && r.paused) phaseEl.textContent = 'Paused';
    } else if (el.dataset.action === 'end') {
      finish(ctx, true);
    }
  };

  return () => {
    clearInterval(iv);
    document.removeEventListener('visibilitychange', onVis);
  };
}

function renderDone(root, ctx) {
  const rec = ctx.store.state.sits.find((x) => x.id === ui.lastId);
  root.innerHTML = `
    <section class="card done-card">
      <p class="eyebrow">Welcome back</p>
      <h1>${rec ? fmtMin(rec.minutes) : ''} of being here.</h1>
      <p class="muted">It doesn't matter how it went. You showed up, and that's the practice.</p>
      <label class="field"><span>Anything you noticed? (optional)</span>
        <textarea name="note" rows="3" placeholder="Busy mind, sleepy, a few calm moments…">${esc(rec?.note || '')}</textarea>
      </label>
      <div class="row">
        <button class="btn primary" data-action="save">Save</button>
        <button class="btn ghost" data-action="back">Done</button>
      </div>
    </section>`;
  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    if (el.dataset.action === 'save') {
      const note = root.querySelector('[name="note"]').value.trim();
      ctx.store.update((st) => {
        const x = st.sits.find((y) => y.id === ui.lastId);
        if (x) x.note = note;
      });
      toast('Saved.');
    }
    ui.state = 'setup';
    ctx.rerender();
  };
}

function renderSetup(root, ctx) {
  const s = ctx.store.state;
  if (ui.sitMin == null) ui.sitMin = s.settings.defaultSit;
  const days = lastNDays(7);
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  s.sits.forEach((x) => { const k = keyOfTs(x.ts); if (k in byDay) byDay[k] += x.minutes; });
  const weekTotal = Object.values(byDay).reduce((a, b) => a + b, 0);
  const daysSat = Object.values(byDay).filter(Boolean).length;
  const t = dayKey();

  const seg = (opts, cur, action, fmt) =>
    `<div class="seg">${opts.map((o) => `<button type="button" class="seg-btn ${cur === o ? 'on' : ''}" data-action="${action}" data-v="${o}">${fmt(o)}</button>`).join('')}</div>`;

  let body = '';
  if (ui.mode === 'sit') {
    body = `
      <section class="card">
        <h2>Just sit</h2>
        <p class="muted small">A bell at the start, a bell at the end, and silence between. Breathe, wander off, come back.</p>
        ${seg(SIT_CHOICES, ui.sitMin, 'sit-min', (m) => `${m}m`)}
        <button class="btn primary wide mt" data-action="start-sit">Begin ${ui.sitMin} minutes</button>
      </section>`;
  } else if (ui.mode === 'breathe') {
    const p = BREATH_PATTERNS[ui.pattern];
    body = `
      <section class="card">
        <h2>Breathe with the circle</h2>
        ${seg(Object.keys(BREATH_PATTERNS), ui.pattern, 'pattern', (k) => BREATH_PATTERNS[k].name)}
        <p class="muted small mt">${esc(p.desc)}</p>
        ${seg(BREATHE_CHOICES, ui.breatheMin, 'breathe-min', (m) => `${m}m`)}
        <button class="btn primary wide mt" data-action="start-breathe">Begin</button>
      </section>`;
  } else {
    body = `
      <section class="card">
        <h2>Before a hard thing</h2>
        <p class="muted small">For a presentation, a tough conversation, or that knot in your stomach before work.</p>
        <label class="field"><span>What's the hard thing? (optional)</span><input name="hard" maxlength="80" value="${esc(ui.hard)}" placeholder="The Thursday presentation"></label>
        <div class="reframes">
          ${REFRAMES.map((r) => `<div class="reframe"><strong>${esc(r.h)}</strong><p>${esc(r.b)}</p></div>`).join('')}
        </div>
        <div class="stack mt">
          <button class="btn primary" data-action="hard-sigh">2 minutes of calming sighs</button>
          <button class="btn" data-action="hard-sit">3 minutes of quiet</button>
        </div>
        <p class="muted small mt">Afterward, however it went, be as kind to yourself as you'd be to a friend who just did it.</p>
      </section>`;
  }

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Sit</p>
      <h1>Come back to the breath.</h1>
    </header>
    <div class="seg tabs-seg">
      <button type="button" class="seg-btn ${ui.mode === 'sit' ? 'on' : ''}" data-action="mode" data-v="sit">Sit</button>
      <button type="button" class="seg-btn ${ui.mode === 'breathe' ? 'on' : ''}" data-action="mode" data-v="breathe">Breathe</button>
      <button type="button" class="seg-btn ${ui.mode === 'hard' ? 'on' : ''}" data-action="mode" data-v="hard">Hard thing</button>
    </div>
    ${body}
    <section class="card">
      <div class="card-head"><h2>This week</h2><span class="muted small">${fmtMin(weekTotal)} · ${daysSat} of 7 days</span></div>
      <div class="week">
        ${days.map((d) => {
          const m = byDay[d];
          const size = m ? Math.min(34, 12 + Math.sqrt(m) * 5) : 8;
          return `<div class="week-day ${d === t ? 'today' : ''}" title="${esc(`${fmtShort(d)}: ${fmtMin(m)}`)}">
            <div class="week-dot-box"><span class="week-dot ${m ? 'on' : ''}" style="width:${size}px;height:${size}px"></span></div>
            <span class="muted small">${fmtWeekday(d)}</span>
          </div>`;
        }).join('')}
      </div>
      <p class="muted small">This isn't a streak. Whatever amount you sat is enough.</p>
    </section>`;

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    const hardInput = root.querySelector('[name="hard"]');
    if (hardInput) ui.hard = hardInput.value;
    if (a === 'mode') { ui.mode = el.dataset.v; ctx.rerender(); }
    else if (a === 'sit-min') { ui.sitMin = Number(el.dataset.v); ctx.rerender(); }
    else if (a === 'breathe-min') { ui.breatheMin = Number(el.dataset.v); ctx.rerender(); }
    else if (a === 'pattern') { ui.pattern = el.dataset.v; ctx.rerender(); }
    else if (a === 'start-sit') start(ctx, 'sit', ui.sitMin);
    else if (a === 'start-breathe') start(ctx, 'breathe', ui.breatheMin, ui.pattern);
    else if (a === 'hard-sigh') start(ctx, 'breathe', 2, 'sigh');
    else if (a === 'hard-sit') start(ctx, 'sit', 3);
  };
}

export function render(root, ctx) {
  if (ui.state === 'running' && ui.run) return renderRunning(root, ctx);
  if (ui.state === 'done') return renderDone(root, ctx);
  ui.state = 'setup';
  return renderSetup(root, ctx);
}
