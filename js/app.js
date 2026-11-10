import { createStore } from './data/store.js';
import { config } from './config.js';
import { openSit, sitIsOpen } from './sit/player.js';
import * as today from './views/today.js';
import * as sit from './views/sit.js';
import * as pause from './views/pause.js';
import * as path from './views/path.js';
import * as book from './views/book.js';
import * as settings from './views/settings.js';

const routes = { today, sit, pause, path, book, settings };

function applyTheme(theme) {
  const el = document.documentElement;
  if (theme === 'light' || theme === 'dark') el.dataset.theme = theme;
  else delete el.dataset.theme;
}

async function main() {
  const store = createStore();
  const root = document.getElementById('view');
  let cleanup = null;
  let started = false;

  // #/book/2026-11-09 -> { name: 'book', args: ['2026-11-09'] }
  const parse = () => {
    const [name, ...args] = location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
    return routes[name] ? { name, args: args.map(decodeURIComponent) } : { name: 'today', args: [] };
  };

  const ctx = {
    store,
    config,
    args: [],
    focus: null,   // a one-shot hint for the next render, e.g. go('today', 'line') scrolls to the line
    go(name, focus = null) {
      ctx.focus = focus;
      if (location.hash === `#/${name}`) render(true); else location.hash = `#/${name}`;
    },
    rerender: () => render(false),
    startSit: (opts) => openSit(ctx, opts),
    applyTheme,
  };

  function render(scrollTop = true) {
    if (!started) return;
    if (cleanup) cleanup();
    cleanup = null;
    const { name, args } = parse();
    ctx.args = args;
    document.querySelectorAll('.tabs a').forEach((a) => {
      const on = a.dataset.route === name;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    root.onclick = root.oninput = root.onchange = root.onkeydown = null;
    root.dataset.route = name;
    cleanup = routes[name].render(root, ctx) || null;
    ctx.focus = null;
    if (scrollTop) window.scrollTo(0, 0);
  }

  // Data can change underneath a view (another device, a sync finishing, a save). Repaint, but never
  // while someone is typing or sitting.
  let timer = 0;
  store.on((what) => {
    if (what === 'core') applyTheme(store.state.prefs.theme);
    clearTimeout(timer);
    timer = setTimeout(() => {
      const a = document.activeElement;
      if (sitIsOpen() || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName))) return;
      render(false);
    }, 60);
  });

  await store.init(config);
  applyTheme(store.state.prefs.theme);
  started = true;
  window.addEventListener('hashchange', () => {
    document.getElementById('toast')?.classList.remove('show');
    render(true);
  });
  render(true);
  // the sky and the day roll over on their own if the app is left open
  setInterval(() => { if (!sitIsOpen() && parse().name === 'today' && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) render(false); }, 5 * 60000);

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

main();
