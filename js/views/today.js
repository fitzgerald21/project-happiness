// Today: the whole day on one page. Arrive, sit, be there, catch the pull, and close with a line.
// Each part folds down to a single line once it's done, and everything that happened lands on the thread.
import { dayKey, fmtLong, fmtTime, greeting } from '../lib/dates.js';
import { esc, toast, hashStr, plural } from '../lib/util.js';
import { WISDOM, JOURNAL_PROMPTS, partOfDay } from '../lib/content.js';
import { sky, skyArc } from '../lib/sky.js';
import { thread, sitsOn } from '../lib/day.js';
import { putDown } from '../lib/putdown.js';
import { pageHTML, bindPage } from '../lib/page.js';
import { activeExperiments, expDayIndex, checkButtons, setCheck } from '../lib/experiments.js';
import { STAGES } from '../content/stages.js';
import { fmtDur, timeline } from '../sit/common.js';
import { openBook } from '../lib/bookdoor.js';

const ui = { checking: false, draft: {}, customIntention: false, intentionOpen: false, day: '' };
const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></svg>';

const scale = (field, val, lo, hi) => `
  <div class="scale">${[1, 2, 3, 4, 5].map((v) => `<button type="button" class="scale-btn ${val === v ? 'on' : ''}" data-action="scale" data-field="${field}" data-v="${v}" aria-pressed="${val === v}" aria-label="${v} of 5">${v}</button>`).join('')}</div>
  <div class="scale-ends"><span>${lo}</span><span>${hi}</span></div>`;

export function render(root, ctx) {
  const { store } = ctx;
  const s = store.state, prefs = s.prefs;
  const t = dayKey();
  if (ui.day !== t) Object.assign(ui, { checking: false, draft: {}, customIntention: false, intentionOpen: false, day: t });
  const day = store.day(t);
  const part = partOfDay();
  const sits = sitsOn(store, t);
  const th = thread(store, t);
  const sk = sky();
  const w = WISDOM[hashStr(t) % WISDOM.length];
  const stage = STAGES[Math.min(10, Math.max(1, prefs.stage)) - 1];
  const checks = day.checks || [];
  const lastCheck = checks.at(-1);
  const exps = activeExperiments(store, t);

  // ----- the sky -----
  const sitMs = sits.reduce((a, r) => a + r.dur, 0), returns = sits.reduce((a, r) => a + (r.returns || 0), 0);
  const sum = [
    sitMs ? `Sat ${fmtDur(sitMs)}` : '',
    returns ? `came back ${plural(returns, 'time')}` : '',
    day.presence?.length ? plural(day.presence.length, 'present moment') : '',
  ].filter(Boolean).join(' · ') || (day.intention ? `Today: ${day.intention}` : { morning: 'A new day. Nothing to catch up on.', day: 'The day is open.', evening: 'The day is winding down.', night: 'Rest is practice too.' }[part]);
  const syncLabel = { local: store.cloudReady ? 'Not signed in' : 'On this device', syncing: 'Syncing', synced: 'Synced', error: 'Sync trouble' }[store.sync];
  const hero = `
    <header class="sky" style="--sky-a:${sk.top};--sky-b:${sk.bottom}">
      <div class="sky-top">
        <div>
          <p class="eyebrow">${esc(fmtLong(t))}</p>
          <h1>${greeting()}${s.profile.name ? `, ${esc(s.profile.name)}` : ''}.</h1>
          <p class="sky-sum">${esc(sum)}</p>
        </div>
        <a href="#/settings" class="icon-btn" aria-label="Settings (${syncLabel})" title="${syncLabel}">${GEAR}</a>
      </div>
      ${skyArc(sk, th)}
      <div class="sky-fade"></div>
    </header>`;

  // ----- welcome -----
  const welcome = s.profile.onboarded ? '' : `
    <section class="card">
      <p class="eyebrow">Welcome</p>
      <h2>One place for the whole practice.</h2>
      <p>Your sits, your path through the stages, the pull of the phone, the people you want to be there for, and one line a day. It all lands on the same page now.</p>
      <p class="muted small">No streaks to protect. Spend a minute or two here, then put the phone down.</p>
      <label class="field"><span>What should I call you?</span><input name="onboard-name" autocomplete="given-name" placeholder="Your name" value="${esc(s.profile.name)}"></label>
      <div class="row">
        <button class="btn primary" data-action="onboard">Begin</button>
        ${store.cloudReady && !store.user ? '<button class="btn" data-action="signin">Sign in with Google</button>' : ''}
      </div>
      ${store.cloudReady && !store.user ? '<p class="muted small">Signing in brings in your Come back sits and your One Line a Day book, and keeps everything in step across devices.</p>' : ''}
    </section>`;

  // ----- arrive: the check-in -----
  const d = ui.draft;
  const arrive = !lastCheck || ui.checking ? `
    <section class="card" id="arrive">
      <h2>${lastCheck ? 'And now?' : "How's your mind right now?"}</h2>
      ${scale('settled', d.settled, 'Scattered', 'Settled')}
      <p class="field-label mt">And your heart?</p>
      ${scale('heart', d.heart, 'Heavy', 'Light')}
      <label class="field"><span>One word for right now</span><input name="word" maxlength="40" placeholder="tired, hopeful, buzzing…" value="${esc(d.word || '')}"></label>
      <div class="row">
        <button class="btn primary" data-action="save-check" ${d.settled || d.heart || d.word ? '' : 'disabled'}>Note it</button>
        ${lastCheck ? '<button class="btn ghost" data-action="cancel-check">Never mind</button>' : '<span class="muted small">No right answer. You\'re just noticing.</span>'}
      </div>
    </section>` : `
    <section class="card quiet"><div class="done-line">
      <p><strong>Mind ${lastCheck.settled ?? '–'}</strong> · heart ${lastCheck.heart ?? '–'}${lastCheck.word ? ` · “${esc(lastCheck.word)}”` : ''} <span class="muted small">at ${fmtTime(lastCheck.ts)}</span></p>
      <button class="link small" data-action="check-again">Check in again</button>
    </div></section>`;

  // ----- intention -----
  const customIsSet = day.intention && !s.profile.happiness.includes(day.intention);
  const intention = day.intention && !ui.intentionOpen ? `
    <section class="card quiet"><div class="done-line">
      <p>Today I'd like to: <strong>${esc(day.intention)}</strong></p>
      <button class="link small" data-action="open-intention">Change</button>
    </div></section>` : `
    <section class="card">
      <h2>Today, I'd like to…</h2>
      <p class="muted small">An intention, not a rule. From what you already know makes you happy.</p>
      <div class="chips">${s.profile.happiness.map((h) => `<button type="button" class="chip ${day.intention === h ? 'on' : ''}" data-action="intention" data-v="${esc(h)}">${esc(h)}</button>`).join('')}
        <button type="button" class="chip ${customIsSet ? 'on' : ''}" data-action="custom-intention">${customIsSet ? esc(day.intention) : 'Something else…'}</button>
      </div>
      ${ui.customIntention ? `<div class="row mt"><input name="custom-intention" placeholder="Today I'd like to…" value="${customIsSet ? esc(day.intention) : ''}"><button class="btn" data-action="save-custom">Set</button></div>` : ''}
    </section>`;

  // ----- sit -----
  const open = prefs.practice === 'open';
  const sitName = open ? 'Just sitting' : `Stage ${stage.n}: ${stage.short}`;
  const lastSit = sits.at(-1);
  const sitCard = lastSit ? `
    <section class="card">
      <div class="card-head"><h2>You sat today.</h2><a class="link small" href="#/sit">More ways to sit</a></div>
      <p class="muted">${fmtDur(sitMs)}${returns ? `, and you came back ${plural(returns, 'time')}. Every one was the practice.` : '.'}</p>
      ${lastSit.returns ? timeline(lastSit.entries, lastSit.dur, true) : ''}
      <button class="btn mt" data-action="sit">Sit again · ${prefs.minutes} min</button>
    </section>` : `
    <section class="card">
      <div class="invite">
        <div>
          <p class="eyebrow">${part === 'evening' || part === 'night' ? 'Before the day ends' : 'An invitation'}</p>
          <h2>${esc(sitName)}</h2>
          <p class="muted small">${open ? 'Rest somewhere. When the mind wanders, tap, and come back.' : esc(stage.essence)}</p>
        </div>
      </div>
      <div class="row mt">
        <button class="btn primary" data-action="sit">Begin · ${prefs.minutes} min</button>
        <a class="btn ghost" href="#/sit">Something else</a>
      </div>
    </section>`;

  // ----- presence -----
  const presence = `
    <section class="card">
      <h2>I was really there with…</h2>
      <p class="muted small">${day.presence?.length ? `${plural(day.presence.length, 'present moment')} today. That's the whole point of all of this.` : 'Tap after a moment of real presence. Attention is the gift.'}</p>
      <div class="chips">${[...s.profile.people, 'nature', 'myself'].map((p) => `<button type="button" class="chip" data-action="presence" data-v="${esc(p)}">${esc(p)}</button>`).join('')}</div>
    </section>`;

  // ----- experiments -----
  const expHtml = exps.length ? `
    <section class="card">
      <div class="card-head"><h2>Your experiments</h2><a href="#/path/experiments" class="link small">All</a></div>
      ${exps.map((e) => `<div class="exp-mini">
        <div><strong>${esc(e.title)}</strong><span class="muted small"> · day ${expDayIndex(e, t)} of ${e.days}</span></div>
        ${checkButtons(e, t)}
      </div>`).join('')}
    </section>` : '';

  // ----- the line -----
  const prompt = JOURNAL_PROMPTS[hashStr(t) % JOURNAL_PROMPTS.length];
  const line = `
    <section id="line">
      <div class="card-head" style="margin:22px 4px 0"><h2>One line for today</h2><button class="link small" data-action="open-book">Open the book</button></div>
      ${pageHTML(store, t, { placeholder: prompt })}
    </section>`;

  // ----- the thread -----
  const threadHtml = th.length ? `
    <section class="card">
      <h2>Today so far</h2>
      <ul class="thread">${th.map((x) => `<li><time>${fmtTime(x.ts)}</time><i style="--c:${x.color}"></i><span>${esc(x.text)}</span></li>`).join('')}</ul>
    </section>` : '';

  const wisdom = `
    <section class="card soft wisdom">
      <p class="eyebrow">A reminder for today</p>
      <h3>${esc(w.title)}</h3>
      <p>${esc(w.body)}</p>
    </section>`;

  // Morning leads with arriving and sitting; by evening the line comes forward.
  const late = part === 'evening' || part === 'night';
  const order = late
    ? [welcome, line, arrive, sitCard, presence, expHtml, threadHtml, wisdom]
    : [welcome, wisdom, arrive, intention, sitCard, presence, expHtml, line, threadHtml];

  root.innerHTML = `${hero}${order.join('')}
    <section class="closing">
      <button class="btn primary wide" data-action="putdown">I'm done here. Back to life.</button>
    </section>`;

  const unbind = bindPage(root, store);
  if (ctx.focus === 'line') {
    const el = root.querySelector('#line');
    requestAnimationFrame(() => { el?.scrollIntoView({ block: 'start' }); el?.querySelector('textarea')?.focus(); });
  }

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'onboard') {
      store.setProfile({ name: root.querySelector('[name="onboard-name"]').value.trim(), onboarded: true });
      ctx.rerender();
    } else if (a === 'signin') {
      store.signIn()?.catch((err) => toast(`Couldn't sign in: ${err.message}`));
    } else if (a === 'scale') {
      const v = Number(el.dataset.v), f = el.dataset.field;
      ui.draft.word = root.querySelector('[name="word"]')?.value.trim() || '';
      ui.draft[f] = ui.draft[f] === v ? null : v;
      ui.checking = true;
      ctx.rerender();
    } else if (a === 'save-check') {
      const word = root.querySelector('[name="word"]').value.trim();
      store.addCheck({ ts: Date.now(), settled: ui.draft.settled || null, heart: ui.draft.heart || null, word });
      ui.draft = {}; ui.checking = false;
      toast('Noted.');
      ctx.rerender();
    } else if (a === 'check-again') { ui.checking = true; ui.draft = {}; ctx.rerender(); }
    else if (a === 'cancel-check') { ui.checking = false; ui.draft = {}; ctx.rerender(); }
    else if (a === 'open-intention') { ui.intentionOpen = true; ctx.rerender(); }
    else if (a === 'intention') {
      store.patchDay(t, { intention: day.intention === el.dataset.v ? null : el.dataset.v });
      ui.customIntention = false; ui.intentionOpen = false;
      ctx.rerender();
    } else if (a === 'custom-intention') {
      ui.customIntention = !ui.customIntention; ui.intentionOpen = true;
      ctx.rerender();
      root.querySelector('[name="custom-intention"]')?.focus();
    } else if (a === 'save-custom') {
      store.patchDay(t, { intention: root.querySelector('[name="custom-intention"]').value.trim() || null });
      ui.customIntention = false; ui.intentionOpen = false;
      ctx.rerender();
    } else if (a === 'sit') {
      ctx.startSit(open ? { practice: 'open', minutes: prefs.minutes } : { practice: 'stage', stage: stage.n, minutes: prefs.minutes });
    } else if (a === 'presence') {
      store.addPresence(el.dataset.v);
      toast(`Noted. Being there with ${el.dataset.v} is the whole thing.`);
      ctx.rerender();
    } else if (a === 'exp-check') {
      const now = setCheck(store, el.dataset.id, el.dataset.day, el.dataset.v);
      if (now === 'no') {
        const ex = store.state.experiments[el.dataset.id];
        toast(ex?.ifSlip ? `Your plan: ${ex.ifSlip}` : "That's data, not failure. Start again whenever you like.");
      }
      ctx.rerender();
    } else if (a === 'open-book') { openBook(ctx, t);
    } else if (a === 'putdown') putDown();
  };
  root.oninput = (e) => {
    if (e.target.name === 'word') {
      ui.draft.word = e.target.value;
      const b = root.querySelector('[data-action="save-check"]');
      if (b) b.disabled = !(ui.draft.settled || ui.draft.heart || e.target.value.trim());
    }
  };
  root.onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.name === 'custom-intention') root.querySelector('[data-action="save-custom"]').click();
    else if (e.target.name === 'word') root.querySelector('[data-action="save-check"]').click();
    else if (e.target.name === 'onboard-name') root.querySelector('[data-action="onboard"]').click();
  };
  return unbind;
}
