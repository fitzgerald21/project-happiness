// After the bell: what happened, how it felt, and a way to carry it into the rest of the day.
import { esc, plural } from '../lib/util.js';
import { dayKey, keyOfTs } from '../lib/dates.js';
import { FEELS, timeline, shapeLine, fmtDur, fmtRate, levelOf } from './common.js';

const scale = (field, val, lo, hi) => `
  <div class="scale">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="scale-btn ${val === v ? 'on' : ''}" data-scale="${field}" data-v="${v}" aria-pressed="${val === v}" aria-label="${v} of 5">${v}</button>`).join('')}</div>
  <div class="scale-ends"><span>${lo}</span><span>${hi}</span></div>`;

export function levelCard(total, before) {
  const l = levelOf(total);
  const up = before != null && levelOf(before).i < l.i;
  return `<div class="level ${up ? 'up' : ''}">
    <div class="level-head"><span class="level-name">${l.name}</span><span class="muted small">${total.toLocaleString()} returns, all sittings</span></div>
    <div class="level-bar"><i style="width:${Math.round(l.frac * 100)}%"></i></div>
    <p class="muted small">${up ? `You've become ${l.name}. ` : ''}${l.next ? `${l.left.toLocaleString()} more to ${l.next}.` : 'Nothing further to reach.'}</p>
  </div>`;
}

export function openReview(ctx, host, rec, onClose) {
  const { store } = ctx;
  const t = dayKey();
  const n = rec.returns, dur = rec.dur;
  const span = dur < 60000 ? 'under a minute' : plural(Math.round(dur / 60000), 'minute');
  const todayMs = store.state.sessions.filter((r) => keyOfTs(r.start) === t).reduce((a, r) => a + r.dur, 0);
  const total = store.totalReturns();
  const guided = rec.kind === 'guided' || rec.kind === 'drill';
  const st = { feel: [], stability: null, clarity: null, settled: null };

  function render() {
    const note = host.querySelector('#sitNote')?.value ?? '';
    const shape = shapeLine(rec.entries, dur);
    host.innerHTML = `
      <div class="review"><div class="review-in">
        <div class="end-orb" aria-hidden="true"></div>
        <p class="eyebrow">${esc(rec.title || 'Welcome back')}</p>
        <h1>${n === 0 ? `You sat for ${span}.` : n === 1 ? 'You came back once.' : `You came back ${n} times.`}</h1>
        <p class="lede">${n === 0 ? 'Nothing to count this time, and nothing lost.' : `In ${span} of sitting. Every one of those was the practice.`}</p>
        <div class="tiles">
          <div class="tile"><b>${fmtDur(dur)}</b><span>time sat</span></div>
          <div class="tile"><b>${dur >= 60000 ? fmtRate(n / (dur / 60000)) : n}</b><span>${dur >= 60000 ? 'returns a minute' : 'returns'}</span></div>
          <div class="tile"><b>${fmtDur(todayMs)}</b><span>sat today in all</span></div>
        </div>
        ${n ? `<section><p class="field-label">How your sit went</p>${timeline(rec.entries, dur)}${shape ? `<p class="muted small">${shape}</p>` : ''}</section>` : ''}
        ${rec.breath ? `<p class="muted small">You traced ${rec.breath.count} breaths: about ${rec.breath.inAvg}s in, ${rec.breath.outAvg}s out.</p>` : ''}
        <section>
          <p class="field-label">How did it feel?</p>
          <div class="chips">${FEELS.map((f) => `<button type="button" class="chip ${st.feel.includes(f) ? 'on' : ''}" data-feel="${f}" aria-pressed="${st.feel.includes(f)}">${f}</button>`).join('')}</div>
        </section>
        ${guided ? `<section>
          <p class="field-label">Stability: did attention stay?</p>${scale('stability', st.stability, 'Kept wandering', 'Stayed put')}
          <p class="field-label mt">Clarity: how vivid was the breath?</p>${scale('clarity', st.clarity, 'Dull, foggy', 'Bright, clear')}
        </section>` : ''}
        <section>
          <p class="field-label">And your mind right now?</p>${scale('settled', st.settled, 'Scattered', 'Settled')}
        </section>
        <textarea id="sitNote" rows="3" placeholder="A note about this sit (optional)" aria-label="A note about this sit">${esc(note)}</textarea>
        ${levelCard(total, total - n)}
        <div class="stack mt">
          <button class="btn primary" data-act="done">Done</button>
          <button class="btn ghost" data-act="line">${store.line(t) ? "Done, and open today's page" : "Done, and write today's line"}</button>
        </div>
      </div></div>`;
  }
  function save() {
    const note = host.querySelector('#sitNote').value.trim();
    store.patchSession(rec.start, { feel: st.feel, note, stability: st.stability, clarity: st.clarity });
    if (st.settled) store.addCheck({ ts: Date.now(), settled: st.settled, after: 'sit' });
    host.onclick = null;
  }
  host.onclick = (e) => {
    const f = e.target.closest('[data-feel]');
    if (f) { const v = f.dataset.feel, i = st.feel.indexOf(v); i < 0 ? st.feel.push(v) : st.feel.splice(i, 1); return render(); }
    const s = e.target.closest('[data-scale]');
    if (s) { const k = s.dataset.scale, v = Number(s.dataset.v); st[k] = st[k] === v ? null : v; return render(); }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'done') { save(); onClose(); }
    else if (act === 'line') { save(); onClose(); ctx.go('today', 'line'); }
  };
  render();
}
