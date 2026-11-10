// Sit: choose how to practice, what to rest on, and begin. Past sits live at the bottom.
import { dayKey, keyOfTs, lastNDays, fmtWeekday, fmtShort, fmtTime } from '../lib/dates.js';
import { esc, toast, plural } from '../lib/util.js';
import { BREATH_PATTERNS, REFRAMES } from '../lib/content.js';
import { STAGES } from '../content/stages.js';
import { DRILLS } from '../sit/script.js';
import { SCENE_ORDER, SCENE_NAMES, CANVAS_SCENES } from '../sit/scenes.js';
import { timeline, fmtDur, fmtRate, sitTitle, tally } from '../sit/common.js';
import { levelCard } from '../sit/review.js';

const PRACTICES = [
  ['stage', 'Guided sit', 'Built for your stage on the path'],
  ['open', 'Just sit', 'A scene, a bell, and coming back'],
  ['breathe', 'Breathe', 'Follow the circle for a few minutes'],
  ['walking', 'Walk', 'Lift, move, place'],
  ['metta', 'Loving-kindness', 'Warmth, circle by circle'],
  ['hard', 'Before a hard thing', 'A presentation, a tough talk'],
];
const LENGTHS = { stage: [5, 10, 15, 20, 30, 45, 60], open: [0, 5, 15, 30, 60], breathe: [1, 2, 3, 5, 10], walking: [5, 10, 15, 20, 30], metta: [5, 10, 15, 20, 30] };
const ui = { practice: null, mins: { open: 15, breathe: 3, walking: 10, metta: 10 }, pattern: 'calm', hard: '', shown: 8, confirm: null };

const seg = (opts, cur, action, fmt) =>
  `<div class="seg">${opts.map((o) => `<button type="button" class="seg-btn ${cur === o ? 'on' : ''}" data-action="${action}" data-v="${o}">${fmt(o)}</button>`).join('')}</div>`;

export function render(root, ctx) {
  const { store } = ctx;
  const s = store.state, prefs = s.prefs;
  if (!ui.practice) ui.practice = PRACTICES.some(([k]) => k === prefs.practice) ? prefs.practice : 'stage';
  const p = ui.practice;
  const stage = STAGES[Math.min(10, Math.max(1, prefs.stage)) - 1];
  const mins = p === 'stage' ? prefs.minutes : ui.mins[p];
  const t = dayKey();

  // ----- the chosen practice -----
  let body = '';
  if (p === 'stage') {
    body = `
      <div class="card-head"><h2>Stage ${stage.n}: ${esc(stage.short)}</h2><a class="link small" href="#/path/stage/${stage.n}">About this stage</a></div>
      <p class="muted small">${esc(stage.goal)}</p>
      ${seg(LENGTHS.stage, mins, 'mins', (m) => `${m}m`)}
      <p class="field-label mt">Guidance</p>
      ${seg(['full', 'light', 'bells'], prefs.guidance, 'guidance', (g) => ({ full: 'Spoken', light: 'A few words', bells: 'Bells only' }[g]))}
      <label class="check"><input type="checkbox" name="prep" ${prefs.prep ? 'checked' : ''}> Start with the six preparation steps</label>`;
  } else if (p === 'open') {
    body = `
      <h2>Just sit</h2>
      <p class="muted small">Rest your attention somewhere. When you notice it has wandered, tap, and come back. That noticing is the whole practice, so every tap counts.</p>
      ${seg(LENGTHS.open, mins, 'mins', (m) => (m ? `${m}m` : 'No limit'))}`;
  } else if (p === 'breathe') {
    body = `
      <h2>Breathe with the circle</h2>
      ${seg(Object.keys(BREATH_PATTERNS), ui.pattern, 'pattern', (k) => BREATH_PATTERNS[k].name)}
      <p class="muted small">${esc(BREATH_PATTERNS[ui.pattern].desc)}</p>
      ${seg(LENGTHS.breathe, mins, 'mins', (m) => `${m}m`)}`;
  } else if (p === 'walking' || p === 'metta') {
    body = `
      <h2>${p === 'walking' ? 'Walking meditation' : 'Loving-kindness'}</h2>
      <p class="muted small">${p === 'walking' ? 'A short path, slow steps, and the soles of your feet. Guided by voice, so the phone can stay in your pocket.' : 'Offer the same four wishes to yourself, to people you love, to someone difficult, and to everyone. A direct remedy for irritation.'}</p>
      ${seg(LENGTHS[p], mins, 'mins', (m) => `${m}m`)}`;
  } else {
    body = `
      <h2>Before a hard thing</h2>
      <p class="muted small">For a presentation, a tough conversation, or that knot in your stomach before work.</p>
      <label class="field"><span>What's the hard thing? (optional)</span><input name="hard" maxlength="80" value="${esc(ui.hard)}" placeholder="The Thursday presentation"></label>
      <div>${REFRAMES.map((r) => `<div class="reframe"><strong>${esc(r.h)}</strong><p>${esc(r.b)}</p></div>`).join('')}</div>
      <div class="stack mt">
        <button class="btn primary" data-action="hard-sigh">2 minutes of calming sighs</button>
        <button class="btn" data-action="hard-sit">3 minutes of quiet</button>
      </div>
      <p class="muted small mt">Afterward, however it went, be as kind to yourself as you'd be to a friend who just did it.</p>`;
  }
  const scenePick = p === 'breathe' || p === 'hard' ? '' : `
    <p class="field-label mt">Rest on</p>
    <div class="scene-row">${['guide', ...SCENE_ORDER].map((sc) => `<button type="button" class="scene-chip ${prefs.scene === sc ? 'on' : ''}" data-action="scene" data-v="${sc}">${CANVAS_SCENES.includes(sc) ? `<img src="previews/${sc}.jpg" alt="" loading="lazy">` : `<span class="scene-swatch s-${sc}"></span>`}<span>${esc(SCENE_NAMES[sc])}</span></button>`).join('')}</div>
    <p class="muted small">${prefs.scene === 'guide' ? 'The guide is a seated figure that shows the technique as you do it: where attention goes, the breath, the scan.' : prefs.scene === 'dark' ? 'A black screen with one number. Best with sound on, or a handheld button.' : 'A quiet scene to rest your eyes on. A tap stirs it.'}</p>`;
  const beginLabel = p === 'stage' ? `Begin · ${mins} min` : p === 'open' ? (mins ? `Begin · ${mins} min` : 'Begin') : `Begin · ${mins} min`;

  // ----- drills -----
  const drills = `
    <section class="card">
      <h2>Practice one skill</h2>
      <p class="muted small">Short sits that isolate a single technique.</p>
      <div class="chips">${DRILLS.map((d) => `<button type="button" class="chip" data-action="drill" data-v="${d.id}" title="${esc(d.blurb)}">${esc(d.name)} · ${d.minutes}m</button>`).join('')}</div>
    </section>`;

  // ----- your practice -----
  const days = lastNDays(7);
  const byDay = Object.fromEntries(days.map((d) => [d, 0]));
  s.sessions.forEach((r) => { const k = keyOfTs(r.start); if (k in byDay) byDay[k] += r.dur / 60000; });
  const weekTotal = Object.values(byDay).reduce((a, b) => a + b, 0);
  const all = [...s.sessions].reverse();
  const hist = all.slice(0, ui.shown).map((r) => {
    const tl = tally(r.entries).slice(0, 3).map((x) => `${x.name} ×${x.n}`).join(', ');
    return `<div class="sitrow">
      <div class="sitrow-head"><strong>${esc(sitTitle(r))}</strong><span class="muted small">${fmtShort(keyOfTs(r.start))}, ${fmtTime(r.start)}</span></div>
      <p class="muted small" style="margin:2px 0">${fmtDur(r.dur)} · ${plural(r.returns || 0, 'return')}${r.dur >= 60000 && r.returns ? ` · ${fmtRate(r.returns / (r.dur / 60000))}/min` : ''}${r.stability ? ` · stability ${r.stability}, clarity ${r.clarity ?? '–'}` : ''}</p>
      ${r.entries?.some((e) => typeof e.at === 'number') ? timeline(r.entries, r.dur, true) : ''}
      ${r.feel?.length || tl ? `<p class="muted small" style="margin:4px 0 0">${esc([r.feel?.join(', '), tl].filter(Boolean).join(' · '))}</p>` : ''}
      ${r.note ? `<p class="small" style="margin:4px 0 0">${esc(r.note)}</p>` : ''}
      ${ui.confirm === r.start
        ? `<p class="small">Delete this sit? <button class="link danger small" data-action="del-yes" data-v="${r.start}">Yes, delete</button> · <button class="link small" data-action="del-no">Keep it</button></p>`
        : `<button class="link small muted" data-action="del" data-v="${r.start}">Delete</button>`}
    </div>`;
  }).join('');
  const practice = `
    <section class="card">
      <div class="card-head"><h2>This week</h2><span class="muted small">${fmtDur(weekTotal * 60000)} · ${Object.values(byDay).filter(Boolean).length} of 7 days</span></div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);text-align:center">
        ${days.map((d) => {
          const m = byDay[d], size = m ? Math.min(34, 12 + Math.sqrt(m) * 4) : 8;
          return `<div title="${esc(`${fmtShort(d)}: ${fmtDur(m * 60000)}`)}"><div style="height:40px;display:grid;place-items:center"><span style="display:block;width:${size}px;height:${size}px;border-radius:50%;background:${m ? 'var(--gold)' : 'var(--line)'}"></span></div><span class="muted small" ${d === t ? 'style="color:var(--ink);font-weight:600"' : ''}>${fmtWeekday(d)}</span></div>`;
        }).join('')}
      </div>
      <p class="muted small">This isn't a streak. Whatever you sat is enough.</p>
      ${store.totalReturns() ? levelCard(store.totalReturns()) : ''}
    </section>
    ${all.length ? `<section class="card">
      <div class="card-head"><h2>Past sits</h2><span class="muted small">${all.length} in all</span></div>
      ${hist}
      ${all.length > ui.shown ? '<button class="btn wide mt" data-action="more">Show more</button>' : ''}
    </section>` : ''}`;

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Sit</p>
      <h1>Come back to the breath.</h1>
    </header>
    <div class="practice-grid">${PRACTICES.map(([k, name, sub]) => `<button type="button" class="practice ${p === k ? 'on' : ''}" data-action="practice" data-v="${k}"><strong>${name}</strong><span>${sub}</span></button>`).join('')}</div>
    <section class="card">
      ${body}
      ${scenePick}
      ${p === 'hard' ? '' : `<button class="btn primary wide mt" data-action="begin">${beginLabel}</button>`}
    </section>
    ${drills}
    ${practice}`;

  root.onclick = (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action, v = el.dataset.v;
    const hard = root.querySelector('[name="hard"]');
    if (hard) ui.hard = hard.value;
    if (a === 'practice') { ui.practice = v; if (v !== 'hard' && v !== 'breathe') store.setPrefs({ practice: v }); ctx.rerender(); }
    else if (a === 'mins') { if (p === 'stage') store.setPrefs({ minutes: Number(v) }); else ui.mins[p] = Number(v); ctx.rerender(); }
    else if (a === 'guidance') { store.setPrefs({ guidance: v }); ctx.rerender(); }
    else if (a === 'pattern') { ui.pattern = v; ctx.rerender(); }
    else if (a === 'scene') { store.setPrefs({ scene: v }); ctx.rerender(); }
    else if (a === 'begin') {
      if (p === 'stage') ctx.startSit({ practice: 'stage', stage: stage.n, minutes: mins });
      else if (p === 'breathe') ctx.startSit({ practice: 'breathe', pattern: ui.pattern, minutes: mins });
      else ctx.startSit({ practice: p, minutes: mins });
    } else if (a === 'drill') ctx.startSit({ practice: 'drill', drill: v, scene: 'guide' });
    else if (a === 'hard-sigh') ctx.startSit({ practice: 'breathe', pattern: 'sigh', minutes: 2, title: ui.hard ? `Before: ${ui.hard}` : 'Before a hard thing' });
    else if (a === 'hard-sit') ctx.startSit({ practice: 'open', minutes: 3, title: ui.hard ? `Before: ${ui.hard}` : 'Before a hard thing' });
    else if (a === 'more') { ui.shown += 20; ctx.rerender(); }
    else if (a === 'del') { ui.confirm = Number(v); ctx.rerender(); }
    else if (a === 'del-no') { ui.confirm = null; ctx.rerender(); }
    else if (a === 'del-yes') { store.deleteSession(Number(v)); ui.confirm = null; toast('Deleted.'); ctx.rerender(); }
  };
  root.onchange = (e) => { if (e.target.name === 'prep') store.setPrefs({ prep: e.target.checked }); };
}
