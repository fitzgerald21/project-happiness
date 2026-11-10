import clipIndex from "./voiceClips.js";
import { audioContext } from "./audio.js";
import { lineKey } from "./voiceKey.js";
const RECORDED_VOICES = [
  { id: "heart", label: "Heart \xB7 warm, American" },
  { id: "emma", label: "Emma \xB7 soft, British" },
  { id: "michael", label: "Michael \xB7 calm, American" }
].filter((v) => clipIndex.voices.includes(v.id));
const CLIPS = clipIndex.clips;
const RECORDED_PREFIX = "lantern:";
const GAP_MS = 450;
let recorded = RECORDED_VOICES[0]?.id ?? null;
let deviceVoice = null;
let rate = 0.88;
let enabled = true;
const PREFERRED = [
  "Samantha",
  "Serena",
  "Karen",
  "Moira",
  "Tessa",
  "Daniel",
  "Google UK English Female",
  "Google US English",
  "Microsoft Aria",
  "Microsoft Jenny",
  "Microsoft Sonia"
];
function voiceSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
function listVoices() {
  if (!voiceSupported()) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
}
function isRecordedVoice(name) {
  return !name || name.startsWith(RECORDED_PREFIX);
}
const recordedVoiceName = (id) => RECORDED_PREFIX + id;
function configureVoice(opts) {
  if (opts.rate) rate = opts.rate;
  if (opts.enabled !== void 0) enabled = opts.enabled;
  if (opts.name !== void 0) {
    if (isRecordedVoice(opts.name)) {
      const id = opts.name.slice(RECORDED_PREFIX.length);
      recorded = RECORDED_VOICES.find((v) => v.id === id)?.id ?? RECORDED_VOICES[0]?.id ?? null;
    } else recorded = null;
  }
  const voices = listVoices();
  deviceVoice = opts.name && voices.find((v) => v.name === opts.name) || null;
  if (!deviceVoice) {
    for (const p of PREFERRED) {
      const v = voices.find((x) => x.name.includes(p));
      if (v) {
        deviceVoice = v;
        break;
      }
    }
  }
  if (!deviceVoice) deviceVoice = voices.find((v) => v.localService) || voices[0] || null;
}
if (voiceSupported()) {
  speechSynthesis.onvoiceschanged = () => configureVoice({});
}
function speakDevice(text, onDone) {
  if (onDone) {
    const orig = onDone;
    let called = false;
    const t = window.setTimeout(() => once(), text.length * 90 / rate + 4e3);
    const once = () => {
      if (!called) {
        called = true;
        window.clearTimeout(t);
        orig();
      }
    };
    onDone = once;
  }
  if (!voiceSupported()) return onDone?.();
  try {
    const parts = text.split(/(?<=[.!?…])\s+/).filter(Boolean);
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      if (deviceVoice) u.voice = deviceVoice;
      u.rate = rate;
      u.pitch = 0.96;
      u.volume = 0.95;
      if (i === parts.length - 1 && onDone) {
        u.onend = () => onDone();
        u.onerror = () => onDone();
      }
      speechSynthesis.speak(u);
    });
  } catch {
    onDone?.();
  }
}
const raw = /* @__PURE__ */ new Map();
const decoded = /* @__PURE__ */ new Map();
const clipUrl = (voice, text) => `voice/${voice}/${lineKey(text)}.mp3`;
const hasClip = (text) => lineKey(text) in CLIPS;
function fetchClip(url) {
  let p = raw.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status))));
    p.catch(() => raw.delete(url));
    raw.set(url, p);
  }
  return p;
}
function decodeClip(ctx, url) {
  let p = decoded.get(url);
  if (!p) {
    p = fetchClip(url).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab.slice(0), res, rej)));
    p.catch(() => decoded.delete(url));
    decoded.set(url, p);
  }
  return p;
}
function preloadLines(lines) {
  if (!recorded || !enabled) return;
  const voice = recorded;
  lines.filter(hasClip).forEach((t) => fetchClip(clipUrl(voice, t)).catch(() => {
  }));
}
let queue = [];
let playing = false;
let current = null;
let generation = 0;
let gapTimer = 0;
let voiceGain = null;
function next() {
  if (playing) return;
  const text = queue.shift();
  if (text === void 0) return;
  playing = true;
  const gen = generation;
  const done = () => {
    if (gen !== generation) return;
    current = null;
    gapTimer = window.setTimeout(() => {
      if (gen !== generation) return;
      playing = false;
      next();
    }, GAP_MS);
  };
  const ctx = audioContext();
  if (recorded && ctx && hasClip(text)) {
    decodeClip(ctx, clipUrl(recorded, text)).then((buf) => {
      if (gen !== generation) return;
      if (ctx.state !== "running") ctx.resume().catch(() => {
      });
      if (!voiceGain || voiceGain.context !== ctx) {
        voiceGain = ctx.createGain();
        voiceGain.gain.value = 1;
        voiceGain.connect(ctx.destination);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(voiceGain);
      src.onended = done;
      current = src;
      src.start();
    }).catch(() => gen === generation && speakDevice(text, done));
  } else {
    speakDevice(text, done);
  }
}
function speak(text, opts = {}) {
  if (!enabled || !text) return;
  if (opts.interrupt) hush();
  queue.push(text);
  next();
}
function hush() {
  generation++;
  queue = [];
  playing = false;
  window.clearTimeout(gapTimer);
  try {
    current?.stop();
  } catch {
  }
  current = null;
  if (voiceSupported()) speechSynthesis.cancel();
}
function primeVoice() {
  if (!voiceSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
  }
}
export {
  RECORDED_VOICES,
  configureVoice,
  hush,
  isRecordedVoice,
  listVoices,
  preloadLines,
  primeVoice,
  recordedVoiceName,
  speak,
  voiceSupported
};
