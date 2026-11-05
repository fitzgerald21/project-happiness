import { createStore, LocalAdapter } from './store.js';
import { config } from './config.js';
import * as today from './views/today.js';
import * as sit from './views/sit.js';
import * as pause from './views/pause.js';
import * as experiments from './views/experiments.js';
import * as reflect from './views/reflect.js';
import * as settings from './views/settings.js';

const routes = { today, sit, pause, experiments, reflect, settings };

function applyTheme(theme) {
  const el = document.documentElement;
  if (theme === 'light' || theme === 'dark') el.dataset.theme = theme;
  else delete el.dataset.theme;
}

async function main() {
  let adapter = new LocalAdapter();
  if (config.firebase) {
    try {
      const { FirebaseAdapter } = await import('./adapters/firebase.js');
      adapter = new FirebaseAdapter(config.firebase);
    } catch (e) {
      console.warn('Firebase unavailable, staying local', e);
    }
  }
  const store = createStore(adapter);
  await store.init();
  applyTheme(store.state.settings.theme);

  const root = document.getElementById('view');
  let cleanup = null;

  const routeName = () => {
    const r = location.hash.replace(/^#\/?/, '').split('?')[0];
    return routes[r] ? r : 'today';
  };

  const ctx = {
    store,
    config,
    go: (name) => { location.hash = `#/${name}`; },
    rerender: () => render(false),
    applyTheme,
  };

  function render(scrollTop = true) {
    if (cleanup) cleanup();
    cleanup = null;
    const name = routeName();
    document.querySelectorAll('.tabs a').forEach((a) => {
      const on = a.dataset.route === name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    root.onclick = root.oninput = root.onchange = root.onsubmit = null;
    cleanup = routes[name].render(root, ctx) || null;
    if (scrollTop) window.scrollTo(0, 0);
  }

  store.subscribe((_, source) => { if (source === 'remote') render(false); });
  window.addEventListener('hashchange', () => {
    document.getElementById('toast')?.classList.remove('show');
    render(true);
  });
  render(true);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
