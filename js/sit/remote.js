// A handheld remote, camera shutter or earbud button during a sit. Every press counts as a return right away;
// which button, and a quick second or third press, can say what pulled you away. This is Come back's scheme,
// and the map is kept in Come back's settings, so both apps use the same one.
// C = centre (play/pause, or the phone button), N = next (right), P = previous (left).
import { esc } from '../lib/util.js';
import { TAG_DEFAULTS, tally } from './common.js';

export const REMOTE_DEFAULT = { N: 'Lost in thought', NN: 'Worrying about the future', P: 'Physical sensation', PP: 'Ruminating' };
const BUILT_IN = ['Worrying about the future', 'Ruminating', 'Physical sensation', 'Lost in thought'];
const ROWS = [
  ['Single press', false, [['C', 'Centre or phone button'], ['N', 'Right (next)'], ['P', 'Left (previous)']]],
  ['Quick double press', false, [['NN', 'Right, twice'], ['PP', 'Left, twice']]],
  ['More combinations', true, [['NNN', 'Right, three times'], ['PPP', 'Left, three times'], ['NP', 'Right, then left'], ['PN', 'Left, then right'],
    ['CN', 'Centre, then right'], ['CP', 'Centre, then left'], ['NC', 'Right, then centre'], ['PC', 'Left, then centre']]],
];

export function remoteMap(store) {
  const m = store.state.cb.remote;
  const src = m && typeof m === 'object' && !Array.isArray(m) ? m : REMOTE_DEFAULT;
  const out = {};
  for (const [k, v] of Object.entries(src)) if (/^[CNP]{1,3}$/.test(k) && typeof v === 'string' && v.trim()) out[k] = v.trim().slice(0, 40);
  return out;
}
export const presets = (store) => (store.state.cb.presets?.length ? store.state.cb.presets : TAG_DEFAULTS);

/** Everything a button can mean: the four built-ins, your distraction list, anything you've logged, anything already mapped. */
export function allTags(store) {
  const out = [], seen = new Set();
  const add = (t) => { t = String(t || '').trim(); if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); } };
  BUILT_IN.forEach(add);
  presets(store).forEach(add);
  tally(store.state.sessions.flatMap((r) => r.entries || [])).forEach((x) => add(x.name));
  Object.values(remoteMap(store)).forEach(add);
  return out;
}

export function remoteHTML(store) {
  const map = remoteMap(store), tags = allTags(store);
  const row = ([key, label]) => `<label class="rrow"><span>${label}</span>
    <select data-rkey="${key}" aria-label="${label}"><option value="">Just a return</option>${tags.map((t) => `<option ${map[key] === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
  return `<div class="remote-ui">
    <p class="muted small">Every press counts as a return right away. A quick second press (within half a second) can say what it was.</p>
    ${ROWS.map(([title, folded, rows]) => folded
      ? `<details class="tech" ${rows.some(([k]) => map[k]) ? 'open' : ''}><summary>${title}</summary>${rows.map(row).join('')}</details>`
      : `<p class="field-label mt">${title}</p>${rows.map(row).join('')}`).join('')}
    <div class="row mt"><input data-rnew maxlength="32" placeholder="Add your own tag" autocomplete="off" aria-label="New tag"><button type="button" class="btn" data-ract="add">Add</button></div>
    <button type="button" class="link small" data-ract="reset">Restore the suggested set</button>
  </div>`;
}

/** Wires a container holding remoteHTML. `repaint` is called when the list of tags changes. */
export function bindRemote(root, store, repaint) {
  const onChange = (e) => {
    const key = e.target.dataset?.rkey;
    if (!key) return;
    const map = remoteMap(store);
    if (e.target.value) map[key] = e.target.value; else delete map[key];
    store.setRemote(map);
  };
  const add = () => {
    const inp = root.querySelector('[data-rnew]'), t = inp?.value.trim().slice(0, 32);
    if (!t) return;
    const list = [...presets(store)];
    if (!list.some((x) => x.toLowerCase() === t.toLowerCase())) store.setPresets([...list, t]);
    repaint();
  };
  const onClick = (e) => {
    const act = e.target.closest('[data-ract]')?.dataset.ract;
    if (act === 'add') add();
    else if (act === 'reset') { store.setRemote({ ...REMOTE_DEFAULT }); repaint(); }
  };
  const onKey = (e) => { if (e.key === 'Enter' && e.target.matches?.('[data-rnew]')) { e.preventDefault(); add(); } };
  root.addEventListener('change', onChange);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKey);
  return () => { root.removeEventListener('change', onChange); root.removeEventListener('click', onClick); root.removeEventListener('keydown', onKey); };
}
