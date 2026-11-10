// One audio engine for the whole app: singing-bowl bells and chimes (from Lantern), a master bus the scene
// sounds and listening exercises play through (from Come back), and the iOS tricks both apps needed:
// the "playback" channel so the silent switch doesn't mute a sit, and a silent track so a handheld remote
// or earbud button reaches the page as a media key.
let ctx = null;
let bellBus = null;   // bells and chimes, with a soft tail
let master = null;    // scene sounds and held tones
let bellVolume = 0.7;
let soundVolume = 0.7;
let keepAlive = null;
let holding = false;  // a sit is running: keep the media channel open
let onRemote = null;

function silentWav(seconds) {
  const rate = 8000, n = rate * seconds, b = new Uint8Array(44 + n), v = new DataView(b.buffer);
  const str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); str(36, 'data'); v.setUint32(40, n, true);
  b.fill(128, 44);
  return URL.createObjectURL(new Blob([b], { type: 'audio/wav' }));
}

function mediaChannel() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* not supported */ }
  try {
    if (!keepAlive) {
      keepAlive = document.createElement('audio');
      keepAlive.setAttribute('playsinline', '');
      keepAlive.loop = true;
      keepAlive.preload = 'auto';
      // a long track, so the lock screen's progress bar rarely restarts
      keepAlive.src = silentWav(600);
      keepAlive.addEventListener('pause', () => {
        if (holding) setTimeout(() => { if (holding && keepAlive.paused) keepAlive.play().catch(() => {}); }, 50);
      });
    }
    if (keepAlive.paused) keepAlive.play().catch(() => {});
  } catch { /* not supported */ }
  hookRemote();
}

// Phones send a clicker, camera shutter or earbud button as media keys to whichever page is playing audio.
let hooked = false;
function hookRemote() {
  if (hooked || !navigator.mediaSession) return;
  hooked = true;
  [['play', 'C'], ['pause', 'C'], ['stop', 'C'], ['nexttrack', 'N'], ['seekforward', 'N'], ['previoustrack', 'P'], ['seekbackward', 'P']].forEach(([action, btn]) => {
    try {
      navigator.mediaSession.setActionHandler(action, () => {
        keepMediaAlive();   // first, even while paused: the press itself may have paused the silent track
        if (holding && onRemote) onRemote(btn);
        keepMediaAlive();
      });
    } catch { /* unsupported action */ }
  });
}
// The phone treats the silent track as "now playing". If it ends up paused, the lock-screen buttons stop
// reaching us, so every press, pause and resume puts it back to playing.
export function keepMediaAlive() {
  if (!holding) return;
  try { if (keepAlive?.paused) keepAlive.play().catch(() => {}); } catch { /* ignore */ }
  try { navigator.mediaSession.playbackState = 'playing'; } catch { /* ignore */ }
}

/** Call from a tap. Creates or wakes the audio engine (iOS only allows this inside a gesture). */
export function unlockAudio() {
  mediaChannel();
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      bellBus = ctx.createGain();
      bellBus.gain.value = bellVolume;
      const delay = ctx.createDelay();
      delay.delayTime.value = 0.19;
      const fb = ctx.createGain();
      fb.gain.value = 0.32;
      const wet = ctx.createGain();
      wet.gain.value = 0.25;
      bellBus.connect(ctx.destination);
      bellBus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(ctx.destination);
      master = ctx.createGain();
      master.gain.value = soundVolume * soundVolume * 1.3;
      master.connect(ctx.destination);
      // A one-sample silent buffer started inside the gesture fully unlocks older iOS.
      const src = ctx.createBufferSource();
      src.buffer = ctx.createBuffer(1, 1, 22050);
      src.connect(ctx.destination);
      src.start(0);
      // the held instruments play through the same master volume
      const Lab = window.Lab;
      if (Lab && !Lab.ac()) Lab.useContext(ctx, { dest: master, fixedGain: true });
    }
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  } catch { /* audio unsupported */ }
  return ctx;
}

export const audioContext = () => ctx;
export const masterBus = () => master;

/** While a sit runs, hold the media channel so sound survives the lock screen and remotes work. */
export function holdAudio(remoteHandler) {
  holding = true;
  onRemote = remoteHandler || null;
  try { if (navigator.mediaSession) navigator.mediaSession.metadata = new MediaMetadata({ title: 'Sitting', artist: 'Press to mark a return' }); } catch { /* ignore */ }
}
export function releaseAudio() {
  holding = false;
  onRemote = null;
  try { keepAlive?.pause(); } catch { /* ignore */ }
}
export function suspendAudio() { try { if (ctx?.state === 'running') ctx.suspend(); } catch { /* ignore */ } }
export function resumeAudio() { try { if (ctx && ctx.state !== 'running') ctx.resume(); } catch { /* ignore */ } }

export function setBellVolume(v) { bellVolume = v; if (bellBus) bellBus.gain.value = v; }
export function setSoundVolume(v) {
  soundVolume = v;
  if (master) master.gain.setTargetAtTime(v * v * 1.3, ctx.currentTime, 0.05);
}

// Any tap re-wakes audio that iOS suspended (after the screen locked, or a call came in).
const wake = () => { if (ctx && ctx.state !== 'running' && holding) unlockAudio(); };
window.addEventListener('pointerdown', wake, { passive: true });
document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });

function partial(freq, gain, decay, when, detune = 0, dest = bellBus) {
  if (!ctx || !dest) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.value = freq;
  o.detune.value = detune;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
  o.connect(g);
  g.connect(dest);
  o.start(when);
  o.stop(when + decay + 0.05);
}

/** A singing-bowl strike. `dest` lets a caller schedule one it can cancel later. */
export function bell({ pitch = 196, strength = 1, delay = 0, dest } = {}) {
  unlockAudio();
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  // Inharmonic bowl partials with slow beating pairs.
  const ratios = [[1, 0.34, 9], [2.71, 0.22, 7], [5.15, 0.11, 5], [8.42, 0.05, 3.2], [12.3, 0.025, 2]];
  for (const [r, g, d] of ratios) {
    partial(pitch * r, g * strength, d, t, -3, dest || bellBus);
    partial(pitch * r, g * strength * 0.7, d * 0.95, t, 4, dest || bellBus);
  }
}

export function bells(n, gap = 2.8, startDelay = 0, dest) {
  for (let i = 0; i < n; i++) bell({ delay: startDelay + i * gap, strength: i === n - 1 ? 1 : 0.85, dest });
}

// The closing bells are scheduled on the audio clock, which keeps running when a locked phone throttles
// the page's timers, so they still ring at the right moment.
let endGain = null;
export function scheduleEndBells(secondsFromNow) {
  cancelEndBells();
  if (!ctx || !(secondsFromNow > 0)) return;
  endGain = ctx.createGain();
  endGain.gain.value = 1;
  endGain.connect(bellBus);
  bells(3, 2.8, secondsFromNow, endGain);
}
export function cancelEndBells() {
  if (endGain) { try { endGain.disconnect(); } catch { /* gone */ } endGain = null; }
}

/** A small, high, very soft chime used for check-ins and transitions. */
export function chime(strength = 0.5) {
  unlockAudio();
  if (!ctx) return;
  const t = ctx.currentTime;
  partial(880, 0.12 * strength, 2.4, t, 0);
  partial(880 * 2.76, 0.05 * strength, 1.6, t, 3);
  partial(1318.5, 0.06 * strength, 2.0, t + 0.12, 0);
}

/** The soft note that answers a return. */
export function returnTone(remote = false) {
  if (!ctx) return;
  const t = ctx.currentTime;
  if (remote) { partial(440, 0.1, 0.7, t); partial(659, 0.09, 1.1, t + 0.11); }
  else partial(587, 0.1, 0.9, t);
}

/** A tiny tick for taps (counting). */
export function tick(strength = 0.3) {
  unlockAudio();
  if (!ctx) return;
  partial(1560, 0.05 * strength, 0.35, ctx.currentTime);
}
