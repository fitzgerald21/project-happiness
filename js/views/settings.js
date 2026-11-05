import { esc, toast } from '../lib/util.js';
import { dayKey } from '../lib/dates.js';
import { defaultState } from '../store.js';

export function render(root, ctx) {
  const { store, config } = ctx;
  const s = store.state;
  const adapter = store.adapter;
  const cloud = !!config.firebase && 'signedIn' in adapter;

  root.innerHTML = `
    <header class="page-head">
      <p class="eyebrow">Settings</p>
      <h1>Your space.</h1>
    </header>

    <section class="card">
      <label class="field"><span>Name</span><input name="name" value="${esc(s.profile.name)}" placeholder="Your name"></label>
      <label class="field"><span>The people you want to be present with</span>
        <input name="people" value="${esc(s.profile.people.join(', '))}" placeholder="my wife, my baby"></label>
      <p class="muted small">Separate them with commas. They show up on Today under "I was really there with…".</p>
      <button class="btn" data-action="save-profile">Save</button>
    </section>

    <section class="card">
      <h2>Look and sound</h2>
      <p class="field-label">Theme</p>
      <div class="seg">${['system', 'light', 'dark'].map((t) => `<button type="button" class="seg-btn ${s.settings.theme === t ? 'on' : ''}" data-action="theme" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join('')}</div>
      <label class="check mt"><input type="checkbox" name="bell" ${s.settings.bell ? 'checked' : ''}> Bell at the start and end of a sit</label>
      <button class="link small" data-action="test-bell">Play the bell</button>
      <p class="muted small">On iPhone, the silent switch also mutes the bell.</p>
    </section>

    <section class="card">
      <h2>Your data</h2>
      <p class="small">${cloud
        ? (adapter.signedIn ? 'Syncing to your Firebase account.' : 'Firebase is set up. Sign in to sync between devices.')
        : 'Everything is stored on this device only, in this browser. Nothing is sent anywhere. Export a backup now and then.'}</p>
      ${cloud ? `<button class="btn" data-action="${adapter.signedIn ? 'sign-out' : 'sign-in'}">${adapter.signedIn ? 'Sign out' : 'Sign in with Google'}</button>` : ''}
      <div class="stack mt">
        <button class="btn" data-action="export">Export backup (JSON)</button>
        <label class="btn file-btn">Import backup<input type="file" accept="application/json,.json" name="import" hidden></label>
        <button class="btn ghost danger" data-action="reset">Erase everything</button>
      </div>
    </section>

    <section class="card soft">
      <h2>About</h2>
      <p class="small">Project Happiness is a small, quiet tool for being less scattered and more here. It's built on secular Buddhist ideas: no shoulds, noticing without judging, the middle way, and beginning again.</p>
      <p class="small">On your phone, use "Add to Home Screen" from the browser's share menu to make it feel like an app. It works offline.</p>
    </section>
  `;

  root.onchange = async (e) => {
    if (e.target.name === 'bell') {
      store.update((st) => { st.settings.bell = e.target.checked; });
    } else if (e.target.name === 'import') {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const data = JSON.parse(await file.text());
        if (!data || typeof data !== 'object' || !data.profile) throw new Error('not a backup');
        if (!confirm('Replace everything on this device with this backup?')) return;
        store.replace(data);
        ctx.applyTheme(store.state.settings.theme);
        toast('Backup restored.');
        ctx.rerender();
      } catch (err) {
        toast("That file doesn't look like a Project Happiness backup.");
      }
    }
  };

  root.onclick = async (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'save-profile') {
      const name = root.querySelector('[name="name"]').value.trim();
      const people = root.querySelector('[name="people"]').value.split(',').map((p) => p.trim()).filter(Boolean);
      store.update((st) => { st.profile.name = name; st.profile.people = people; });
      toast('Saved.');
    } else if (a === 'theme') {
      store.update((st) => { st.settings.theme = el.dataset.v; });
      ctx.applyTheme(el.dataset.v);
      ctx.rerender();
    } else if (a === 'test-bell') {
      const { bell } = await import('../lib/audio.js');
      bell();
    } else if (a === 'export') {
      const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `project-happiness-${dayKey()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } else if (a === 'reset') {
      if (!confirm('Erase all check-ins, sits, experiments, and journal entries on this device? You can\'t undo this.')) return;
      store.replace(defaultState());
      ctx.applyTheme('system');
      toast('Fresh start.');
      ctx.go('today');
    } else if (a === 'sign-in') {
      try { await adapter.signIn(); location.reload(); } catch (err) { toast('Sign-in failed.'); }
    } else if (a === 'sign-out') {
      await adapter.signOut();
      location.reload();
    }
  };
}
