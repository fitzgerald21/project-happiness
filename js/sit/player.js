// The sit. One player for everything: a guided stage sit, a drill, walking, loving-kindness, breathing with
// the circle, or just sitting. Whatever the practice, the same thing counts: each time you notice the mind
// has wandered, tap anywhere, and come back. (Come back called that a return, Lantern called it the aha.)
import { esc, toast } from '../lib/util.js';
import { BREATH_PATTERNS } from '../lib/content.js';
import { keepAwake, letSleep } from '../lib/wakelock.js';
import { buildGuided, buildDrill, buildWalking, buildMetta, scriptLines, scanLine, SCAN_REGIONS, DULL_LINE } from './script.js';
import { Scene as Guide, newControl, breathsFromLog } from './figure.js';
import { createScenes, SCENE_NAMES, SCENE_ORDER, CANVAS_SCENES } from './scenes.js';
import { createAmbient } from './ambient.js';
import { DUAL_PRESETS, HID_PRESETS } from './tonePresets.js';
import * as audio from './audio.js';
import { speak, hush, configureVoice, primeVoice, preloadLines } from './voice.js';
import { REMINDER_DEFAULTS, MIN_RECORD_MS, fmtClock } from './common.js';
import { remoteMap, remoteHTML, bindRemote, presets } from './remote.js';
import { openPrep } from './prep.js';
import { openReview } from './review.js';

const DULL_REMEDIES = [
  'Take three slightly deeper breaths, then let the breath be natural.',
  'Straighten the spine and lift the crown of the head.',
  'Briefly tense the whole body, then relax.',
  'If needed, open the eyes a little.',
];
const SOUND_MODES = { scene: 'Scene sounds', dual: 'Two voices', hidden: 'Hidden overtone', silent: 'Silent' };
const ICON = {
  pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6v12M15 6v12"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14M5 16h14"/><circle cx="9" cy="8" r="2.2" fill="currentColor"/><circle cx="15" cy="16" r="2.2" fill="currentColor"/></svg>',
};

let open = false;
export const sitIsOpen = () => open;

/** opts: { practice: 'stage'|'drill'|'walking'|'metta'|'breathe'|'open', stage, minutes, drill, pattern, title, onDone } */
export function buildScript(opts) {
  const m = opts.minutes;
  if (opts.practice === 'stage') return buildGuided(opts.stage, m);
  if (opts.practice === 'drill') return buildDrill(opts.drill);
  if (opts.practice === 'walking') return buildWalking(m);
  if (opts.practice === 'metta') return buildMetta(m);
  const breathe = opts.practice === 'breathe';
  const pat = BREATH_PATTERNS[opts.pattern] || BREATH_PATTERNS.calm;
  return {
    title: opts.title || (breathe ? `${pat.name} breathing` : 'Just sitting'),
    stage: 0,
    kind: breathe ? 'breathe' : 'timer',
    segments: [{
      id: 'only', phase: 'Practice', title: breathe ? pat.name : 'Just sitting',
      text: breathe ? pat.desc : 'Rest your attention somewhere. When you notice it has wandered, tap, and come back.',
      say: '', visual: 'nose', controls: ['aha'], dur: m > 0 ? m * 60 : Infinity,
    }],
  };
}

export function openSit(ctx, opts) {
  if (open) return;
  open = true;
  const { store } = ctx;
  const prefs = store.state.prefs;
  const host = document.getElementById('stage');
  const script = buildScript(opts);
  // audio and speech have to be woken inside the tap that brought us here
  audio.unlockAudio();
  audio.setBellVolume(prefs.bellVol);
  audio.setSoundVolume(prefs.soundVol);
  primeVoice();
  configureVoice({ name: prefs.voiceName, rate: 0.88, enabled: prefs.voice && prefs.guidance !== 'bells' });
  if (prefs.voice) preloadLines(scriptLines(script, prefs.guidance));
  host.hidden = false;
  document.documentElement.classList.add('sitting');

  const close = (rec) => {
    open = false;
    host.hidden = true;
    host.innerHTML = '';
    document.documentElement.classList.remove('sitting');
    hush();
    audio.releaseAudio();
    opts.onDone?.(rec);
    ctx.rerender();
  };
  const begin = (prep) => run(ctx, host, script, opts, prep, (rec) => {
    if (!rec) return close(null);
    openReview(ctx, host, rec, () => close(rec));
  });
  if (prefs.prep && opts.practice === 'stage') openPrep(ctx, host, script, begin, () => close(null));
  else begin({});
}

function run(ctx, host, script, opts, prep, onFinish) {
  const { store } = ctx;
  const prefs = store.state.prefs;
  const segs = script.segments;
  const total = segs.reduce((a, s) => a + s.dur, 0);   // seconds; Infinity for an open sit
  const starts = [];
  segs.reduce((acc, s) => (starts.push(acc), acc + s.dur), 0);
  const breathe = script.kind === 'breathe';
  const pattern = BREATH_PATTERNS[opts.pattern] || BREATH_PATTERNS.calm;
  const tags = presets(store);
  const reminders = store.state.cb.reminders?.length ? store.state.cb.reminders : REMINDER_DEFAULTS;
  const ctl = newControl();
  const st = {
    scene: breathe ? 'circle' : opts.scene || prefs.scene,
    startWall: Date.now(), pausedAt: 0, pausedMs: 0, done: false,
    entries: [], dull: 0, lastReturn: 0, lastSeg: -1, lastRegion: -1, fired: new Set(),
    endRung: false, raf: 0, iv: 0, idleT: 0, remT: 0, remI: Math.floor(Math.random() * reminders.length),
    game: { caught: 0, missed: 0, extra: 0 }, tones: null, toneKey: '',
  };
  const elapsedMs = () => (st.pausedAt || Date.now()) - st.startWall - st.pausedMs;
  const nowS = () => performance.now() / 1000;
  const voiceOn = () => prefs.voice && prefs.guidance !== 'bells';
  const vibrate = (ms) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };

  host.innerHTML = `
    <div class="sit" data-scene="${st.scene}">
      <canvas class="sit-canvas" id="cvScene" hidden></canvas>
      <canvas class="sit-canvas" id="cvGuide" hidden></canvas>
      <div class="sit-orb" id="orbWrap" hidden><div class="orb-halo" id="orbHalo"></div><div class="orb-ring"></div><div class="orb" id="orb"></div></div>
      <div class="sit-dark" id="dark" hidden><b id="darkN">0</b><span id="darkW">returns</span></div>
      <header class="sit-top fade">
        <div class="sit-progress" aria-hidden="true">${isFinite(total) ? segs.map((s) => `<span style="flex-grow:${s.dur}" class="p-${s.phase.toLowerCase()}"><i></i></span>`).join('') : ''}</div>
        <div class="sit-head">
          <div><p class="eyebrow" id="segPhase"></p><h1 id="segTitle"></h1></div>
          <div class="sit-clock" id="clock">0:00</div>
        </div>
      </header>
      <p class="sit-phase" id="phase" hidden></p>
      <p class="sit-reminder" id="reminder" role="status"></p>
      <p class="sit-score" id="score" hidden></p>
      <p class="sit-tagname" id="tagName"></p>
      <div class="sit-bottom">
        <div class="fade">
          <p class="sit-text" id="segText"></p>
          <p class="sit-tip" id="segTip"></p>
        </div>
        <div class="remedy" id="remedy" hidden><strong>Brighten up</strong><ul>${DULL_REMEDIES.map((r) => `<li>${esc(r)}</li>`).join('')}</ul></div>
        <div class="sit-tags" id="tags" role="group" aria-label="What pulled you away"></div>
        <button type="button" class="breath-pad" id="pad" hidden><span class="pad-fill"></span><span class="pad-text">Hold while breathing in · release to breathe out</span></button>
        <div class="sit-controls">
          <button type="button" class="sit-btn" data-act="pause" aria-label="Pause">${ICON.pause}</button>
          <button type="button" class="sit-side" data-act="dull" id="dullBtn" hidden>Dull?</button>
          <div class="sit-count" id="count" aria-live="polite"><b id="countN">0</b><span id="countW">returns</span></div>
          <button type="button" class="sit-side" data-act="lost" id="lostBtn" hidden>Lost count</button>
          <button type="button" class="sit-btn" data-act="more" aria-label="Sound and scene">${ICON.more}</button>
        </div>
        <p class="sit-hint fade" id="hint"></p>
      </div>
      <div class="sheet" id="sheet" hidden></div>
    </div>`;
  const root = host.firstElementChild;
  const $ = (id) => root.querySelector('#' + id);
  const cvScene = $('cvScene'), cvGuide = $('cvGuide');
  const scenes = createScenes(cvScene);
  const guide = new Guide(cvGuide, ctl);
  const ac = audio.audioContext();
  const ambient = ac && audio.masterBus() ? createAmbient(ac, audio.masterBus()) : null;
  const startPerf = performance.now();
  ambient?.syncBreath(startPerf);

  // ---------- where we are in the script ----------
  function where() {
    const el = elapsedMs() / 1000;
    let i = starts.findIndex((s, k) => el >= s && el < s + segs[k].dur);
    if (i < 0) i = segs.length - 1;
    const seg = segs[i], t = el - starts[i];
    return { el, i, seg, t, p: isFinite(seg.dur) ? Math.min(1, t / seg.dur) : 0 };
  }
  const gameOn = () => prefs.sound === 'hidden' && HID_PRESETS[prefs.hiddenPreset]?.v.hShow === 'events';

  // ---------- scene ----------
  function setScene(name) {
    st.scene = name;
    root.dataset.scene = name;
    const canvas = CANVAS_SCENES.includes(name);
    cvScene.hidden = !canvas;
    cvGuide.hidden = name !== 'guide';
    $('orbWrap').hidden = name !== 'circle';
    $('phase').hidden = name !== 'circle';
    $('dark').hidden = name !== 'dark';
    if (canvas) scenes.set(name);
    if (name === 'guide') guide.snap(where().seg.visual);
    $('hint').textContent = hintText();
    applySound();
  }
  function hintText() {
    if (gameOn()) return 'A held note is playing. Now and then a very faint tone slips in behind it. When you hear it, tap.';
    const base = st.scene === 'dark' ? 'Close your eyes. Tap anywhere, or press space, when you notice your mind has wandered.'
      : 'Tap anywhere, or press space, when you notice your mind has wandered.';
    return base + (prefs.sound === 'dual' ? ' Listen for two separate sounds. When one slips away, tap.' : '');
  }
  function drawCircle() {
    const phases = breathe ? pattern.phases : BREATH_PATTERNS.calm.phases;
    const cycle = phases.reduce((a, p) => a + p.secs, 0);
    let pos = ((st.pausedAt ? st.pausedAt - st.startWall - st.pausedMs : elapsedMs()) / 1000) % cycle, i = 0;
    while (i < phases.length - 1 && pos >= phases[i].secs) { pos -= phases[i].secs; i++; }
    const from = phases[(i + phases.length - 1) % phases.length].scale, to = phases[i].scale;
    const k = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, pos / phases[i].secs));
    const s = from + (to - from) * k, fill = (s - 0.55) / 0.45;
    $('orb').style.transform = `scale(${s.toFixed(4)})`;
    $('orbHalo').style.transform = `scale(${(0.62 + 0.42 * fill).toFixed(4)})`;
    $('orbHalo').style.opacity = (0.12 + 0.6 * fill).toFixed(3);
    if ($('phase').textContent !== phases[i].label) $('phase').textContent = phases[i].label;
  }
  function frame(now) {
    if (st.done) return;
    st.raf = requestAnimationFrame(frame);
    if (st.scene === 'circle') drawCircle();
    else if (st.scene === 'guide') {
      const w = where();
      guide.frame(now, { mode: w.seg.visual, progress: w.p, scanY: st.scanY, metta: w.seg.metta, walk: w.seg.walk, paused: !!st.pausedAt });
    } else if (!cvScene.hidden && !st.pausedAt) scenes.draw(now);
  }

  // ---------- sound ----------
  function applySound() {
    if (!ac) return;
    ambient?.set(prefs.sound === 'scene' && !st.pausedAt ? st.scene : '', true);
    const Lab = window.Lab, T = Lab?.Tones;
    const mode = prefs.sound === 'dual' || prefs.sound === 'hidden' ? prefs.sound : '';
    const preset = mode === 'dual' ? DUAL_PRESETS[prefs.dualPreset] || DUAL_PRESETS.easy : mode === 'hidden' ? HID_PRESETS[prefs.hiddenPreset] || HID_PRESETS.always : null;
    const key = mode ? `${mode}|${mode === 'dual' ? prefs.dualPreset : prefs.hiddenPreset}` : '';
    if (key === st.toneKey || !T) return;
    st.toneKey = key;
    if (st.tones) { Lab.retire(st.tones, 0.8); st.tones = null; }
    if (!preset) return;
    const v = preset.v;
    // the recordings are fetched the first time they're needed; until then the synthesized version plays
    Lab.load((mode === 'dual' ? [v.iA, v.iB] : [v.hInst]).map(T.held)).then(() => {
      if (st.toneKey !== key || st.done) return;
      const L = Lab.layer();
      if (mode === 'dual') T.duo(L, v);
      else T.hidden(L, v, { miss: () => { if (!st.pausedAt) { st.game.missed++; paintScore(); } } });
      Lab.fadeIn(L, 1.5);
      st.tones = L;
    });
  }
  function paintScore() {
    const on = gameOn();
    $('score').hidden = !on;
    $('count').classList.toggle('off', on);
    if (on) $('score').innerHTML = `Caught <b>${st.game.caught}</b> · Slipped by <b>${st.game.missed}</b> · Extra taps <b>${st.game.extra}</b>`;
  }

  // ---------- the tick: segment changes, cues, the end ----------
  function paintSeg(w) {
    const { seg } = w;
    const same = segs.filter((s) => s.phase === seg.phase);
    $('segPhase').textContent = isFinite(total)
      ? seg.phase + (seg.phase === 'Transition' && same.length > 1 ? ` · step ${same.indexOf(seg) + 1} of ${same.length}` : '')
      : SCENE_NAMES[st.scene] || '';
    $('segTitle').textContent = seg.title;
    $('segText').textContent = seg.text || '';
    const guideOnly = st.scene === 'guide';
    $('pad').hidden = !(seg.controls.includes('breath') && guideOnly);
    $('dullBtn').hidden = !seg.controls.includes('dull');
    $('lostBtn').hidden = !seg.controls.includes('count');
    $('hint').textContent = seg.controls.includes('count') && guideOnly ? 'Tap anywhere at the end of each out-breath to count. Wandered off? Tap Lost count.' : hintText();
    const showTags = prefs.tags && !breathe && !gameOn() && seg.phase === 'Practice';
    $('tags').innerHTML = showTags ? tags.map((t) => `<button type="button" class="chip" data-tag="${esc(t)}">${esc(t)}</button>`).join('') : '';
  }
  function tick() {
    if (st.pausedAt || st.done) return;
    const w = where();
    const { seg, i, t, p } = w;
    $('clock').textContent = isFinite(total) ? fmtClock((total - w.el) * 1000) : fmtClock(w.el * 1000);
    if (w.el >= total) {
      // the closing bells were scheduled on the audio clock; only ring here if that couldn't happen
      if (prefs.bells && !st.endRung && !ac) audio.bells(3);
      return finish(true);
    }
    root.querySelectorAll('.sit-progress span i').forEach((b, k) => { b.style.width = `${k < i ? 100 : k === i ? p * 100 : 0}%`; });
    if (i !== st.lastSeg) {
      const first = st.lastSeg === -1;
      st.lastSeg = i;
      paintSeg(w);
      if (prefs.bells) first ? audio.bell() : audio.chime(0.8);
      const text = prefs.guidance === 'full' ? seg.say : prefs.guidance === 'light' ? seg.short || '' : '';
      if (voiceOn() && text) setTimeout(() => !st.done && !st.pausedAt && speak(text), first ? 2600 : 900);
      if (seg.phase === 'Closing' && seg.visual !== 'metta') ctl.count = 0;
    }
    const tips = seg.tips || [];
    const tip = tips.length ? tips[Math.floor(t / 22) % tips.length] : '';
    if ($('segTip').textContent !== tip) $('segTip').textContent = tip;
    (seg.cues || []).forEach((cue, ci) => {
      if (t < cue.first || (cue.untilFrac && p > cue.untilFrac) || seg.dur - t < 12) return;
      const k = Math.floor((t - cue.first) / cue.every), key = `${i}-${ci}-${k}`;
      if (st.fired.has(key)) return;
      st.fired.add(key);
      if (cue.pulse) ctl.pulses.push(nowS());
      if (cue.chime && prefs.bells) audio.chime(0.45);
      if (cue.texts.length) {
        if (voiceOn() && prefs.guidance === 'full') speak(cue.texts[k % cue.texts.length]);
        else if (!cue.chime && !cue.pulse && prefs.bells && prefs.guidance !== 'full') audio.chime(0.3);
      }
    });
    if (seg.scan) {
      const n = SCAN_REGIONS.length, pos = Math.min(n - 1, p * (n - 0.15));
      const r = Math.min(n - 1, Math.floor(pos)), f = pos - r, e = f < 0.7 ? 0 : (f - 0.7) / 0.3;   // dwell on a region, then glide
      const a = SCAN_REGIONS[r].y, b = SCAN_REGIONS[Math.min(n - 1, r + 1)].y;
      st.scanY = a + (b - a) * e * e * (3 - 2 * e);
      if (r !== st.lastRegion) {
        st.lastRegion = r;
        if (voiceOn() && t > 8) speak(scanLine(r));
        $('segPhase').textContent = `${seg.phase} · ${SCAN_REGIONS[r].name}`;
      }
    } else st.scanY = undefined;
  }

  // ---------- returns ----------
  function paintCount() {
    const n = st.entries.length, word = n === 1 ? 'return' : 'returns';
    $('countN').textContent = n; $('countW').textContent = word;
    $('darkN').textContent = n; $('darkW').textContent = word;
    for (const el of [$('count'), $('darkN')]) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
  }
  function ring(x, y) {
    if (x == null) return;
    const r = document.createElement('i');
    r.className = 'touch-ring';
    r.style.left = `${x}px`; r.style.top = `${y}px`;
    root.appendChild(r);
    setTimeout(() => r.remove(), 900);
  }
  function showReminder() {
    const el = $('reminder');
    el.textContent = reminders[st.remI++ % reminders.length];
    el.classList.add('show');
    clearTimeout(st.remT);
    st.remT = setTimeout(() => el.classList.remove('show'), 4200);
  }
  function doReturn({ label = '', remote = false, x, y } = {}) {
    if (st.pausedAt || st.done) return;
    const now = Date.now();
    if (now - st.lastReturn < 250) return;
    st.lastReturn = now;
    ring(x, y);
    if (gameOn() && !label) {   // listening for the hidden tone: a tap means "I hear it", not "I came back"
      const r = st.tones?.tap?.();
      if (r === 'hit') { st.game.caught++; window.Lab.Tones.ding(); } else if (r === 'nothing') { st.game.extra++; window.Lab.Tones.clank(); }
      scenes.tap(x, y, 0.5);
      paintScore();
      return;
    }
    const entry = { at: Math.round(elapsedMs()), label };
    st.entries.push(entry);
    ctl.aha.push(nowS());
    if (label) ctl.labels.push({ text: label.toLowerCase(), t: nowS(), seed: Math.random() });
    scenes.tap(x, y);
    ambient?.react();
    vibrate(12);
    if (prefs.bells) audio.returnTone(remote);
    paintCount();
    showReminder();
    return entry;
  }
  // A remote press is a return at once. A press that continues a quick chain (within half a second, up to three
  // presses) re-tags the return the chain began with, as long as that sequence has a meaning.
  function tagEntry(entry, label) {
    entry.label = label;
    ctl.labels.push({ text: label.toLowerCase(), t: nowS(), seed: Math.random() });
    const el = $('tagName');
    el.textContent = label;
    el.classList.add('show');
    clearTimeout(st.tagT);
    st.tagT = setTimeout(() => el.classList.remove('show'), 1600);
    vibrate(12);
  }
  function remotePress(ch) {
    if (st.pausedAt || st.done || !$('sheet').hidden) return;
    audio.resumeAudio();
    const now = Date.now(), map = remoteMap(store), tagging = !gameOn(), last = st.entries.at(-1);
    const seq = tagging && st.chainAt && now - st.chainAt < 500 && st.chain.length < 3 && last && last === st.chainEntry ? st.chain + ch : '';
    if (seq && map[seq]) {
      st.chain = seq; st.chainAt = now;
      tagEntry(last, map[seq]);
      return;
    }
    const entry = doReturn({ remote: true });
    if (tagging && entry) {
      st.chain = ch; st.chainEntry = entry; st.chainAt = now;
      if (map[ch]) tagEntry(entry, map[ch]);
    }
  }
  function doCount() {
    ctl.count = (ctl.count % 10) + 1;
    ctl.countAt = nowS();
    if (prefs.bells) audio.tick(0.6);
    vibrate(6);
  }
  function stageTap(e) {
    if (e.target.closest('button, .sheet, input, select, label')) return;
    wake();
    const w = where();
    if (w.seg.controls.includes('count') && st.scene === 'guide') doCount();
    else doReturn({ x: e.clientX, y: e.clientY });
  }
  function breath(down) {
    if (ctl.held === down) return;
    ctl.held = down;
    $('pad').classList.toggle('held', down);
    ctl.breathLog.push({ t: nowS(), down });
    if (ctl.breathLog.length > 400) ctl.breathLog.splice(0, 100);
  }

  // ---------- pause, sheets ----------
  function wake() {
    root.classList.remove('idle');
    clearTimeout(st.idleT);
    st.idleT = setTimeout(() => { if (!st.pausedAt && $('sheet').hidden) root.classList.add('idle'); }, 9000);
  }
  function setPaused(on) {
    if (on === !!st.pausedAt) return;
    if (on) {
      st.pausedAt = Date.now();
      audio.keepMediaAlive();
      hush();
      audio.cancelEndBells();
      ambient?.set('');
      audio.suspendAudio();
      letSleep();
    } else {
      st.pausedMs += Date.now() - st.pausedAt;
      st.pausedAt = 0;
      audio.resumeAudio();
      audio.keepMediaAlive();
      keepAwake();
      applySound();
      armEndBells();
    }
  }
  function armEndBells() {
    st.endRung = false;
    if (!prefs.bells || !isFinite(total) || !ac) return;
    audio.scheduleEndBells(total - elapsedMs() / 1000);
    st.endRung = true;
  }
  function sheet(html) {
    const el = $('sheet');
    el.hidden = !html;
    el.innerHTML = html ? `<div class="sheet-card">${html}</div>` : '';
    if (!html) wake();
  }
  function pauseSheet() {
    setPaused(true);
    const el = elapsedMs();
    sheet(`
      <div class="pause-orb" aria-hidden="true"></div>
      <h3>Paused</h3>
      <p>The timer is stopped. Take your time.</p>
      <div class="stack">
        <button class="btn primary" data-act="resume">Resume</button>
        <button class="btn" data-act="finish">${el < MIN_RECORD_MS ? 'Leave' : 'Finish the sit'}</button>
        ${el >= MIN_RECORD_MS ? '<button class="link small" data-act="discard">Leave without saving</button>' : ''}
      </div>`);
  }
  function moreSheet() {
    const scenePick = breathe ? '' : `
      <p class="field-label">Rest on</p>
      <div class="scene-row">${['guide', ...SCENE_ORDER].map((s) => `<button type="button" class="scene-chip ${st.scene === s ? 'on' : ''}" data-pick="${s}">${CANVAS_SCENES.includes(s) ? `<img src="previews/${s}.jpg" alt="">` : `<span class="scene-swatch s-${s}"></span>`}<span>${esc(SCENE_NAMES[s])}</span></button>`).join('')}</div>`;
    const presets = prefs.sound === 'dual' ? DUAL_PRESETS : prefs.sound === 'hidden' ? HID_PRESETS : null;
    const cur = prefs.sound === 'dual' ? prefs.dualPreset : prefs.hiddenPreset;
    sheet(`
      <div class="grab" aria-hidden="true"></div>
      ${scenePick}
      <p class="field-label">Sound</p>
      <div class="seg">${Object.entries(SOUND_MODES).map(([k, l]) => `<button type="button" class="seg-btn ${prefs.sound === k ? 'on' : ''}" data-sound="${k}">${l}</button>`).join('')}</div>
      ${presets ? `<select class="mt" data-preset aria-label="Setup">${Object.entries(presets).map(([k, p]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select>
        <p class="muted small">${esc((presets[cur] || Object.values(presets)[0]).note)}</p>` : ''}
      <label class="field mt"><span>Sound volume</span><input type="range" min="0" max="1" step="0.01" value="${prefs.soundVol}" data-vol></label>
      <div class="toggles">
        <label class="check"><input type="checkbox" data-pref="bells" ${prefs.bells ? 'checked' : ''}> Bells and tones</label>
        <label class="check"><input type="checkbox" data-pref="voice" ${prefs.voice ? 'checked' : ''}> Spoken guidance</label>
        <label class="check"><input type="checkbox" data-pref="tags" ${prefs.tags ? 'checked' : ''}> Show what pulled me away</label>
      </div>
      <details class="tech mt"><summary>Remote buttons</summary>${remoteHTML(store)}</details>
      <button class="btn wide mt" data-act="close-sheet">Back to the sit</button>`);
  }

  // ---------- finishing ----------
  function finish(completed, discard = false) {
    if (st.done) return;
    const dur = Math.round(Math.min(elapsedMs(), isFinite(total) ? total * 1000 : Infinity));
    st.done = true;
    cancelAnimationFrame(st.raf);
    clearInterval(st.iv); clearTimeout(st.idleT); clearTimeout(st.remT); clearTimeout(st.tagT);
    removeEventListener('keydown', onKey);
    document.removeEventListener('visibilitychange', onVis);
    audio.resumeAudio();
    if (!completed) audio.cancelEndBells();
    ambient?.stop();
    if (st.tones) window.Lab.retire(st.tones, 0.8);
    scenes.stop();
    hush();
    letSleep();
    if (discard || dur < MIN_RECORD_MS) {
      if (!discard) toast('That was under 20 seconds, so it wasn\'t saved.');
      return onFinish(null);
    }
    if (!completed && prefs.bells) audio.bell();
    const rec = { start: st.startWall, dur, returns: st.entries.length, entries: st.entries, kind: script.kind, title: script.title, done: completed };
    if (st.scene !== 'guide') rec.scene = st.scene;
    if (script.stage) rec.stage = script.stage;
    if (st.dull) rec.dull = st.dull;
    if (prep.goal) rec.goal = prep.goal;
    if (prep.motivation) rec.motivation = prep.motivation;
    if (breathe) rec.pattern = opts.pattern;
    const br = breathsFromLog(ctl.breathLog);
    if (br.length >= 3) {
      const avg = (a) => Math.round((a.reduce((x, y) => x + y, 0) / a.length) * 10) / 10;
      const outs = br.filter((b) => b.outDur > 0);
      rec.breath = { count: br.length, inAvg: avg(br.map((b) => b.inDur)), outAvg: outs.length ? avg(outs.map((b) => b.outDur)) : 0 };
    }
    store.saveSession(rec);
    store.setPrefs({ scene: breathe ? prefs.scene : st.scene });
    onFinish(rec);
  }

  // ---------- events ----------
  function onKey(e) {
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); wake(); if (!$('sheet').hidden) return; const w = where(); w.seg.controls.includes('count') && st.scene === 'guide' ? doCount() : doReturn(); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); remotePress(e.key === 'ArrowRight' ? 'N' : 'P'); }
    else if (e.key === 'p' || e.key === 'Escape') { if (st.pausedAt) { setPaused(false); sheet(''); } else pauseSheet(); }
  }
  const onVis = () => { if (!document.hidden) tick(); };
  root.addEventListener('pointerdown', stageTap);
  root.addEventListener('click', (e) => {
    const tag = e.target.closest('[data-tag]');
    if (tag) return doReturn({ label: tag.dataset.tag, x: e.clientX, y: e.clientY });
    const scene = e.target.closest('[data-pick]');
    if (scene) { setScene(scene.dataset.pick); paintSeg(where()); return moreSheet(); }
    const sound = e.target.closest('[data-sound]');
    if (sound) { store.setPrefs({ sound: sound.dataset.sound }); applySound(); paintScore(); paintSeg(where()); $('hint').textContent = hintText(); return moreSheet(); }
    if (e.target.id === 'sheet' && !st.pausedAt) return sheet('');   // tapping outside the options closes them
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    wake();
    if (act === 'pause') pauseSheet();
    else if (act === 'more') moreSheet();
    else if (act === 'close-sheet') sheet('');
    else if (act === 'resume') { setPaused(false); sheet(''); }
    else if (act === 'finish') { const short = elapsedMs() < MIN_RECORD_MS; setPaused(false); finish(false, short); }
    else if (act === 'discard') { setPaused(false); finish(false, true); }
    else if (act === 'lost') { ctl.count = 0; ctl.countAt = nowS(); doReturn(); }
    else if (act === 'dull') {
      ctl.dullAt = nowS();
      st.dull++;
      $('remedy').hidden = false;
      if (voiceOn()) speak(DULL_LINE, { interrupt: true });
      setTimeout(() => { if (!st.done) $('remedy').hidden = true; }, 9000);
    }
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('[data-preset]')) { store.setPrefs(prefs.sound === 'dual' ? { dualPreset: t.value } : { hiddenPreset: t.value }); applySound(); paintScore(); $('hint').textContent = hintText(); moreSheet(); }
    else if (t.matches('[data-pref]')) {
      store.setPrefs({ [t.dataset.pref]: t.checked });
      if (t.dataset.pref === 'voice') { configureVoice({ enabled: voiceOn() }); if (!t.checked) hush(); }
      if (t.dataset.pref === 'bells') t.checked ? armEndBells() : audio.cancelEndBells();
      paintSeg(where());
    }
  });
  root.addEventListener('input', (e) => { if (e.target.matches('[data-vol]')) { store.setPrefs({ soundVol: Number(e.target.value) }); audio.setSoundVolume(prefs.soundVol); } });
  const pad = $('pad');
  pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture?.(e.pointerId); breath(true); });
  pad.addEventListener('pointerup', () => breath(false));
  pad.addEventListener('pointercancel', () => breath(false));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', onKey);
  document.addEventListener('visibilitychange', onVis);

  // ---------- go ----------
  audio.holdAudio(remotePress);
  bindRemote($('sheet'), store, () => { moreSheet(); $('sheet').querySelector('details.tech:last-of-type').open = true; paintSeg(where()); });
  keepAwake();
  setScene(st.scene);
  paintScore();
  armEndBells();
  tick();
  wake();
  st.iv = setInterval(tick, 250);
  st.raf = requestAnimationFrame(frame);
}
