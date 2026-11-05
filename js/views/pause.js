import { dayKey, keyOfTs, addDays } from '../lib/dates.js';
import { esc, uid, toast, plural, shuffle } from '../lib/util.js';
import { REACHING_FOR, UNDERNEATH, RAIN } from '../lib/content.js';

// A short guided pause for when you catch yourself reaching for the phone,
// YouTube, the news, or another AI project. Noticing is the win.

const SURF_SECS = 90;
const ui = { step: 'start', target: null, feeling: null, surfStart: null, lapsed: false, result: null };

const reset = () => Object.assign(ui, { step: 'start', target: null, feeling: null, surfStart: null, lapsed: false, result: null });
const labelOf = (list, id) => list.find((x) => x.id === id)?.label || id;

function patterns(s) {
  const since = addDays(dayKey(), -29);
  const recent = s.urges.filter((u) => keyOfTs(u.ts) >= since);
  if (recent.length < 3) return '';
  const count = (key, list) => {
    const m = {};
    recent.forEach((u) => { if (u[key]) m[u[key]] = (m[u[key]] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([id, n]) => ({ label: labelOf(list, id), n }));
  };
  const bars = (rows) => {
    const max = Math.max(...rows.map((r) => r.n));
    return rows.map((r) => `<div class="hbar"><span class="hbar-label">${esc(r.label)}</span><span class="hbar-track"><span class="hbar-fill" style="width:${(r.n / max) * 100}%"></span></span><span class="hbar-n">${r.n}</span></div>`).join('');
  };
  const out = { redirected: 0, chose: 0, lapsed: 0 };
  recent.forEach((u) => { out[u.outcome] = (out[u.outcome] || 0) + 1; });
  return `<section class="card">
    <h2>Your patterns, last 30 days</h2>
    <p class="muted small">${plural(recent.length, 'urge')} noticed. ${out.redirected} redirected, ${out.chose} chosen on purpose, ${out.lapsed} noticed afterward. All of these count.</p>
    <p class="field-label">Reaching for</p>${bars(count('target', REACHING_FOR))}
    <p class="field-label">What was underneath</p>${bars(count('feeling', UNDERNEATH))}
  </section>`;
}

export function render(root, ctx) {
  const { store } = ctx;
  const s = store.state;
  const t = dayKey();
  const todayCount = s.urges.filter((u) => keyOfTs(u.ts) === t).length;
  let body = '';
  let iv = null;

  const chips = (list, action, cur) =>
    `<div class="chips">${list.map((x) => `<button type="button" class="chip ${cur === x.id ? 'on' : ''}" data-action="${action}" data-v="${x.id}">${esc(x.label)}</button>`).join('')}</div>`;

  if (ui.step === 'start') {
    body = `
      <section class="card">
        <h2>What are you reaching for?</h2>
        ${chips(REACHING_FOR, 'target', ui.target)}
        <button class="link small mt" data-action="log-after">It already got me. Log it afterward.</button>
      </section>
      <section class="card soft why">
        <p class="eyebrow">Remember why</p>
        <p>${esc(s.profile.why)}</p>
      </section>`;
  } else if (ui.step === 'feeling') {
    body = `
      <section class="card">
        <h2>What's underneath it?</h2>
        <p class="muted small">Take a breath and feel for it. There's usually something.</p>
        ${chips(UNDERNEATH, 'feeling', ui.feeling)}
        <div class="row mt">
          ${ui.lapsed ? '' : '<button class="btn primary" data-action="to-surf">Ride the wave</button>'}
          <button class="btn ${ui.lapsed ? 'primary' : 'ghost'}" data-action="${ui.lapsed ? 'save-lapsed' : 'to-choose'}">${ui.lapsed ? 'Log it' : 'Skip to choosing'}</button>
        </div>
      </section>`;
  } else if (ui.step === 'surf') {
    if (!ui.surfStart) ui.surfStart = Date.now();
    body = `
      <section class="card surf">
        <div class="wave" aria-hidden="true">
          <svg viewBox="0 0 400 80" preserveAspectRatio="none"><path class="wave-a" d="M0 40 Q 50 10 100 40 T 200 40 T 300 40 T 400 40 V80 H0Z"/><path class="wave-b" d="M0 50 Q 50 25 100 50 T 200 50 T 300 50 T 400 50 V80 H0Z"/></svg>
        </div>
        <p class="eyebrow" id="rain-k">${RAIN[0].k}</p>
        <p class="rain-t" id="rain-t">${esc(RAIN[0].t)}</p>
        <div class="progress"><span id="surf-bar"></span></div>
        <p class="muted small center" id="surf-left">Stay with it for a moment. Urges rise, crest, and pass.</p>
        <button class="btn primary wide mt" data-action="to-choose">The wave has passed</button>
      </section>`;
  } else if (ui.step === 'choose') {
    const ideas = shuffle(s.profile.happiness).slice(0, 3);
    body = `
      <section class="card">
        <h2>What now?</h2>
        <p class="muted small">Any of these is fine. You're choosing instead of being pulled, and that's the point.</p>
        <p class="field-label">Do something else instead</p>
        <div class="chips">
          ${ideas.map((h) => `<button type="button" class="chip" data-action="redirect" data-v="${esc(h)}">${esc(h)}</button>`).join('')}
          <button type="button" class="chip" data-action="redirect" data-v="A few breaths">A few breaths</button>
          <button type="button" class="chip" data-action="redirect" data-v="The hard thing I was avoiding">The thing I was avoiding</button>
        </div>
        <p class="field-label">Or choose it on purpose, with a limit</p>
        <div class="seg">
          ${[5, 15, 30].map((m) => `<button type="button" class="seg-btn" data-action="chose" data-v="${m}">${m} min</button>`).join('')}
        </div>
        <p class="muted small">If you choose it, really enjoy it. No guilt. Set a timer on your phone so the door's there when you want it.</p>
      </section>`;
  } else if (ui.step === 'done') {
    const weekCount = s.urges.filter((u) => keyOfTs(u.ts) >= addDays(t, -6)).length;
    body = `
      <section class="card done-card">
        <p class="eyebrow">Noticed</p>
        <h2>${esc(ui.result || 'That counts.')}</h2>
        <p class="muted">${plural(weekCount, 'urge')} noticed this week. Each one is a rep, and every rep makes the next pause a little easier.</p>
        <button class="btn primary" data-action="reset">Done</button>
      </section>`;
  }

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Pause</p>
      <h1>Caught yourself reaching?</h1>
      <p class="lede">That's the practice. Noticing is the win. ${todayCount ? `(${plural(todayCount, 'time')} today.)` : ''}</p>
    </header>
    ${ui.step !== 'start' && ui.step !== 'done' ? '<button class="link small back" data-action="reset">‹ Start over</button>' : ''}
    ${body}
    ${ui.step === 'start' ? patterns(s) : ''}
  `;

  if (ui.step === 'surf') {
    const bar = root.querySelector('#surf-bar');
    const k = root.querySelector('#rain-k');
    const tx = root.querySelector('#rain-t');
    const left = root.querySelector('#surf-left');
    let shown = 0;
    const tick = () => {
      const el = (Date.now() - ui.surfStart) / 1000;
      const pct = Math.min(1, el / SURF_SECS);
      bar.style.width = `${pct * 100}%`;
      const idx = Math.min(RAIN.length - 1, Math.floor(el / (SURF_SECS / RAIN.length)));
      if (idx !== shown) {
        shown = idx;
        k.textContent = RAIN[idx].k;
        tx.textContent = RAIN[idx].t;
      }
      if (pct >= 1) {
        left.textContent = 'Notice where the urge is now. Bigger, smaller, or gone?';
        clearInterval(iv);
      }
    };
    tick();
    iv = setInterval(tick, 500);
  }

  const save = (outcome, detail, msg) => {
    store.update((st) => st.urges.push({ id: uid(), ts: Date.now(), target: ui.target, feeling: ui.feeling, outcome, detail }));
    ui.result = msg;
    ui.step = 'done';
    ctx.rerender();
  };

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'target') { ui.target = el.dataset.v; ui.step = 'feeling'; ctx.rerender(); }
    else if (a === 'log-after') { ui.lapsed = true; toast('Pick what it was. No judgment.'); ctx.rerender(); }
    else if (a === 'feeling') { ui.feeling = ui.feeling === el.dataset.v ? null : el.dataset.v; ctx.rerender(); }
    else if (a === 'to-surf') { ui.step = 'surf'; ui.surfStart = null; ctx.rerender(); }
    else if (a === 'to-choose') { ui.step = 'choose'; ctx.rerender(); }
    else if (a === 'save-lapsed') save('lapsed', null, 'Noticing afterward still counts. Next time you might catch it a little sooner.');
    else if (a === 'redirect') save('redirected', el.dataset.v, `${el.dataset.v}. Nice choice.`);
    else if (a === 'chose') save('chose', Number(el.dataset.v), `${el.dataset.v} minutes, on purpose. Enjoy it.`);
    else if (a === 'reset') { reset(); ctx.rerender(); }
  };

  return () => clearInterval(iv);
}
