// Scene sounds from Come back: each scene's ambience, synthesized (or a recording from sounds/ when one exists).
// The synthesis is kept as written there; this wrapper gives it the shared audio context and an output node.
const FILE_SCENES = ["tree", "daytree", "rain", "ocean", "stars"];

export function createAmbient(AC, MASTER) {
  var IN_MS = 4000, OUT_MS = 6000, CYCLE = IN_MS + OUT_MS, MIN_SCALE = 0.55, t0 = performance.now();
  function ease(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }
  function currentScale() {
    var t = (performance.now() - t0) % CYCLE, p;
    if (t < IN_MS) p = ease(t / IN_MS); else p = 1 - ease((t - IN_MS) / OUT_MS);
    return { s: MIN_SCALE + (1 - MIN_SCALE) * p, inhale: t < IN_MS };
  }
  // Everything is synthesized, so there are no audio files. Looped noise is the raw material.
  var NB = {};
  function noiseBuf(kind) {
    if (NB[kind]) return NB[kind];
    var sr = AC.sampleRate, N = Math.round(sr * 4), F = Math.round(sr * 0.15), raw = new Float32Array(N + F), i;
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (i = 0; i < N + F; i++) {
      var w = Math.random() * 2 - 1, v;
      if (kind === "white") v = w;
      else if (kind === "pink") {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; v = last; }
      raw[i] = v;
    }
    var buf = AC.createBuffer(1, N, sr), d = buf.getChannelData(0), sum = 0;
    for (i = 0; i < N; i++) { d[i] = i < F ? raw[i] * (i / F) + raw[N + i] * (1 - i / F) : raw[i]; sum += d[i] * d[i]; }
    var k = 0.25 / Math.sqrt(sum / N);   // every kind lands at the same loudness
    for (i = 0; i < N; i++) d[i] *= k;
    return (NB[kind] = buf);
  }

  function gainNode(v) { var g = AC.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { var b = AC.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
  function panner(p) { if (AC.createStereoPanner) { var n = AC.createStereoPanner(); n.pan.value = p; return n; } return gainNode(1); }
  function chain() { for (var i = 0; i < arguments.length - 1; i++) arguments[i].connect(arguments[i + 1]); }

  // A layer is one running sound: an output gain plus everything needed to stop it cleanly.
  function mkLayer() {
    var L = { out: gainNode(0), srcs: [], hs: {}, alive: true, react: null };
    L.out.connect(MASTER);
    L.later = function (fn, ms) {
      if (!L.alive) return;
      var h = setTimeout(function () { delete L.hs[h]; if (L.alive) fn(); }, ms); L.hs[h] = 1;
    };
    L.every = function (fn, ms) { L.hs[setInterval(function () { if (L.alive) fn(); }, ms)] = 1; };
    L.noise = function (kind) {
      var s = AC.createBufferSource(); s.buffer = noiseBuf(kind); s.loop = true;
      s.start(0, Math.random() * s.buffer.duration * 0.9); L.srcs.push(s); return s;
    };
    L.osc = function (type, f) { var o = AC.createOscillator(); o.type = type; o.frequency.value = f; if (L.pitchBus) L.pitchBus.connect(o.detune); o.start(); L.srcs.push(o); return o; };
    L.stop = function () {
      L.alive = false;
      Object.keys(L.hs).forEach(function (k) { clearTimeout(+k); clearInterval(+k); });
      L.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} });
      try { L.out.disconnect(); } catch (e) {}
    };
    return L;
  }
  function fadeIn(L, secs) { L.out.gain.setTargetAtTime(1, AC.currentTime, secs / 3); }
  function retire(L, secs) {
    L.react = null;
    L.out.gain.setTargetAtTime(0, AC.currentTime, secs / 3);
    setTimeout(L.stop, secs * 1000 + 500);
  }
  function blip(L, f0, f1, vol, dur, pan) {
    var t = AC.currentTime, o = AC.createOscillator(), g = gainNode(0.0001);
    o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.012, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(o, g, panner(pan || 0), L.out); o.start(t); o.stop(t + dur + 0.05);
  }
  function pop(L, f, q, vol, dur, pan) {
    var t = AC.currentTime, s = AC.createBufferSource(), g = gainNode(0.0001);
    s.buffer = noiseBuf("white");
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    chain(s, filt("bandpass", f, q), g, panner(pan || 0), L.out); s.start(t, Math.random() * 3); s.stop(t + dur + 0.02);
  }
  function rand(a, b) { return a + Math.random() * (b - a); }

  var AMBIENT = {
    // The breathing circle gets a soft breath of air that swells and ebbs with the circle: 4 in, 6 out.
    circle: function (L) {
      var bp = filt("bandpass", 400, 0.6), g = gainNode(0.05);
      chain(L.noise("pink"), bp, g, L.out);
      L.every(function () {
        var c = currentScale(), p = (c.s - MIN_SCALE) / (1 - MIN_SCALE), t = AC.currentTime;
        g.gain.setTargetAtTime(0.05 + 0.75 * p, t, 0.12); bp.frequency.setTargetAtTime(260 + 900 * p, t, 0.12);
      }, 80);
    },
    // Candle: a low warmth, and small pops now and then.
    flame: function (L) {
      chain(L.noise("brown"), filt("lowpass", 220, 0.5), gainNode(0.3), L.out);
      chain(L.noise("pink"), filt("bandpass", 900, 0.5), gainNode(0.02), L.out);
      function crackle() {
        var n = Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 3) : 1;
        for (var i = 0; i < n; i++) (function (d) { L.later(function () { pop(L, rand(1500, 5500), 1.4, rand(0.15, 0.5), rand(0.012, 0.05), rand(-0.5, 0.5)); }, d); })(i * rand(30, 90));
        L.later(crackle, rand(150, 1100));
      }
      crackle();
      L.react = function () { for (var i = 0; i < 4; i++) L.later(function () { pop(L, rand(1500, 5000), 1.4, rand(0.2, 0.5), rand(0.015, 0.05), rand(-0.5, 0.5)); }, i * 70); };
    },
    // Wind through a tree: a soft, dark body of air (two independent channels, hard left and right, for width),
    // a gentle mid "through the branches" breath, and individual leaf rustles that thicken as a gust builds.
    // Nothing bright or steady, so it never reads as static. A tap sends a gust.
    tree: function (L) { treeWind(L, false); },
    daytree: function (L) { treeWind(L, true); }
  };
  function treeWind(L, day) {
      var lvl = 0.2;   // current gust strength, 0..1, read by the leaf scheduler
      var bodyG = [], bodyF = [], airG = [], airF = [];
      [-0.7, 0.7].forEach(function (pan, i) {
        var f1 = filt("bandpass", 380, 0.5), f2 = filt("lowpass", 1400, 0.4), g = gainNode(0.25);
        chain(L.noise("pink"), f1, f2, g, panner(pan), L.out); bodyG.push(g); bodyF.push(f1);
        var a1 = filt("bandpass", 1000, 0.9), a2 = filt("lowpass", 3200, 0.5), ag = gainNode(0.03);
        chain(L.noise("pink"), a1, a2, ag, panner(-pan * 0.6), L.out); airG.push(ag); airF.push(a1);
      });
      chain(L.noise("brown"), filt("lowpass", 160), gainNode(0.12), L.out);   // distant low sway
      function gustTo(s, secs) {
        var t = AC.currentTime; lvl = s;
        bodyG.forEach(function (g, i) { g.gain.setTargetAtTime(0.18 + 0.55 * s * (i ? 1 : 0.85), t, secs); });
        bodyF.forEach(function (f) { f.frequency.setTargetAtTime(300 + 380 * s, t, secs); });
        airG.forEach(function (g) { g.gain.setTargetAtTime(0.02 + 0.2 * s * s, t, secs); });
        airF.forEach(function (f) { f.frequency.setTargetAtTime(800 + 900 * s, t, secs); });
      }
      function leaf() {
        var t = AC.currentTime, src = AC.createBufferSource(), g = gainNode(0.0001), dur = rand(0.08, 0.28), v = rand(0.05, 0.14) * (0.25 + lvl);
        src.buffer = noiseBuf("pink");
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        chain(src, filt("bandpass", rand(1800, 4200), 0.8), filt("lowpass", 5200), g, panner(rand(-0.9, 0.9)), L.out);
        src.start(t, Math.random() * 3); src.stop(t + dur + 0.03);
        L.later(leaf, rand(40, 260) / (0.35 + lvl * 1.6));
      }
      function drift() { gustTo(rand(0.05, 0.55), rand(1.8, 3)); L.later(drift, rand(3500, 8000)); }
      drift(); leaf();
      L.react = function () { gustTo(1, 0.5); L.later(function () { gustTo(0.25, 2.5); }, 2200); };
      // by day: soft, sparse birdsong from a distance. by night: an owl, very occasionally.
      function chirp() {
        var f = rand(2300, 4200), pan = rand(-0.8, 0.8), n = 1 + Math.floor(Math.random() * 4), i;
        for (i = 0; i < n; i++) (function (d) { L.later(function () { blip(L, f * rand(0.95, 1.15), f * rand(1.15, 1.5), rand(0.012, 0.03), rand(0.07, 0.14), pan); }, d); })(i * rand(110, 190));
        L.later(chirp, Math.random() < 0.3 ? rand(1500, 4000) : rand(5000, 14000));
      }
      function owl() {
        blip(L, 400, 360, 0.035, 0.45, -0.5); L.later(function () { blip(L, 340, 300, 0.03, 0.7, -0.5); }, 650);
        L.later(owl, rand(18000, 40000));
      }
      if (day) L.later(chirp, rand(1500, 4000)); else L.later(owl, rand(8000, 16000));
  }
  var AMBIENT2 = {
    // Rain on water: hiss, a far-off roar, and individual drops. A tap makes it fall harder for a moment.
    rain: function (L) {
      var g = gainNode(0.12), roar = gainNode(0.3);
      chain(L.noise("white"), filt("highpass", 900), filt("lowpass", 7500), g, L.out);
      chain(L.noise("brown"), filt("lowpass", 260), roar, L.out);
      function drop() { blip(L, rand(1400, 4200), 0, rand(0.02, 0.07), rand(0.03, 0.09), rand(-0.8, 0.8)); L.later(drop, rand(35, 230)); }
      drop();
      L.react = function () {
        var t = AC.currentTime; g.gain.setTargetAtTime(0.22, t, 0.15); g.gain.setTargetAtTime(0.12, t + 1.4, 0.8);
      };
    },
    // Waves: slow swells of low noise with a bright foam hiss riding on top. Two out-of-step LFOs keep it from repeating.
    ocean: function (L) {
      var low = filt("lowpass", 500, 0.5), g = gainNode(0.25), foam = gainNode(0.02);
      chain(L.noise("brown"), low, g, L.out);
      chain(L.noise("white"), filt("highpass", 2500), foam, L.out);
      function lfo(rate, depth, param) { var o = L.osc("sine", rate), d = gainNode(depth); chain(o, d); d.connect(param); }
      lfo(0.09, 0.2, g.gain); lfo(0.143, 0.09, g.gain); lfo(0.09, 380, low.frequency); lfo(0.09, 0.025, foam.gain);
      L.react = function () { var t = AC.currentTime; g.gain.setTargetAtTime(0.45, t, 0.4); g.gain.setTargetAtTime(0.25, t + 1.2, 1); };
    },
    // Night: faint air and a few distant crickets. A tap, a shooting star, gets a tiny falling chime.
    stars: function (L) {
      chain(L.noise("pink"), filt("lowpass", 380), gainNode(0.12), L.out);
      function cricket(f, pan) {
        var n = 2 + Math.floor(Math.random() * 3), t = AC.currentTime, o = AC.createOscillator(), g = gainNode(0.0001), i;
        o.frequency.value = f;
        for (i = 0; i < n; i++) {
          g.gain.setValueAtTime(0.0001, t + i * 0.075);
          g.gain.linearRampToValueAtTime(0.07, t + i * 0.075 + 0.012);
          g.gain.linearRampToValueAtTime(0.0001, t + i * 0.075 + 0.04);
        }
        chain(o, g, panner(pan), L.out); o.start(t); o.stop(t + n * 0.075 + 0.1);
        L.later(function () { if (Math.random() < 0.75) cricket(f, pan); else L.later(function () { cricket(f, pan); }, rand(1200, 3000)); }, rand(600, 1500));
      }
      cricket(4300, -0.6); L.later(function () { cricket(4900, 0.5); }, 700);
      L.react = function () { blip(L, 2600, 1100, 0.05, 0.9, rand(-0.4, 0.4)); };
    },
    // Eyes closed: just the hush of a quiet room.
    dark: function (L) {
      chain(L.noise("brown"), filt("lowpass", 140), gainNode(0.3), L.out);
      chain(L.noise("pink"), filt("lowpass", 500), gainNode(0.015), L.out);
    }
  };
  // A slow-blooming pair of sine tones, slightly detuned: a soft shimmer.
  function shimmerTone(L, f, vol, dur, pan) {
    var t = AC.currentTime, g = gainNode(0.0001);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    [1, 1.003].forEach(function (m) { var o = AC.createOscillator(); o.frequency.value = f * m; o.connect(g); o.start(t); o.stop(t + dur + 0.1); });
    chain(g, panner(pan || 0), L.out);
  }
  var AMBIENT3 = {
    // Northern lights: cold, still air, and now and then a faint high shimmer.
    aurora: function (L) {
      chain(L.noise("brown"), filt("lowpass", 180), gainNode(0.22), L.out);
      chain(L.noise("pink"), filt("bandpass", 700, 0.5), gainNode(0.02), L.out);
      var notes = [880, 1046.5, 1174.7, 1318.5, 1568];
      function shimmer() { shimmerTone(L, notes[Math.floor(Math.random() * notes.length)], 0.012, 5, rand(-0.6, 0.6)); L.later(shimmer, rand(6000, 14000)); }
      L.later(shimmer, rand(3000, 6000));
      L.react = function () { shimmerTone(L, notes[Math.floor(Math.random() * notes.length)], 0.022, 3.5, rand(-0.4, 0.4)); };
    },
    // Snowy cabin: a hush of wind over snow that rises and settles. A tap is a gust.
    snow: function (L) {
      var lp = filt("lowpass", 500, 0.4), g = gainNode(0.2);
      chain(L.noise("pink"), lp, g, L.out);
      chain(L.noise("brown"), filt("lowpass", 150), gainNode(0.15), L.out);
      function swell() { var t = AC.currentTime, s = Math.random(); g.gain.setTargetAtTime(0.1 + 0.3 * s, t, 2); lp.frequency.setTargetAtTime(300 + 700 * s, t, 2); L.later(swell, rand(4000, 9000)); }
      swell();
      L.react = function () {
        var t = AC.currentTime; g.gain.setTargetAtTime(0.55, t, 0.4); lp.frequency.setTargetAtTime(1400, t, 0.4);
        L.later(function () { g.gain.setTargetAtTime(0.2, AC.currentTime, 2); lp.frequency.setTargetAtTime(500, AC.currentTime, 2); }, 1500);
      };
    },
    // Koi pond: a little water trickling in, with bright drips. A tap is a plop.
    koi: function (L) {
      var g = gainNode(0.06), bp = filt("bandpass", 1200, 0.7);
      chain(L.noise("pink"), bp, filt("lowpass", 3000), g, L.out);
      chain(L.noise("brown"), filt("lowpass", 300), gainNode(0.12), L.out);
      L.every(function () { bp.frequency.setTargetAtTime(900 + Math.random() * 900, AC.currentTime, 0.3); g.gain.setTargetAtTime(0.04 + Math.random() * 0.05, AC.currentTime, 0.4); }, 700);
      function drip() { var f = rand(700, 1600); blip(L, f, f * rand(1.4, 2.2), rand(0.02, 0.05), rand(0.04, 0.09), rand(-0.6, 0.6)); L.later(drip, Math.random() < 0.4 ? rand(60, 200) : rand(300, 1400)); }
      drip();
      L.react = function () {
        blip(L, 260, 820, 0.09, 0.2, rand(-0.3, 0.3));
        for (var i = 0; i < 3; i++) L.later(function () { var f = rand(900, 1800); blip(L, f, f * 1.8, 0.03, 0.06, rand(-0.5, 0.5)); }, 140 + i * 90);
      };
    }
  };
  Object.keys(AMBIENT2).forEach(function (k) { AMBIENT[k] = AMBIENT2[k]; });
  Object.keys(AMBIENT3).forEach(function (k) { AMBIENT[k] = AMBIENT3[k]; });
  // Recordings come at wildly different levels, so scale each to about the loudness of the built-in sounds.
  function fileGain(buf) {
    var d = buf.getChannelData(0), sum = 0, n = 0;
    for (var i = 0; i < d.length; i += 7) { sum += d[i] * d[i]; n++; }
    var rms = Math.sqrt(sum / Math.max(1, n)) || 0.1;
    return Math.max(0.1, Math.min(10, 0.08 / rms));
  }
  function fileAmbient(L, buf, k) {
    var XF = Math.min(2.5, buf.duration / 3);
    function play(first) {
      if (!L.alive) return;
      var t = AC.currentTime, s = AC.createBufferSource(), g = gainNode(0.0001), end = t + buf.duration;
      s.buffer = buf;
      if (first) g.gain.setValueAtTime(1, t); else { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(1, t + XF); }
      g.gain.setValueAtTime(1, end - XF); g.gain.linearRampToValueAtTime(0.0001, end);
      chain(s, g, gainNode(k || 0.7), L.out); s.start(t); s.stop(end + 0.05);
      L.later(function () { play(false); }, (buf.duration - XF) * 1000);
    }
    play(true);
  }


  var FILES = {}, cur = null, curName = "", wantReal = true;
  function loadFile(n) {
    if (FILES[n]) return;
    FILES[n] = { buf: null };
    fetch("sounds/" + n + ".mp3").then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(function (ab) { AC.decodeAudioData(ab, function (buf) { FILES[n].buf = buf; FILES[n].k = fileGain(buf); if (curName === n) { curName = ""; set(n, wantReal); } }, function () {}); })
      .catch(function () {});
  }
  function set(name, real) {
    wantReal = real !== false;
    if (!AMBIENT[name]) name = "";
    if (name && wantReal && FILE_SCENES.indexOf(name) >= 0) loadFile(name);
    if (name === curName) return;
    if (cur) retire(cur, 1.5);
    cur = null; curName = name;
    if (!name) return;
    cur = mkLayer();
    if (wantReal && FILES[name] && FILES[name].buf) fileAmbient(cur, FILES[name].buf, FILES[name].k); else AMBIENT[name](cur);
    fadeIn(cur, 1.5);
  }
  return {
    set: set,
    react: function () { if (cur && cur.react) cur.react(); },
    syncBreath: function (startPerf) { t0 = startPerf; },
    stop: function () { set(""); }
  };
}
