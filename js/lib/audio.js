// A soft synthesized singing-bowl bell. No audio files needed.
// Note: on iPhone, the silent switch mutes web audio.
let ctx = null;

export function unlockAudio() {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) { /* no audio available */ }
  return ctx;
}

export function bell(volume = 0.35) {
  const ac = unlockAudio();
  if (!ac) return;
  const now = ac.currentTime + 0.02;
  const master = ac.createGain();
  master.gain.value = volume;
  master.connect(ac.destination);
  const base = 293.66;
  const partials = [
    [1, 1, 7],
    [2.01, 0.45, 5],
    [2.76, 0.3, 4],
    [5.4, 0.12, 2.5],
    [8.93, 0.05, 1.5],
  ];
  for (const [ratio, amp, decay] of partials) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.frequency.value = base * ratio;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(amp, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
    o.connect(g).connect(master);
    o.start(now);
    o.stop(now + decay + 0.1);
  }
}
