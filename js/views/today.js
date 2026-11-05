import { dayKey, keyOfTs, fmtLong, greeting } from '../lib/dates.js';
import { esc, uid, toast, hashStr, fmtMin, plural } from '../lib/util.js';
import { WISDOM } from '../lib/content.js';
import { putDown } from '../lib/putdown.js';
import { activeExperiments, expDayIndex, checkButtons } from './experiments.js';

const ui = { customIntention: false };

function scale(field, val, lo, hi) {
  const btns = [1, 2, 3, 4, 5]
    .map((v) => `<button type="button" class="scale-btn ${val === v ? 'on' : ''}" data-action="scale" data-field="${field}" data-v="${v}" aria-pressed="${val === v}" aria-label="${v} of 5">${v}</button>`)
    .join('');
  return `<div class="scale">${btns}</div><div class="scale-ends"><span>${lo}</span><span>${hi}</span></div>`;
}

export function render(root, ctx) {
  const { store } = ctx;
  const s = store.state;
  const t = dayKey();
  const ci = s.checkins[t] || {};
  const name = s.profile.name ? `, ${esc(s.profile.name)}` : '';
  const w = WISDOM[hashStr(t) % WISDOM.length];

  const sitMin = s.sits.filter((x) => keyOfTs(x.ts) === t).reduce((a, b) => a + b.minutes, 0);
  const presenceToday = s.presence.filter((x) => keyOfTs(x.ts) === t);
  const urgesToday = s.urges.filter((x) => keyOfTs(x.ts) === t).length;
  const active = activeExperiments(s, t);

  const onboarding = !s.profile.onboarded
    ? `<section class="card welcome">
        <p class="eyebrow">Welcome</p>
        <h2>This isn't a program to finish.</h2>
        <p>No streaks. No shoulds. Nothing to fall off of. It's a quiet place to check in, sit for a bit, catch the pull of distraction, and try small experiments that you pick yourself.</p>
        <p>Spend a minute or two here, then put the phone down. That's how it's meant to be used.</p>
        <label class="field"><span>What should I call you?</span><input name="onboard-name" autocomplete="given-name" placeholder="Your name" value="${esc(s.profile.name)}"></label>
        <button class="btn primary" data-action="onboard">Begin</button>
      </section>`
    : '';

  const intentionChips = s.profile.happiness
    .map((h) => `<button type="button" class="chip ${ci.intention === h ? 'on' : ''}" data-action="intention" data-v="${esc(h)}">${esc(h)}</button>`)
    .join('');
  const customIsSet = ci.intention && !s.profile.happiness.includes(ci.intention);

  const peopleBtns = [...s.profile.people, 'nature', 'myself']
    .map((p) => `<button type="button" class="chip" data-action="presence" data-v="${esc(p)}">${esc(p)}</button>`)
    .join('');

  const expHtml = active.length
    ? `<section class="card">
        <div class="card-head"><h2>Your experiments</h2><a href="#/experiments" class="link">All</a></div>
        ${active
          .map((e) => {
            const di = expDayIndex(e, t);
            return `<div class="exp-mini">
              <div><strong>${esc(e.title)}</strong><span class="muted small"> · day ${di} of ${e.days}</span></div>
              ${checkButtons(e, t)}
            </div>`;
          })
          .join('')}
      </section>`
    : '';

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">${esc(fmtLong(t))}</p>
      <h1>${greeting()}${name}.</h1>
    </header>

    ${onboarding}

    <section class="card wisdom">
      <p class="eyebrow">A reminder for today</p>
      <h3>${esc(w.title)}</h3>
      <p>${esc(w.body)}</p>
    </section>

    <section class="card">
      <h2>How's your mind right now?</h2>
      ${scale('settled', ci.settled, 'Scattered', 'Settled')}
      <h2 class="mt">How's your heart?</h2>
      ${scale('heart', ci.heart, 'Heavy', 'Light')}
      <label class="field mt"><span>One word for right now</span>
        <input name="word" maxlength="40" placeholder="tired, hopeful, buzzing…" value="${esc(ci.word || '')}">
      </label>
      <p class="muted small">There's no right answer. You're just noticing.</p>
    </section>

    <section class="card">
      <h2>Today, I'd like to…</h2>
      <p class="muted small">An intention, not a rule. Pick one from what you know makes you happy.</p>
      <div class="chips">${intentionChips}
        <button type="button" class="chip ${customIsSet ? 'on' : ''}" data-action="custom-intention">${customIsSet ? esc(ci.intention) : 'Something else…'}</button>
      </div>
      ${ui.customIntention ? `<div class="row mt"><input name="custom-intention" placeholder="Today I'd like to…" value="${customIsSet ? esc(ci.intention) : ''}"><button class="btn" data-action="save-custom">Set</button></div>` : ''}
    </section>

    <section class="card">
      <h2>Invitations</h2>
      <p class="muted small">Not a to-do list. They're just doors you can walk through if you want.</p>
      <a class="invite" href="#/sit">
        <span class="invite-icon" aria-hidden="true">◯</span>
        <span><strong>Sit for a few minutes</strong><span class="muted small block">${sitMin ? `${fmtMin(sitMin)} today` : 'Any length counts. One breath counts.'}</span></span>
        <span class="chev" aria-hidden="true">›</span>
      </a>
      <a class="invite" href="#/pause">
        <span class="invite-icon" aria-hidden="true">≋</span>
        <span><strong>Caught yourself reaching?</strong><span class="muted small block">${urgesToday ? `${plural(urgesToday, 'urge')} noticed today. Every one is a rep.` : 'Pause here before you open the thing.'}</span></span>
        <span class="chev" aria-hidden="true">›</span>
      </a>
      <div class="invite static">
        <span class="invite-icon" aria-hidden="true">♡</span>
        <span><strong>I was really there with…</strong><span class="muted small block">${presenceToday.length ? `${plural(presenceToday.length, 'present moment')} today.` : 'Tap after a moment of real presence.'}</span></span>
      </div>
      <div class="chips">${peopleBtns}</div>
    </section>

    ${expHtml}

    <section class="closing">
      <button class="btn primary wide" data-action="putdown">I'm done here. Back to life.</button>
    </section>
  `;

  const setCheckin = (patch) =>
    store.update((st) => { st.checkins[t] = { ...(st.checkins[t] || {}), ...patch }; });

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'onboard') {
      const n = root.querySelector('[name="onboard-name"]').value.trim();
      store.update((st) => { st.profile.name = n; st.profile.onboarded = true; });
      ctx.rerender();
    } else if (a === 'scale') {
      const v = Number(el.dataset.v);
      const field = el.dataset.field;
      setCheckin({ [field]: ci[field] === v ? null : v });
      ctx.rerender();
    } else if (a === 'intention') {
      const v = el.dataset.v;
      setCheckin({ intention: ci.intention === v ? null : v });
      ui.customIntention = false;
      ctx.rerender();
    } else if (a === 'custom-intention') {
      ui.customIntention = !ui.customIntention;
      ctx.rerender();
      root.querySelector('[name="custom-intention"]')?.focus();
    } else if (a === 'save-custom') {
      const v = root.querySelector('[name="custom-intention"]').value.trim();
      setCheckin({ intention: v || null });
      ui.customIntention = false;
      ctx.rerender();
    } else if (a === 'presence') {
      store.update((st) => st.presence.push({ id: uid(), ts: Date.now(), with: el.dataset.v }));
      toast(`Noted. Being there with ${el.dataset.v} is the whole thing.`);
      ctx.rerender();
    } else if (a === 'exp-check') {
      const { id, v, day } = el.dataset;
      store.update((st) => {
        const ex = st.experiments.find((x) => x.id === id);
        if (!ex) return;
        if (ex.checks[day] === v) delete ex.checks[day];
        else ex.checks[day] = v;
      });
      if (v === 'no') {
        const ex = store.state.experiments.find((x) => x.id === id);
        toast(ex?.ifSlip ? `Your plan: ${ex.ifSlip}` : "That's data, not failure. Start again whenever you like.");
      }
      ctx.rerender();
    } else if (a === 'putdown') {
      putDown();
    }
  };

  root.onchange = (e) => {
    if (e.target.name === 'word') setCheckin({ word: e.target.value.trim() });
  };
  root.onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.name === 'custom-intention') root.querySelector('[data-action="save-custom"]').click();
  };
  return () => { root.onkeydown = null; };
}
