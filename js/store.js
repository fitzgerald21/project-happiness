// The store keeps the whole app state in memory and hands it to an "adapter"
// to persist. Today the adapter is localStorage. Later a Firebase adapter with
// the same two methods (load, save) can be dropped in with no other changes.
//
//   adapter.load()      -> Promise<state | null>
//   adapter.save(state) -> void | Promise<void>
//   adapter.subscribe?(cb) -> unsubscribe   (optional: remote changes)

import { DEFAULT_HAPPINESS, DEFAULT_WHY } from './lib/content.js';

export const STORAGE_KEY = 'ph:v1';
export const SCHEMA_VERSION = 1;

export function defaultState() {
  return {
    version: SCHEMA_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    profile: {
      name: '',
      onboarded: false,
      why: DEFAULT_WHY,
      happiness: [...DEFAULT_HAPPINESS],
      people: ['my wife', 'my baby'],
    },
    settings: {
      theme: 'system', // system | light | dark
      bell: true,
      defaultSit: 10,
    },
    // checkins: { 'YYYY-MM-DD': { settled: 1-5, heart: 1-5, word, intention } }
    checkins: {},
    // sits: [{ id, ts, minutes, kind: 'sit'|'breathe', pattern?, note? }]
    sits: [],
    // urges: [{ id, ts, target, feeling, outcome: 'redirected'|'chose'|'lapsed', detail? }]
    urges: [],
    // presence: [{ id, ts, with }]
    presence: [],
    // experiments: [{ id, title, why, ifSlip, days, start, checks: { day: 'yes'|'partly'|'no' },
    //                 status: 'active'|'kept'|'lighter'|'released', reflection?, endedAt? }]
    experiments: [],
    // journal: [{ id, ts, day, prompt, text }]
    journal: [],
  };
}

export function migrate(data) {
  const base = defaultState();
  if (!data || typeof data !== 'object') return base;
  return {
    ...base,
    ...data,
    version: SCHEMA_VERSION,
    profile: { ...base.profile, ...(data.profile || {}) },
    settings: { ...base.settings, ...(data.settings || {}) },
    checkins: data.checkins || {},
    sits: data.sits || [],
    urges: data.urges || [],
    presence: data.presence || [],
    experiments: data.experiments || [],
    journal: data.journal || [],
  };
}

export class LocalAdapter {
  async load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }
  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save', e);
    }
  }
}

export function createStore(adapter) {
  const listeners = new Set();
  const store = {
    state: defaultState(),
    adapter,
    async init() {
      this.state = migrate(await adapter.load());
      adapter.subscribe?.((remote) => {
        if (remote && (remote.updatedAt || 0) > (this.state.updatedAt || 0)) {
          this.state = migrate(remote);
          listeners.forEach((l) => l(this.state, 'remote'));
        }
      });
    },
    update(fn) {
      fn(this.state);
      this.state.updatedAt = Date.now();
      adapter.save(this.state);
      listeners.forEach((l) => l(this.state, 'local'));
    },
    replace(data) {
      this.state = migrate(data);
      this.state.updatedAt = Date.now();
      adapter.save(this.state);
      listeners.forEach((l) => l(this.state, 'local'));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
  return store;
}
