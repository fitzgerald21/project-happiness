// The six preparation steps before a guided sit: motivation, goal, expectations, diligence, distractions, posture.
import { esc } from '../lib/util.js';
import { PREP_STEPS } from '../content/concepts.js';

const GOALS = {
  0: ['Sit for the full time', 'Return gently every time'],
  1: ['Sit for the full time, whatever happens', "Come back every time I notice I've drifted"],
  2: ['Enjoy every moment of noticing', 'Get to ten without losing count', 'Return gently, without scolding'],
  3: ['Check in before forgetting happens', 'Notice the pauses between breaths', 'Catch sleepiness early'],
  4: ['Keep the breath in the foreground', 'Correct dullness the moment I notice it', 'Let memories pass without following them'],
  5: ['Keep the breath as vivid at the end as at the start', 'Scan slowly and thoroughly'],
  6: ['Give subtle distractions no attention', 'Stay with whole-body breathing'],
  7: ['Experiment with letting go of effort', 'Investigate the finest details'],
  8: ['Sit without effort', 'Let everything come and go'],
  9: ['Let joy settle by itself', 'Sit without effort'],
  10: ['Simply rest'],
};
const HOLD_MS = 2400;
const C = 2 * Math.PI * 52;

export function openPrep(ctx, host, script, onDone, onCancel) {
  const st = { i: 0, motivation: '', goal: '', released: false, committed: false, aside: [], posture: new Set() };
  let raf = 0, holdStart = 0;
  const result = () => ({ motivation: st.motivation, goal: st.goal });

  function chips(options, value, field) {
    const custom = value && !options.includes(value) ? value : '';
    return `<div class="chips">${options.map((o) => `<button type="button" class="chip ${value === o ? 'on' : ''}" data-set="${field}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      <input class="mt" data-own="${field}" value="${esc(custom)}" placeholder="In my own words…">`;
  }
  function body(step) {
    if (step.key === 'motivation') return chips(step.options, st.motivation, 'motivation');
    if (step.key === 'goal') return chips(GOALS[script.stage] || GOALS[0], st.goal, 'goal');
    if (step.key === 'expectations') return `
      <div class="release">
        <button type="button" class="release-btn ${st.released ? 'done' : ''}" id="hold" aria-label="Hold to let go of expectations">
          <svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" class="track"/><circle cx="60" cy="60" r="52" class="ring-fill" id="holdRing" stroke-dasharray="${C}" stroke-dashoffset="${st.released ? 0 : C}"/></svg>
          <span id="holdWord">${st.released ? 'Let go' : 'Hold'}</span>
        </button>
        <p class="muted small">${st.released ? 'Whatever happens in this sit is fine.' : '"It should be calm." "I should be better at this by now." Hold, then let them go.'}</p>
      </div>`;
    if (step.key === 'diligence') return `<button type="button" class="commit ${st.committed ? 'on' : ''}" data-act="commit" aria-pressed="${st.committed}"><span class="commit-mark">${st.committed ? '✓' : ''}</span>I'll sit until the closing bell, however it goes.</button>`;
    if (step.key === 'distractions') return `
      <div class="row"><input id="asideIn" placeholder="e.g. tomorrow's meeting"><button class="btn" data-act="aside">Set aside</button></div>
      <div class="aside-box">${st.aside.length ? st.aside.map((d) => `<span class="aside-item">${esc(d)}</span>`).join('') : '<span class="muted small">Nothing set aside yet. That\'s fine too.</span>'}</div>
      ${st.aside.length ? '<p class="muted small">These will wait for you. You can pick them up after the bell.</p>' : ''}`;
    return `<div class="checklist">${step.options.map((o, k) => `<button type="button" class="${st.posture.has(k) ? 'on' : ''}" data-posture="${k}" aria-pressed="${st.posture.has(k)}"><span class="tick">${st.posture.has(k) ? '✓' : ''}</span>${esc(o)}</button>`).join('')}</div>`;
  }
  function render() {
    const step = PREP_STEPS[st.i], last = st.i === PREP_STEPS.length - 1;
    const ready = [!!st.motivation, !!st.goal, st.released, st.committed, true, true][st.i];
    const wait = ['Choose one to continue', 'Choose a goal to continue', 'Hold the circle to continue', 'Commit to continue'][st.i];
    host.innerHTML = `
      <div class="prep">
        <div class="prep-top">
          <button class="link" data-act="cancel">Cancel</button>
          <div class="prep-dots" aria-label="Step ${st.i + 1} of 6">${PREP_STEPS.map((s, k) => `<i class="${k === st.i ? 'on' : k < st.i ? 'done' : ''}"></i>`).join('')}</div>
          <button class="link" data-act="skip">Skip</button>
        </div>
        <div class="prep-card">
          <p class="eyebrow">${esc(script.title)} · ${Math.round(script.segments.reduce((a, s) => a + s.dur, 0) / 60)} min · ${st.i + 1} of 6</p>
          <h2>${esc(step.prompt)}</h2>
          <p class="muted">${esc(step.hint)}</p>
          ${body(step)}
        </div>
        <div class="prep-actions">
          ${st.i > 0 ? '<button class="btn ghost" data-act="back">Back</button>' : ''}
          <button class="btn primary" data-act="next" ${ready ? '' : 'disabled'}>${last ? 'Begin the sit' : ready ? 'Continue' : wait}</button>
        </div>
      </div>`;
    const hold = host.querySelector('#hold');
    if (hold && !st.released) {
      const stop = () => { cancelAnimationFrame(raf); holdStart = 0; if (!st.released) { host.querySelector('#holdRing')?.setAttribute('stroke-dashoffset', C); const w = host.querySelector('#holdWord'); if (w) w.textContent = 'Hold'; } };
      const loop = () => {
        if (!holdStart) return;
        const v = Math.min(1, (performance.now() - holdStart) / HOLD_MS);
        host.querySelector('#holdRing')?.setAttribute('stroke-dashoffset', C * (1 - v));
        if (v < 1) raf = requestAnimationFrame(loop); else { holdStart = 0; st.released = true; render(); }
      };
      hold.onpointerdown = () => { holdStart = performance.now(); host.querySelector('#holdWord').textContent = 'Keep holding…'; loop(); };
      hold.onpointerup = hold.onpointerleave = hold.onpointercancel = stop;
      hold.oncontextmenu = (e) => e.preventDefault();
    }
  }
  host.onclick = (e) => {
    const set = e.target.closest('[data-set]');
    if (set) { st[set.dataset.set] = set.dataset.v; return render(); }
    const p = e.target.closest('[data-posture]');
    if (p) { const k = Number(p.dataset.posture); st.posture.has(k) ? st.posture.delete(k) : st.posture.add(k); return render(); }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'cancel') { done(); onCancel(); }
    else if (act === 'skip') { done(); onDone(result()); }
    else if (act === 'back') { st.i--; render(); }
    else if (act === 'commit') { st.committed = !st.committed; render(); }
    else if (act === 'aside') { const v = host.querySelector('#asideIn').value.trim(); if (v) st.aside.push(v); render(); }
    else if (act === 'next') { if (st.i === PREP_STEPS.length - 1) { done(); onDone(result()); } else { st.i++; render(); } }
  };
  host.oninput = (e) => {
    const f = e.target.dataset?.own;
    if (!f) return;
    st[f] = e.target.value.trim();
    host.querySelectorAll(`[data-set="${f}"]`).forEach((b) => b.classList.remove('on'));
    host.querySelector('[data-act="next"]').disabled = !st[f];
    host.querySelector('[data-act="next"]').textContent = st[f] ? 'Continue' : 'Choose one to continue';
  };
  host.onkeydown = (e) => { if (e.key === 'Enter' && e.target.id === 'asideIn') host.querySelector('[data-act="aside"]').click(); };
  function done() { cancelAnimationFrame(raf); host.onclick = host.oninput = host.onkeydown = null; }
  render();
}
