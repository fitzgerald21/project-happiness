// The app's one data layer. Everything is kept in memory with a synchronous API for the views, cached in
// this browser's localStorage so the app opens instantly and works signed out, and mirrored to Firestore
// when signed in (see cloud.js for where each kind of thing lives).
//
//   state.profile      name, why, happiness map, people
//   state.prefs        theme, sit defaults, stage on the path
//   state.experiments  { id: experiment }
//   state.days         { 'YYYY-MM-DD': { checks:[{ts,settled,heart,word}], intention, presence:[{ts,with}], reflect:{prompt,text} } }
//   state.urges        { id: { ts, target, feeling, outcome, detail } }
//   state.sessions     [ { start, dur, returns, entries:[{at,label}], scene, feel, note, ...extras } ]  (Come back's shape)
//   state.entries      { 'YYYY-MM-DD': { t, r?, u } }                                                  (One Line a Day's shape)
//   state.cb           what we read from Come back's settings: reminders, distraction presets, total returns
import { DEFAULT_HAPPINESS, DEFAULT_WHY } from '../lib/content.js';
import { dayKey, keyOfTs } from '../lib/dates.js';

const K = { core: 'ph2:core', log: 'ph2:log', sessions: 'ph2:sessions', entries: 'ph2:entries', cb: 'ph2:cb', pending: 'ph2:pending', seeded: 'ph2:seeded' };
const FIRST_YEAR = 2026;

const DEFAULT_PREFS = {
  theme: 'auto',        // auto | light | dark
  stage: 1,             // where you are on the ten-stage path
  practice: 'stage',    // what the Sit tab opens on
  minutes: 20,
  scene: 'guide',       // 'guide' (the figure that shows the technique) or one of the restful scenes
  sound: 'scene',       // scene | dual | hidden | silent
  soundVol: 0.7,
  dualPreset: 'easy',
  hiddenPreset: 'always',
  bells: true,
  bellVol: 0.7,
  voice: true,
  voiceName: '',
  guidance: 'full',     // full | light | bells
  prep: true,
  tags: true,           // show "what pulled you away" buttons during a sit
};

const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn('Could not save', k, e); } };

// Firestore merges maps key by key, so a removed key is written as null. Strip those on the way in.
function clean(v) {
  if (Array.isArray(v)) return v.filter((x) => x != null).map(clean);
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, x] of Object.entries(v)) if (x != null) o[k] = clean(x);
    return o;
  }
  return v;
}
const yearOf = (k) => Number(String(k).slice(0, 4));

function defaults() {
  return {
    profile: { name: '', onboarded: false, why: DEFAULT_WHY, happiness: [...DEFAULT_HAPPINESS], people: ['my wife', 'my baby'] },
    prefs: { ...DEFAULT_PREFS },
    experiments: {},
    days: {},
    urges: {},
    sessions: [],
    entries: {},
    cb: { reminders: [], presets: [], total: 0, remote: null },
  };
}

export function createStore() {
  const listeners = new Set();
  const state = defaults();
  let cloud = null;
  let user = null;
  let sync = 'local';   // local | syncing | synced | error
  let pending = read(K.pending, { core: false, years: [], sessions: [], gone: [], entries: [] });

  const emit = (what) => listeners.forEach((fn) => fn(what));
  const setSync = (s) => { if (s !== sync) { sync = s; emit('sync'); } };
  const savePending = () => write(K.pending, pending);
  const persist = (...parts) => {
    for (const p of parts) {
      if (p === 'core') write(K.core, { profile: state.profile, prefs: state.prefs, experiments: state.experiments });
      else if (p === 'log') write(K.log, { days: state.days, urges: state.urges });
      else write(K[p], state[p]);
    }
  };
  // Send a write to the cloud, or remember it for when there is one.
  const push = (fn, remember) => {
    if (cloud && user) {
      setSync('syncing');
      Promise.resolve().then(fn).then(() => setSync('synced'), (e) => { console.warn('Sync failed', e); remember?.(); savePending(); setSync('error'); });
    } else { remember?.(); savePending(); }
  };
  const add = (list, v) => { if (!list.includes(v)) list.push(v); };

  // ---------- loading ----------
  function loadLocal() {
    const core = read(K.core, null), log = read(K.log, null);
    if (core) {
      state.profile = { ...state.profile, ...core.profile };
      state.prefs = { ...DEFAULT_PREFS, ...core.prefs };
      state.experiments = core.experiments || {};
    }
    if (log) { state.days = log.days || {}; state.urges = log.urges || {}; }
    state.sessions = read(K.sessions, []);
    state.entries = read(K.entries, {});
    state.cb = { ...state.cb, ...read(K.cb, {}) };
    if (!read(K.seeded, false)) seedFromOtherApps();
  }

  // The first time this app opens in a browser, bring in what the earlier apps left here. They are all served
  // from the same site, so their localStorage is readable. Sits and journal lines that are already in the
  // account come down again from the cloud on sign-in; these copies only matter until then.
  function seedFromOtherApps() {
    write(K.seeded, true);
    const old = read('ph:v1', null);           // the first Project Happiness
    if (old) {
      if (old.profile) state.profile = { ...state.profile, ...old.profile };
      for (const [d, c] of Object.entries(old.checkins || {})) {
        const day = (state.days[d] ||= {});
        if (c.settled || c.heart || c.word) day.checks = [{ ts: +new Date(`${d}T09:00`), settled: c.settled || null, heart: c.heart || null, word: c.word || '' }];
        if (c.intention) day.intention = c.intention;
      }
      for (const p of old.presence || []) ((state.days[keyOfTs(p.ts)] ||= {}).presence ||= []).push({ ts: p.ts, with: p.with });
      for (const j of old.journal || []) (state.days[j.day] ||= {}).reflect = { prompt: j.prompt, text: j.text };
      for (const u of old.urges || []) state.urges[u.id] = u;
      for (const e of old.experiments || []) state.experiments[e.id] = e;
      for (const s of old.sits || []) {
        const dur = Math.round(s.minutes * 60000);
        state.sessions.push({ start: s.ts - dur, dur, returns: 0, entries: [], kind: s.kind === 'breathe' ? 'breathe' : 'timer', ...(s.note ? { note: s.note } : {}) });
        add(pending.sessions, s.ts - dur);
      }
      pending.core = true;
      Object.keys(state.days).forEach((d) => add(pending.years, yearOf(d)));
      Object.values(state.urges).forEach((u) => add(pending.years, new Date(u.ts).getFullYear()));
    }
    const lantern = read('lantern.v1', null);  // Lantern never synced, so its sits exist only here
    if (lantern) {
      if (lantern.stage) { state.prefs.stage = lantern.stage; pending.core = true; }
      for (const s of lantern.sessions || []) {
        const end = Date.parse(s.date), dur = Math.round((s.minutes || 0) * 60000);
        if (!end || dur < 20000) continue;
        const rec = { start: end - dur, dur, returns: s.aha || 0, entries: [], kind: s.kind, title: s.title, stage: s.stage, done: !!s.completed };
        if (s.stability) rec.stability = s.stability;
        if (s.clarity) rec.clarity = s.clarity;
        if (s.notes) rec.note = s.notes;
        if (s.dullness) rec.dull = s.dullness;
        state.sessions.push(rec);
        add(pending.sessions, rec.start);
      }
    }
    try {                                      // Come back and One Line a Day: a local copy to show until the cloud answers
      const cb = JSON.parse(localStorage.getItem('come-back:sessions') || '[]');
      const have = new Set(state.sessions.map((r) => r.start));
      for (const r of cb) if (r && typeof r.start === 'number' && !have.has(r.start)) state.sessions.push(r);
      const rem = localStorage.getItem('come-back:reminders');
      if (rem) state.cb.reminders = rem.split('\n').filter(Boolean);
      state.cb.presets = read('come-back:presets', []);
      state.cb.remote = read('come-back:remote', null);
      state.cb.total = parseInt(localStorage.getItem('come-back:total') || '0', 10) || 0;
      const olad = read('olad.entries.v1', {});
      for (const [k, e] of Object.entries(olad)) if (/^\d{4}-\d{2}-\d{2}$/.test(k) && e?.t && !state.entries[k]) state.entries[k] = e;
    } catch { /* nothing usable */ }
    state.sessions.sort((a, b) => a.start - b.start);
    persist('core', 'log', 'sessions', 'entries', 'cb');
    savePending();
  }

  // ---------- cloud ----------
  const coreDoc = () => ({ profile: state.profile, prefs: state.prefs, experiments: state.experiments });
  const logDoc = (y) => {
    const days = {}, urges = {};
    for (const [d, v] of Object.entries(state.days)) if (yearOf(d) === y) days[d] = v;
    for (const [id, u] of Object.entries(state.urges)) if (new Date(u.ts).getFullYear() === y) urges[id] = u;
    return { days, urges };
  };
  const years = () => { const out = []; for (let y = FIRST_YEAR; y <= new Date().getFullYear(); y++) out.push(y); return out; };

  function applyCore(d) {
    if (!d) return;
    d = clean(d);
    state.profile = { ...defaults().profile, ...d.profile };
    state.prefs = { ...DEFAULT_PREFS, ...d.prefs };
    state.experiments = d.experiments || {};
    persist('core');
    emit('core');
  }
  function applyLog(y, d) {
    d = clean(d || {});
    for (const k of Object.keys(state.days)) if (yearOf(k) === y) delete state.days[k];
    for (const [id, u] of Object.entries(state.urges)) if (new Date(u.ts).getFullYear() === y) delete state.urges[id];
    Object.assign(state.days, d.days || {});
    Object.assign(state.urges, d.urges || {});
    persist('log');
    emit('log');
  }

  async function link(u) {
    user = u;
    emit('user');
    if (!u) { setSync('local'); return; }
    setSync('syncing');
    const fail = (e) => { console.warn('Sync error', e); setSync('error'); };
    try {
      // What this device made while signed out goes up first, so the listeners below see one merged picture.
      // The writes aren't awaited: offline they sit in Firestore's queue, and waiting would hold up everything else.
      const late = (p) => p.catch(fail);
      const remoteCore = await cloud.getOwn('ph');
      if (!remoteCore || pending.core) late(cloud.patchOwn('ph', coreDoc()));
      for (const y of years()) {
        const local = logDoc(y);
        const has = Object.keys(local.days).length || Object.keys(local.urges).length;
        if (has && (pending.years.includes(y) || !(await cloud.getOwn(`ph-log-${y}`)))) late(cloud.patchOwn(`ph-log-${y}`, local));
      }
      const byStart = new Map(state.sessions.map((r) => [r.start, r]));
      for (const st of pending.sessions) if (byStart.has(st)) late(cloud.putSession(byStart.get(st)));
      for (const st of pending.gone) late(cloud.deleteSession(st));
      for (const d of pending.entries) late(cloud.putEntry(d, state.entries[d]));
      pending = { core: false, years: [], sessions: [], gone: [], entries: [] };
      savePending();
    } catch (e) { fail(e); }

    cloud.watchOwn('ph', applyCore, fail);
    for (const y of years()) cloud.watchOwn(`ph-log-${y}`, (d) => applyLog(y, d), fail);
    cloud.watchSessions((list) => {
      const keep = new Set(pending.sessions);
      const seen = new Set(list.map((r) => r.start));
      state.sessions = list.concat(state.sessions.filter((r) => keep.has(r.start) && !seen.has(r.start))).sort((a, b) => a.start - b.start);
      persist('sessions');
      emit('sessions');
      setSync('synced');
    }, fail);
    cloud.watchEntries((map) => {
      for (const d of pending.entries) if (state.entries[d]) map[d] = state.entries[d]; else delete map[d];
      state.entries = map;
      persist('entries');
      emit('entries');
    }, fail);
    cloud.watchComeBack((data) => {
      const parse = (s, d) => { try { return JSON.parse(s) ?? d; } catch { return d; } };
      state.cb = {
        reminders: String(data.reminders || '').split('\n').filter(Boolean),
        presets: parse(data.presets, []),
        total: parseInt(data.total || '0', 10) || 0,
        remote: data.remote != null ? parse(data.remote, null) : state.cb.remote,
      };
      persist('cb');
      emit('cb');
    }, fail);
  }

  const store = {
    state,
    get user() { return user; },
    get sync() { return sync; },
    get cloudReady() { return !!cloud; },

    async init(config) {
      loadLocal();
      if (!config?.firebase) return;
      try {
        const { createCloud } = await import('./cloud.js');
        cloud = await createCloud(config.firebase);
        cloud.onUser(link);
      } catch (e) {
        console.warn('Cloud unavailable; staying on this device', e);   // offline at first launch, or blocked
      }
    },
    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    signIn: () => cloud?.signIn(),
    signOut: () => cloud?.signOut(),

    // ---------- profile, preferences ----------
    setProfile(patch) {
      Object.assign(state.profile, patch);
      persist('core');
      push(() => cloud.patchOwn('ph', { profile: patch }), () => { pending.core = true; });
      emit('core');
    },
    setPrefs(patch) {
      Object.assign(state.prefs, patch);
      persist('core');
      push(() => cloud.patchOwn('ph', { prefs: patch }), () => { pending.core = true; });
      emit('core');
    },

    // ---------- experiments ----------
    putExperiment(e) {
      state.experiments[e.id] = e;
      persist('core');
      // checks removed on this device have to be nulled in the cloud copy, since maps merge
      push(() => Promise.all([cloud.patchOwn('ph', { experiments: { [e.id]: null } }), cloud.patchOwn('ph', { experiments: { [e.id]: e } })]), () => { pending.core = true; });
      emit('core');
    },

    // ---------- the day ----------
    day(k = dayKey()) { return state.days[k] || {}; },
    patchDay(k, patch) {
      state.days[k] = clean({ ...state.days[k], ...patch });
      persist('log');
      const y = yearOf(k);
      push(() => cloud.patchOwn(`ph-log-${y}`, { days: { [k]: patch } }), () => add(pending.years, y));
      emit('log');
    },
    addCheck(check, k = dayKey()) {
      this.patchDay(k, { checks: [...(this.day(k).checks || []), check] });
    },
    addPresence(who) {
      const k = dayKey();
      this.patchDay(k, { presence: [...(this.day(k).presence || []), { ts: Date.now(), with: who }] });
    },
    addUrge(u) {
      state.urges[u.id] = u;
      persist('log');
      const y = new Date(u.ts).getFullYear();
      push(() => cloud.patchOwn(`ph-log-${y}`, { urges: { [u.id]: u } }), () => add(pending.years, y));
      emit('log');
    },

    // ---------- sits ----------
    totalReturns() { return Math.max(state.cb.total || 0, state.sessions.reduce((a, r) => a + (r.returns || 0), 0)); },
    saveSession(rec) {
      const before = this.totalReturns();
      const old = state.sessions.find((r) => r.start === rec.start);
      state.sessions = state.sessions.filter((r) => r.start !== rec.start).concat(rec).sort((a, b) => a.start - b.start);
      const total = before + (rec.returns || 0) - (old ? old.returns || 0 : 0);
      state.cb.total = total;
      persist('sessions', 'cb');
      push(() => Promise.all([cloud.putSession(rec), cloud.setComeBackTotal(total)]), () => add(pending.sessions, rec.start));
      emit('sessions');
    },
    patchSession(start, patch) {
      const r = state.sessions.find((x) => x.start === start);
      if (!r) return;
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete r[k]; else r[k] = v;
      }
      persist('sessions');
      push(() => cloud.putSession(r), () => add(pending.sessions, start));
      emit('sessions');
    },
    deleteSession(start) {
      const r = state.sessions.find((x) => x.start === start);
      if (!r) return;
      const total = Math.max(0, this.totalReturns() - (r.returns || 0));
      state.sessions = state.sessions.filter((x) => x.start !== start);
      state.cb.total = total;
      pending.sessions = pending.sessions.filter((s) => s !== start);
      persist('sessions', 'cb');
      push(() => Promise.all([cloud.deleteSession(start), cloud.setComeBackTotal(total)]), () => add(pending.gone, start));
      savePending();
      emit('sessions');
    },

    // ---------- the book ----------
    line(k = dayKey()) { return state.entries[k]?.t || ''; },
    setLine(k, text) {
      text = String(text ?? '').replace(/\r/g, '').trimEnd();
      if ((state.entries[k]?.t || '') === text) return;
      if (text) state.entries[k] = { ...state.entries[k], t: text, u: Date.now() }; else delete state.entries[k];
      persist('entries');
      push(() => cloud.putEntry(k, state.entries[k]), () => add(pending.entries, k));
      emit('entries');
    },

    /** The book writes whole entries (text plus the original before summarizing); null removes the day. */
    putEntry(k, e) {
      if (e?.t) state.entries[k] = { ...e }; else delete state.entries[k];
      persist('entries');
      push(() => cloud.putEntry(k, state.entries[k]), () => add(pending.entries, k));
      emit('entries');
    },
    // The book keeps its own synced settings (cover, handwriting, layout) in settings/app, as One Line a Day does.
    getDoc: (name) => (cloud && user ? cloud.getOwn(name) : Promise.resolve(null)),
    patchDoc: (name, patch) => (cloud && user ? cloud.patchOwn(name, patch) : Promise.resolve()),

    // ---------- Come back's remote buttons and distraction list (kept in its settings, so both apps agree) ----------
    setRemote(map) {
      state.cb.remote = map;
      persist('cb');
      push(() => cloud.setComeBack('remote', JSON.stringify(map)));
      emit('cb');
    },
    setPresets(list) {
      state.cb.presets = list;
      persist('cb');
      push(() => cloud.setComeBack('presets', JSON.stringify(list)));
      emit('cb');
    },

    // ---------- backup ----------
    exportData() {
      return JSON.stringify({ app: 'project-happiness', version: 2, exportedAt: new Date().toISOString(), ...coreDoc(), days: state.days, urges: state.urges, sessions: state.sessions, entries: state.entries }, null, 1);
    },
  };
  return store;
}
