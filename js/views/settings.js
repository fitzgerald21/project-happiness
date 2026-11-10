// Settings: your account, how the app looks and sounds, and a backup.
import { esc, toast } from '../lib/util.js';
import { RECORDED_VOICES, recordedVoiceName, configureVoice, speak } from '../sit/voice.js';
import { unlockAudio, bell, setBellVolume } from '../sit/audio.js';
import { SAMPLE_LINE } from '../sit/script.js';
import { remoteHTML, bindRemote, remoteMap } from '../sit/remote.js';

export function render(root, ctx) {
  const { store, config } = ctx;
  const s = store.state, prefs = s.prefs, user = store.user;
  const seg = (name, opts, cur) => `<div class="seg">${opts.map(([v, l]) => `<button type="button" class="seg-btn ${cur === v ? 'on' : ''}" data-set="${name}" data-v="${v}">${l}</button>`).join('')}</div>`;
  const status = { local: 'Kept on this device only.', syncing: 'Syncing…', synced: 'Everything is backed up.', error: "Couldn't reach the cloud just now. Changes are kept here and will go up later." }[store.sync];
  const wrongAccount = user && config.ownerEmail && user.email !== config.ownerEmail;

  root.innerHTML = `
    <header class="page-head">
      <a class="link small" href="#/today">‹ Today</a>
      <h1 style="margin-top:8px">Settings</h1>
    </header>

    <section class="card">
      <h2>Account</h2>
      ${!store.cloudReady ? '<p class="muted">Cloud sync isn\'t available right now (offline, or not set up). Everything is saved on this device.</p>'
        : user ? `<p>Signed in as <strong>${esc(user.email)}</strong>.</p><p class="muted small"><span class="sync-dot ${store.sync}"></span>${status}</p>
            ${wrongAccount ? `<p class="slip">The journal pages and day notes are locked to ${esc(config.ownerEmail)}. On this account only sits will sync.</p>` : ''}
            <button class="btn" data-action="signout">Sign out</button>`
          : `<p class="muted">Sign in with the Google account you use for Come back and One Line a Day. Your sits and your book come in, and everything stays in step across your devices.</p>
            <button class="btn primary" data-action="signin">Sign in with Google</button>`}
    </section>

    <section class="card">
      <h2>You</h2>
      <label class="field"><span>Name</span><input name="name" value="${esc(s.profile.name)}" autocomplete="given-name"></label>
      <p class="muted small">Your why, what makes you happy, and who you want to be there for live under <a href="#/path/compass">Path → Compass</a>.</p>
    </section>

    <section class="card">
      <h2>Look</h2>
      ${seg('theme', [['auto', 'Match my phone'], ['light', 'Paper'], ['dark', 'Night']], prefs.theme)}
    </section>

    <section class="card">
      <h2>Sitting</h2>
      <p class="field-label">Bells</p>
      ${seg('bells', [[true, 'On'], [false, 'Off']], prefs.bells)}
      <label class="field"><span>Bell volume</span><input type="range" name="bellVol" min="0.1" max="1" step="0.05" value="${prefs.bellVol}"></label>
      <p class="field-label">Spoken guidance</p>
      ${seg('voice', [[true, 'On'], [false, 'Off']], prefs.voice)}
      <label class="field"><span>Voice</span><select name="voiceName">${RECORDED_VOICES.map((v) => `<option value="${recordedVoiceName(v.id)}" ${prefs.voiceName === recordedVoiceName(v.id) ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
      <button class="btn" data-action="test">Hear a bell and the voice</button>
      <label class="check mt"><input type="checkbox" name="tags" ${prefs.tags ? 'checked' : ''}> During a sit, show buttons for what pulled me away</label>
      <label class="check"><input type="checkbox" name="prep" ${prefs.prep ? 'checked' : ''}> Start guided sits with the six preparation steps</label>
      <p class="muted small">Your reminders and distraction list come from Come back, so edits you make there show up here.</p>
    </section>

    <section class="card" id="remote">
      <div class="card-head"><h2>Remote buttons</h2><span class="muted small">${Object.keys(remoteMap(store)).length} set</span></div>
      <p class="muted small">For a handheld remote, a camera shutter or earbuds. Pick what each button means. You can change these during a sit too.</p>
      ${remoteHTML(store)}
    </section>

    <section class="card">
      <h2>Backup</h2>
      <p class="muted small">A file with everything: sits, lines, check-ins, experiments.</p>
      <button class="btn" data-action="export">Download a backup</button>
    </section>

    <section class="card soft">
      <h2>Where things live</h2>
      <p class="small">This app shares its data with the ones it grew out of. Sits are the same sits <strong>Come back</strong> shows, and the book is the same book as <strong>One Line a Day</strong>, so those apps keep working and nothing had to be moved. Lantern's stages and guided sits live here now.</p>
    </section>`;

  root.onclick = (e) => {
    const set = e.target.closest('[data-set]');
    if (set) {
      const raw = set.dataset.v, v = raw === 'true' ? true : raw === 'false' ? false : raw;
      store.setPrefs({ [set.dataset.set]: v });
      if (set.dataset.set === 'theme') ctx.applyTheme(v);
      return ctx.rerender();
    }
    const a = e.target.closest('[data-action]')?.dataset.action;
    if (a === 'signin') store.signIn()?.catch((err) => toast(`Couldn't sign in: ${err.message}`));
    else if (a === 'signout') store.signOut()?.then(() => toast('Signed out. Your data stays on this device.'));
    else if (a === 'test') {
      unlockAudio();
      setBellVolume(prefs.bellVol);
      bell();
      configureVoice({ name: prefs.voiceName, rate: 0.88, enabled: true });
      setTimeout(() => speak(SAMPLE_LINE, { interrupt: true }), 1800);
    } else if (a === 'export') {
      const url = URL.createObjectURL(new Blob([store.exportData()], { type: 'application/json' }));
      const link = Object.assign(document.createElement('a'), { href: url, download: `project-happiness-${new Date().toISOString().slice(0, 10)}.json` });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
  const unbind = bindRemote(root.querySelector('#remote'), store, ctx.rerender);
  root.onchange = (e) => {
    const { name, value, checked } = e.target;
    if (name === 'name') store.setProfile({ name: value.trim() });
    else if (name === 'bellVol') store.setPrefs({ bellVol: Number(value) });
    else if (name === 'voiceName') store.setPrefs({ voiceName: value });
    else if (name === 'tags' || name === 'prep') store.setPrefs({ [name]: checked });
  };
  return unbind;
}
