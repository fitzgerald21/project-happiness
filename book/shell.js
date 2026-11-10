// The One Line a Day book, living inside Project Happiness. The book's own code (book/js, book/css) is the
// One Line a Day app's, unchanged apart from its settings sheet; this file stands in for that app's main.js.
// It hands the book a storage adapter backed by Project Happiness's store, so there is one copy of every line.
import { h, icon, toast } from './js/ui.js';
import * as store from './js/store.js';
import { createBook } from './js/book.js';
import { applyCoverTheme } from './js/cover.js';
import { openSettings } from './js/settings.js';

const SK = 'olad.settings.v1';
let mounted = null;

function adapterFor(app) {
  let known = new Set();
  const snapshot = () => {
    const out = {};
    for (const [k, e] of Object.entries(app.state.entries)) if (e?.t) out[k] = { ...e };
    return out;
  };
  return {
    name: 'happiness',
    user: () => app.user,
    async load() {
      const entries = snapshot();
      known = new Set(Object.keys(entries));
      let settings = null;
      try { settings = await app.getDoc('app'); } catch { /* offline: fall back to this device's copy */ }
      if (!settings) { try { settings = JSON.parse(localStorage.getItem(SK)) || {}; } catch { settings = {}; } }
      return { entries, settings };
    },
    async saveEntries(changes) {
      for (const [k, e] of Object.entries(changes)) { app.putEntry(k, e); if (e) known.add(k); else known.delete(k); }
    },
    async saveSettings(synced) {
      try { localStorage.setItem(SK, JSON.stringify(synced)); } catch { /* full */ }
      await app.patchDoc('app', synced);
    },
    async clearAll() { throw new Error('Deleting the whole book is only possible from the One Line a Day app.'); },
    // Lines changed elsewhere (Today, another device) reach the open book. Days being typed in are left alone by the book's store.
    subscribe(cb) {
      return app.on((what) => {
        if (what !== 'entries') return;
        const now = snapshot(), msg = { ...now };
        for (const k of known) if (!now[k]) msg[k] = null;
        known = new Set(Object.keys(now));
        cb({ entries: msg });
      });
    },
  };
}

async function makeBook() {
  if (store.getSettings().book3d) {
    try {
      const { createBook3D } = await import('./js/book3d.js');
      return createBook3D({ openSettings });
    } catch (err) {
      console.warn('3D book unavailable, using the flat book:', err);
    }
  }
  return createBook({ openSettings });
}

/** Builds the book once and returns { show(key), hide() }. `host` is an empty element; `onClose` leaves the book. */
export async function mountBook(app, host, onClose) {
  if (mounted) return mounted;
  await store.init(adapterFor(app));
  const apply = () => {
    document.documentElement.dataset.hand = store.getSettings().hand;
    applyCoverTheme(store.getSettings().cover);
  };
  apply();
  store.onSettings(apply);
  store.onStoreError((err) => toast(err?.message || 'Couldn’t save. Your latest edits will retry.', { ms: 7000 }));

  const book = await makeBook();
  const header = h('header.topbar',
    h('button.tab.on', { type: 'button', onclick: () => onClose() }, icon('left', 18), h('span', 'Back')),
    h('div.brand', { style: { margin: '0 auto' } }, h('span.brand-mark', icon('book', 18)), h('span.brand-name', 'One Line a Day')),
    h('div.top-actions', h('button.icon-btn', { type: 'button', 'aria-label': 'Book settings', title: 'Book settings', onclick: () => openSettings() }, icon('sliders', 22))));
  const section = h('section.view#view-book', book.el);
  host.append(header, h('main.views', section));

  const onKey = (e) => {
    if (host.hidden || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('dialog[open]')) return;
    if (/^(input|textarea|select)$/i.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable) return;
    if (book.handleKey(e)) e.preventDefault();
  };
  addEventListener('keydown', onKey);

  mounted = {
    show(key) {
      document.body.dataset.view = 'book';
      book.refresh?.();
      if (key) book.goToKey(key);
    },
    hide() { store.flush(); delete document.body.dataset.view; },
  };
  return mounted;
}
