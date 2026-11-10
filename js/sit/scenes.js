// The restful scenes from Come back (candle, trees, rain, ocean, stars, aurora, snow, koi), drawn on a canvas.
// The drawing code is kept as it was written there; this wrapper only hands it a canvas and the current scene.
export const SCENE_ORDER = ["dark", "circle", "flame", "daytree", "tree", "rain", "ocean", "stars", "aurora", "snow", "koi"];
export const SCENE_NAMES = {
  guide: "The guide", circle: "Breathing circle", flame: "Candle flame", daytree: "Tree by day", tree: "Tree at night", rain: "Rain",
  ocean: "Night ocean", stars: "Starry sky", dark: "Eyes closed", aurora: "Northern lights", snow: "Snowy cabin", koi: "Koi pond"
};
export const CANVAS_SCENES = ["flame", "daytree", "tree", "rain", "ocean", "stars", "aurora", "snow", "koi"];

export function createScenes(canvas) {
  var S = { anchor: "", active: true };
  var els = { canvas: canvas, spacer: { getBoundingClientRect: function () { return { height: 0, top: 0 }; } } };
  // V is shared scene state. pulse jumps on every tap and decays; wind drifts on its own.
  var V = { ctx: null, w: 0, h: 0, cy: 0, last: 0, pulse: 0, wind: 0, windTarget: 0, nextWind: 0, shoot: false };
  function hash(n) { var s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  function sizeCanvas() {
    var r = els.canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    els.canvas.width = Math.round(r.width * dpr);
    els.canvas.height = Math.round(r.height * dpr);
    V.ctx = els.canvas.getContext("2d");
    V.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    V.w = r.width; V.h = r.height; V.dpr = dpr;
    var sr = els.spacer.getBoundingClientRect();
    V.cy = sr.height ? sr.top + sr.height / 2 : V.h * 0.42;
  }
  window.addEventListener("resize", function () { if (S.active && CANVAS_SCENES.indexOf(S.anchor) >= 0) sizeCanvas(); });

  /* candle flame */
  var EMBERS = [], BOKEH = null;
  function sceneFlame(ctx, W, H, t, dt) {
    var u = Math.min(Math.min(W, H) * 0.72, 416), P = V.pulse, i;
    var cx = W / 2, baseY = V.cy + u * 0.12;
    var fl = 1 + 0.025 * Math.sin(t * 6.1) + 0.018 * Math.sin(t * 10.7 + 1.3) + 0.015 * Math.sin(t * 3.1 + 0.4);
    var h = u * 0.30 * fl * (1 + P * 0.45);
    var w = u * 0.075 * (1 + P * 0.25) * (1 + 0.03 * Math.sin(t * 5.3));
    var lean = (V.wind * 0.18 + 0.05 * Math.sin(t * 1.7)) * w * 2.2;

    // other candles far behind, out of focus: soft warm discs that breathe
    if (!BOKEH || BOKEH.w !== W || BOKEH.h !== H) {
      BOKEH = { w: W, h: H, img: softDisc("255,175,95", 64, 0.78), list: [] };
      for (i = 0; i < 10; i++) BOKEH.list.push({ x: hash(i + 700) * W, y: H * (0.08 + 0.7 * hash(i + 710)), r: u * (0.04 + 0.08 * hash(i + 720)), ph: hash(i + 730) * 6.3, sp: 0.05 + 0.1 * hash(i + 740) });
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < BOKEH.list.length; i++) {
      var bk = BOKEH.list[i];
      ctx.globalAlpha = 0.07 + 0.04 * Math.sin(t * 0.5 + bk.ph);
      ctx.drawImage(BOKEH.img, bk.x + Math.sin(t * bk.sp + bk.ph) * 18 - bk.r, bk.y - bk.r, bk.r * 2, bk.r * 2);
    }
    ctx.restore();

    // glow: fades to nothing well inside the screen, so there is no visible edge
    var gr = u * 0.95 * (1 + P * 0.6);
    var gx = cx + lean * 0.3, gy = baseY - h * 0.45;
    var glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
    glow.addColorStop(0, "rgba(255,176,80," + (0.30 + 0.10 * P + 0.03 * Math.sin(t * 7.7)).toFixed(3) + ")");
    glow.addColorStop(0.35, "rgba(255,150,60," + (0.14 + 0.05 * P).toFixed(3) + ")");
    glow.addColorStop(0.65, "rgba(255,130,45,0.04)");
    glow.addColorStop(1, "rgba(255,120,40,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // candle body, fading downward
    var topY = baseY + u * 0.05;
    var body = ctx.createLinearGradient(0, topY, 0, topY + u * 0.55);
    body.addColorStop(0, "rgba(236,224,200,0.95)");
    body.addColorStop(1, "rgba(236,224,200,0)");
    ctx.fillStyle = body;
    ctx.fillRect(cx - u * 0.065, topY, u * 0.13, H - topY);

    // wick
    ctx.strokeStyle = "#1b1210"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx + lean * 0.03, baseY - u * 0.004); ctx.stroke();

    function layer(hs, ws, c0, c1, c2) {
      var hh = h * hs, ww = w * ws;
      var tipx = cx + lean * hs, tipy = baseY - hh;
      ctx.beginPath();
      ctx.moveTo(cx, baseY + hh * 0.02);
      ctx.bezierCurveTo(cx - ww * 1.25, baseY - hh * 0.05, cx - ww * 0.95, baseY - hh * 0.62, tipx, tipy);
      ctx.bezierCurveTo(cx + ww * 0.95, baseY - hh * 0.62, cx + ww * 1.25, baseY - hh * 0.05, cx, baseY + hh * 0.02);
      var g = ctx.createLinearGradient(0, tipy, 0, baseY);
      g.addColorStop(0, c0); g.addColorStop(0.55, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.fill();
    }
    layer(1.00, 1.00, "rgba(255,150,50,0)", "rgba(255,138,43,0.88)", "rgba(235,90,25,0.95)");
    layer(0.74, 0.70, "rgba(255,214,110,0)", "rgba(255,205,100,0.95)", "rgba(255,170,70,0.95)");
    layer(0.42, 0.38, "rgba(255,250,225,0)", "rgba(255,248,220,0.98)", "rgba(255,236,190,0.98)");

    // blue base
    ctx.fillStyle = "rgba(110,150,255,0.42)";
    ctx.beginPath(); ctx.ellipse(cx, baseY - h * 0.03, w * 0.55, h * 0.07, 0, 0, Math.PI * 2); ctx.fill();

    // a thin thread of smoke curling up from the tip
    var tipx = cx + lean, tipy = baseY - h, sh = u * 0.45;
    var sg = ctx.createLinearGradient(0, tipy, 0, tipy - sh);
    sg.addColorStop(0, "rgba(210,200,190,0)"); sg.addColorStop(0.15, "rgba(210,200,190," + (0.07 * (1 - P)).toFixed(3) + ")"); sg.addColorStop(1, "rgba(210,200,190,0)");
    ctx.strokeStyle = sg; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(tipx, tipy);
    for (i = 1; i <= 24; i++) { var k = i / 24; ctx.lineTo(tipx + Math.sin(k * 7 - t * 1.6) * u * 0.03 * k + V.wind * u * 0.05 * k * k, tipy - k * sh); }
    ctx.stroke();

    // embers: now and then a spark lifts off and drifts up; a tap sends a little shower of them
    dt = dt || 0.016;
    if (Math.random() < dt * (0.6 + P * 14) && EMBERS.length < 50) {
      EMBERS.push({ x: tipx + (Math.random() - 0.5) * w, y: baseY - h * 0.8, vx: (Math.random() - 0.5) * 14, vy: -(28 + Math.random() * 45), life: 1, dec: 0.22 + Math.random() * 0.3, r: 0.6 + Math.random() * 1.3, ph: Math.random() * 6.3 });
    }
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (i = EMBERS.length - 1; i >= 0; i--) {
      var e = EMBERS[i]; e.life -= e.dec * dt;
      if (e.life <= 0) { EMBERS.splice(i, 1); continue; }
      e.ph += dt * 3; e.x += (e.vx + Math.sin(e.ph) * 10 + V.wind * 10) * dt; e.y += e.vy * dt; e.vy *= 1 - 0.25 * dt;
      var ea = e.life * (0.6 + 0.4 * Math.sin(e.ph * 4));
      ctx.fillStyle = "rgba(255," + Math.round(120 + 100 * e.life) + ",60," + ea.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  }

  /* tree in the wind: one renderer, two themes (night by moonlight, day by sun). Light comes from the upper right. */
  var TREES = {}, treeTips = [], fallen = [];
  function rgbOf(s) { return s.split(",").map(Number); }
  function mixRGB(a, b, k) { return [Math.round(a[0] + (b[0] - a[0]) * k), Math.round(a[1] + (b[1] - a[1]) * k), Math.round(a[2] + (b[2] - a[2]) * k)].join(","); }

  var TREE_THEMES = {
    tree: {
      day: false,
      sky: [[0, "rgba(34,60,96,0.10)"], [0.65, "rgba(60,110,120,0.16)"], [1, "rgba(120,170,150,0.22)"]],
      hills: ["rgba(46,78,84,0.55)", "rgba(28,52,58,0.85)"], farTree: "rgba(20,40,46,0.9)", ground: "#0b1618",
      fog: "130,180,165", sun: [232, 241, 230], sunGlow: "205,230,225", sunGlowA: 0.22,
      bark: "#171f1f", barkLit: "150,185,180", barkLitA: 0.42, barkRim: "rgba(190,220,215,0.35)",
      leaves: [["24,62,64", "50,106,98"], ["38,92,86", "76,136,112"], ["72,136,112", "132,188,152"], ["130,190,150", "208,242,204"]],
      shadow: "rgba(2,8,10,0.45)", grass: "rgba(52,92,84,0.85)", glint: "rgba(200,235,205,0.55)", fall: "rgba(150,210,165,0.8)",
      motes: "210,240,150", moteA: 0.5
    },
    daytree: {
      day: true,
      sky: [[0, "rgb(74,118,158)"], [0.55, "rgb(128,168,190)"], [1, "rgb(206,204,170)"]],
      hills: ["rgba(104,138,128,0.7)", "rgba(66,104,86,0.9)"], farTree: "rgba(48,84,66,0.95)", ground: "#34502e",
      fog: "235,230,190", sun: [255, 246, 214], sunGlow: "255,240,190", sunGlowA: 0.32,
      bark: "#3a2c22", barkLit: "214,176,128", barkLitA: 0.55, barkRim: "rgba(255,226,170,0.45)",
      leaves: [["28,70,40", "70,122,60"], ["44,98,48", "100,152,66"], ["78,134,56", "150,190,82"], ["126,170,70", "214,226,120"]],
      shadow: "rgba(14,30,14,0.4)", grass: "rgba(86,130,60,0.9)", glint: "rgba(255,244,190,0.6)", fall: "rgba(176,196,84,0.85)",
      motes: "255,244,200", moteA: 0.4
    }
  };

  // A clump of leaves: a soft body of many small leaves, shaded as one ball lit from the upper right.
  function leafSprite(rgb, light, size) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d"), r = size / 2, i, dark = rgbOf(rgb).map(function (v) { return Math.round(v * 0.62); }), mid = rgbOf(rgb), lit = rgbOf(light);
    var gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, "rgba(" + dark.join(",") + ",0.95)");
    gr.addColorStop(0.62, "rgba(" + dark.join(",") + ",0.8)");
    gr.addColorStop(1, "rgba(" + dark.join(",") + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    for (i = 0; i < 70; i++) {
      var a = hash(i + 1) * 6.283, d = Math.sqrt(hash(i + 50)) * r * 0.8, px = Math.cos(a) * d, py = Math.sin(a) * d;
      var f = Math.max(0, Math.min(1, 0.5 + (px * 0.55 - py * 0.75) / (r * 0.8) * 0.6 + (hash(i + 90) - 0.5) * 0.5));   // facing the light
      var col = f < 0.5 ? mixRGB(dark, mid, f * 2) : mixRGB(mid, lit, (f - 0.5) * 2);
      var lw = size * (0.05 + 0.04 * hash(i + 150)), lh = lw * 0.55, rot = hash(i + 180) * 3.14;
      g.fillStyle = "rgba(" + mixRGB(dark, mid, 0.2) + ",0.55)";   // tiny shadow under each leaf gives depth
      g.beginPath(); g.ellipse(r + px - lw * 0.12, r + py + lh * 0.45, lw, lh, rot, 0, 6.3); g.fill();
      g.fillStyle = "rgba(" + col + "," + (0.55 + 0.4 * f).toFixed(2) + ")";
      g.beginPath(); g.ellipse(r + px, r + py, lw, lh, rot, 0, 6.3); g.fill();
    }
    return c;
  }
  function glowDot(rgb, size) {
    var c = document.createElement("canvas"); c.width = c.height = size;
    var g = c.getContext("2d"), r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, "rgba(" + rgb + ",1)"); gr.addColorStop(0.3, "rgba(" + rgb + ",0.5)"); gr.addColorStop(1, "rgba(" + rgb + ",0)");
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  function cloudSprite(w) {
    var c = document.createElement("canvas"); c.width = Math.round(w); c.height = Math.round(w * 0.4);
    var g = c.getContext("2d"), i;
    for (i = 0; i < 9; i++) {
      var x = w * (0.2 + 0.6 * hash(i + 3)), y = w * (0.2 - 0.06 * Math.sin(i * 1.9) * hash(i + 8)), r = w * (0.09 + 0.09 * hash(i + 13));
      var gr = g.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
      gr.addColorStop(0, "rgba(255,255,250,0.34)"); gr.addColorStop(0.6, "rgba(246,246,240,0.16)"); gr.addColorStop(1, "rgba(240,240,235,0)");
      g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    return c;
  }
  function groundY(T, x) {
    return T.gy - T.u * 0.04 * Math.exp(-Math.pow((x - T.w / 2) / (T.w * 0.32), 2)) + T.u * 0.012 * Math.sin(x / T.w * 5.1 + 0.6);
  }
  // Everything that never moves (sky, sun or moon, hills, far trees, ground) is painted once into T.bg.
  function treeBuild(W, H, th) {
    var dpr = V.dpr || 1, u = Math.min(W * 0.7, H * 0.64), i, x;
    var T = { w: W, h: H, u: u, th: th, gy: H * 0.8, bg: document.createElement("canvas"), spr: [], grass: [], flies: [], clouds: [], birds: [], bflies: [], tw: [], shoot: [], next: 0 };
    T.bg.width = Math.round(W * dpr); T.bg.height = Math.round(H * dpr);
    var g = T.bg.getContext("2d"); g.scale(dpr, dpr);

    var sk = g.createLinearGradient(0, 0, 0, T.gy);
    th.sky.forEach(function (s) { sk.addColorStop(s[0], s[1]); });
    g.fillStyle = sk; g.fillRect(0, 0, W, H);

    if (!th.day) for (i = 0; i < 70; i++) {
      g.fillStyle = "rgba(225,236,250," + (0.12 + 0.4 * hash(i + 40)).toFixed(2) + ")";
      g.beginPath(); g.arc(hash(i) * W, hash(i + 90) * T.gy * 0.62, 0.5 + hash(i + 7) * 1.0, 0, 6.3); g.fill();
    }

    var mx = W * 0.8, my = H * 0.15, mr = u * (th.day ? 0.05 : 0.042), sc = th.sun.join(",");
    T.sx = mx; T.sy = my;
    var mg = g.createRadialGradient(mx, my, mr * 0.8, mx, my, u * (th.day ? 0.9 : 0.6));
    mg.addColorStop(0, "rgba(" + th.sunGlow + "," + th.sunGlowA + ")");
    mg.addColorStop(1, "rgba(" + th.sunGlow + ",0)");
    g.fillStyle = mg; g.fillRect(0, 0, W, H);
    g.fillStyle = "rgba(" + sc + ",0.95)";
    g.beginPath(); g.arc(mx, my, mr, 0, 6.3); g.fill();
    if (!th.day) {
      g.fillStyle = "rgba(170,195,190,0.28)";
      [[-0.3, -0.2, 0.28], [0.25, 0.1, 0.2], [-0.1, 0.35, 0.15]].forEach(function (m) {
        g.beginPath(); g.arc(mx + m[0] * mr, my + m[1] * mr, m[2] * mr, 0, 6.3); g.fill();
      });
    }

    // two ranges of hills, then a few far trees standing on the nearer one
    function hill(base, amp, ph, fill) {
      g.fillStyle = fill; g.beginPath(); g.moveTo(0, H);
      for (x = 0; x <= W + 6; x += 6) {
        var k = x / W;
        g.lineTo(x, base + amp * (Math.sin(k * 4.2 + ph) * 0.6 + Math.sin(k * 9.5 + ph * 2.1) * 0.25));
      }
      g.lineTo(W, H); g.closePath(); g.fill();
    }
    hill(T.gy - u * 0.2, u * 0.05, 0.4, th.hills[0]);
    hill(T.gy - u * 0.1, u * 0.045, 2.1, th.hills[1]);
    g.fillStyle = th.farTree;
    for (i = 0; i < 9; i++) {
      var tx = hash(i + 200) * W, tk = tx / W;
      if (Math.abs(tx - W / 2) < u * 0.28) continue;
      var ty = T.gy - u * 0.1 + u * 0.045 * (Math.sin(tk * 4.2 + 2.1) * 0.6 + Math.sin(tk * 9.5 + 4.2) * 0.25) + 3;
      var tr = u * (0.025 + 0.02 * hash(i + 300));
      g.beginPath(); g.ellipse(tx, ty - tr * 1.1, tr * 0.8, tr * 1.3, 0, 0, 6.3); g.fill();
      g.fillRect(tx - 1.2, ty - tr * 0.4, 2.4, tr * 0.5);
    }

    g.fillStyle = th.ground;
    g.beginPath(); g.moveTo(0, H);
    for (x = 0; x <= W + 6; x += 6) g.lineTo(x, groundY(T, x));
    g.lineTo(W, H); g.closePath(); g.fill();
    var fog = g.createLinearGradient(0, T.gy - u * 0.15, 0, T.gy + u * 0.1);
    fog.addColorStop(0, "rgba(" + th.fog + ",0)");
    fog.addColorStop(0.6, "rgba(" + th.fog + "," + (th.day ? 0.16 : 0.07) + ")");
    fog.addColorStop(1, "rgba(" + th.fog + ",0)");
    g.fillStyle = fog; g.fillRect(0, T.gy - u * 0.15, W, u * 0.25);
    if (th.day) {   // keep the clock above and the hint below readable on a bright sky
      var top = g.createLinearGradient(0, 0, 0, H * 0.2), bot = g.createLinearGradient(0, H * 0.78, 0, H);
      top.addColorStop(0, "rgba(10,20,30,0.38)"); top.addColorStop(1, "rgba(10,20,30,0)");
      bot.addColorStop(0, "rgba(10,20,14,0)"); bot.addColorStop(1, "rgba(10,20,14,0.5)");
      g.fillStyle = top; g.fillRect(0, 0, W, H * 0.2); g.fillStyle = bot; g.fillRect(0, H * 0.78, W, H * 0.22);
    }

    th.leaves.forEach(function (c) { T.spr.push(leafSprite(c[0], c[1], 128)); });
    T.fly = glowDot(th.motes, 32);

    for (i = 0; i < Math.round(W / 6); i++) T.grass.push({ x: (i + hash(i + 11)) * 6, h: u * (0.02 + 0.035 * hash(i + 5)), ph: hash(i + 77) * 6.3 });
    for (i = 0; i < (th.day ? 22 : 16); i++) T.flies.push({ x: hash(i + 500) * W, y: T.gy - u * (0.02 + 0.5 * hash(i + 600)), ph: hash(i + 700) * 6.3, sp: 0.15 + 0.25 * hash(i + 800) });
    if (th.day) {
      for (i = 0; i < 4; i++) T.clouds.push({ img: cloudSprite(u * (0.7 + 0.6 * hash(i + 900))), x: hash(i + 910) * (W + u), y: H * (0.06 + 0.2 * hash(i + 920)), v: 2 + 3 * hash(i + 930) });
      T.cloudW = u * 1.3;
      for (i = 0; i < 3; i++) T.bflies.push({ x: W * (0.2 + 0.6 * hash(i + 950)), y: T.gy - u * (0.1 + 0.3 * hash(i + 960)), a: hash(i + 970) * 6.3, ph: hash(i + 980) * 6.3,
        col: ["250,214,90", "245,245,240", "240,150,70"][i] });
    } else {
      for (i = 0; i < 3; i++) T.clouds.push({ img: cloudSprite(u * (0.8 + 0.6 * hash(i + 940))), x: hash(i + 910) * (W + u) - u, y: H * (0.05 + 0.18 * hash(i + 920)), v: 1.5 + 2.5 * hash(i + 930) });
      for (i = 0; i < 28; i++) T.tw.push({ x: hash(i + 1300) * W, y: hash(i + 1310) * T.gy * 0.55, r: 0.6 + hash(i + 1320) * 1.1, sp: 0.6 + 2 * hash(i + 1330), ph: hash(i + 1340) * 6.3 });
    }
    return T;
  }

  function sceneTree(ctx, W, H, t, dt) { drawTree(ctx, W, H, t, dt, TREE_THEMES.tree); }
  function sceneDayTree(ctx, W, H, t, dt) { drawTree(ctx, W, H, t, dt, TREE_THEMES.daytree); }

  function drawTree(ctx, W, H, t, dt, th) {
    var key = th.day ? "daytree" : "tree", T = TREES[key];
    if (!T || T.w !== W || T.h !== H) T = TREES[key] = treeBuild(W, H, th);
    var u = T.u, cx = W / 2, i, k, x, y, D = 8;
    var wd = V.wind * 0.5 + V.pulse * 1.0 + 0.1 * Math.sin(t * 0.7);
    ctx.drawImage(T.bg, 0, 0, W, H);

    if (th.day) {
      // clouds drifting slowly across
      for (i = 0; i < T.clouds.length; i++) {
        var cl = T.clouds[i]; cl.x += cl.v * dt; if (cl.x > W + 10) cl.x = -cl.img.width - 10;
        ctx.drawImage(cl.img, cl.x, cl.y);
      }
      // a few slow shafts of sunlight that breathe
      var prevO = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < 4; i++) {
        var ra = 0.5 + 0.28 * i + 0.03 * Math.sin(t * 0.3 + i), rl = H * 1.1;
        var rg = ctx.createLinearGradient(T.sx, T.sy, T.sx - Math.sin(ra) * rl, T.sy + Math.cos(ra) * rl);
        rg.addColorStop(0, "rgba(255,240,190," + (0.03 + 0.012 * Math.sin(t * 0.4 + i * 2)).toFixed(3) + ")"); rg.addColorStop(1, "rgba(255,240,190,0)");
        ctx.fillStyle = rg; ctx.beginPath(); ctx.moveTo(T.sx, T.sy);
        ctx.lineTo(T.sx - Math.sin(ra - 0.05) * rl, T.sy + Math.cos(ra - 0.05) * rl); ctx.lineTo(T.sx - Math.sin(ra + 0.05) * rl, T.sy + Math.cos(ra + 0.05) * rl);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = prevO;
    } else {
      // night: a few stars twinkle, thin moonlit clouds drift by, and now and then a star falls
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      for (i = 0; i < T.tw.length; i++) {
        var st = T.tw[i], sa = Math.pow(0.5 + 0.5 * Math.sin(t * st.sp + st.ph), 3);
        if (sa < 0.05) continue;
        ctx.globalAlpha = sa * 0.9; ctx.drawImage(starDot(), st.x - st.r * 3, st.y - st.r * 3, st.r * 6, st.r * 6);
      }
      ctx.restore();
      for (i = 0; i < T.clouds.length; i++) {
        var nc = T.clouds[i]; nc.x += nc.v * dt; if (nc.x > W + 10) nc.x = -nc.img.width - 10;
        ctx.globalAlpha = 0.2; ctx.drawImage(nc.img, nc.x, nc.y);
      }
      ctx.globalAlpha = 1;
      if (!T.next) T.next = t + 8 + Math.random() * 12;
      if (t > T.next) { shootStar(T.shoot, W, H * 0.6); T.next = t + 20 + Math.random() * 40; }
      if (V.shoot) { V.shoot = false; shootStar(T.shoot, W, H * 0.6); }
      drawShooters(ctx, T.shoot, dt);
    }

    var by = groundY(T, cx) + 2, tw = u * 0.06;
    function bw(d) { return Math.max(1, tw * Math.pow(0.72, d)); }

    // the canopy's shadow on the ground, thrown away from the light (to the left)
    var sg = ctx.createRadialGradient(cx - u * 0.18, by + u * 0.02, 0, cx - u * 0.18, by + u * 0.02, u * 0.55);
    sg.addColorStop(0, th.shadow); sg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.save(); ctx.translate(0, by + u * 0.02); ctx.scale(1, 0.12); ctx.translate(0, -(by + u * 0.02));
    ctx.fillStyle = sg; ctx.fillRect(cx - u * 0.8, by - u * 0.6, u * 1.2, u * 1.6); ctx.restore();

    // trunk flare, shaded across its width: shadowed on the left, catching light on the right
    var tg = ctx.createLinearGradient(cx - tw * 1.5, 0, cx + tw * 1.5, 0);
    tg.addColorStop(0, th.bark); tg.addColorStop(0.55, th.bark); tg.addColorStop(0.85, "rgba(" + th.barkLit + "," + th.barkLitA + ")"); tg.addColorStop(1, th.bark);
    ctx.fillStyle = th.bark;
    ctx.beginPath();
    ctx.moveTo(cx - tw * 1.5, by + 3);
    ctx.quadraticCurveTo(cx - tw * 0.65, by, cx - tw * 0.5, by - tw * 1.8);
    ctx.lineTo(cx + tw * 0.5, by - tw * 1.8);
    ctx.quadraticCurveTo(cx + tw * 0.65, by, cx + tw * 1.5, by + 3);
    ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = tg; ctx.fillRect(cx - tw * 1.6, by - tw * 2, tw * 3.2, tw * 2.2);
    ctx.strokeStyle = "rgba(0,0,0,0.28)"; ctx.lineWidth = 1; ctx.beginPath();   // bark furrows
    for (i = -3; i <= 3; i++) { ctx.moveTo(cx + i * tw * 0.22, by + 2); ctx.quadraticCurveTo(cx + i * tw * 0.2 + tw * 0.05, by - tw * 0.8, cx + i * tw * 0.17, by - tw * 1.8); }
    ctx.stroke(); ctx.restore();

    // branches: tapered, each child inheriting the sway of its parent
    treeTips.length = 0;
    var lit = [];
    function branch(x0, y0, len, ang, d, id) {
      var a = ang + (wd * 0.03 + 0.010 * Math.sin(t * 1.3 + id * 0.9)) * (1 + d * 0.22);
      var x2 = x0 + Math.sin(a) * len, y2 = y0 - Math.cos(a) * len;
      var w0 = bw(d), w1 = bw(d + 1), nx = Math.cos(a), ny = Math.sin(a);
      ctx.fillStyle = th.bark;
      ctx.beginPath();
      ctx.moveTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2); ctx.lineTo(x2 - nx * w1 / 2, y2 - ny * w1 / 2);
      ctx.lineTo(x2 + nx * w1 / 2, y2 + ny * w1 / 2); ctx.lineTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(x2, y2, w1 / 2, 0, 6.3); ctx.fill();
      if (d < 5) lit.push(x0 + nx * w0 * 0.24, y0 + ny * w0 * 0.24, x2 + nx * w1 * 0.24, y2 + ny * w1 * 0.24, Math.max(1, w1 * 0.4));
      if (d >= 3) treeTips.push(x2, y2, id, d);
      if (d >= D - 1) return;
      var spread = 0.3 + 0.26 * hash(id), l2 = len * (0.77 + 0.09 * hash(id + 0.5));
      branch(x2, y2, l2, a - spread * (0.8 + 0.4 * hash(id + 1)), d + 1, id * 2 + 1);
      branch(x2, y2, l2, a + spread * (0.8 + 0.4 * hash(id + 2)), d + 1, id * 2 + 2);
    }
    branch(cx, by - tw * 1.6, u * 0.2, 0.03, 0, 1);

    // light along the sun-facing edge of the limbs (strongest on the right, since the left is in shadow)
    ctx.lineCap = "round";
    for (i = 0; i < lit.length; i += 5) {
      var side = Math.max(0.25, Math.min(1, 0.55 + (lit[i] - cx) / (u * 0.6)));
      ctx.strokeStyle = "rgba(" + th.barkLit + "," + (th.barkLitA * side).toFixed(2) + ")";
      ctx.lineWidth = lit[i + 4];
      ctx.beginPath(); ctx.moveTo(lit[i], lit[i + 1]); ctx.lineTo(lit[i + 2], lit[i + 3]); ctx.stroke();
    }

    // foliage: soft clumps, shadowed on the left and lit on the right
    var pass, n, id2, d2, r, tint;
    for (pass = 0; pass < 2; pass++) {
      for (i = 0; i < treeTips.length; i += 4) {
        id2 = treeTips[i + 2]; d2 = treeTips[i + 3];
        x = treeTips[i] + Math.sin(t * 2.2 + id2) * u * 0.004 + wd * u * 0.003 * (d2 - 4);
        y = treeTips[i + 1] + Math.cos(t * 1.9 + id2 * 1.3) * u * 0.003;
        var s = (x - cx) / (u * 0.7) + 0.25 * (hash(id2) - 0.5) + 0.25 * ((by - y) / u) - 0.05;
        tint = Math.max(0, Math.min(3, Math.floor((s + 0.35) * 3.6)));
        if ((tint > 1 ? 1 : 0) !== pass) continue;
        n = d2 >= 6 ? 2 : 1;
        for (k = 0; k < n; k++) {
          r = u * (0.05 + 0.03 * hash(id2 + k * 3.1)) * (d2 >= 6 ? 1 : d2 === 5 ? 1.2 : 1.45);
          var ox = (hash(id2 + k + 9) - 0.5) * u * 0.05, oy = (hash(id2 + k + 19) - 0.5) * u * 0.04;
          ctx.globalAlpha = 0.95;
          ctx.drawImage(T.spr[tint], x + ox - r, y + oy - r, r * 2, r * 2);
        }
      }
    }
    ctx.globalAlpha = 1;
    // glints of leaf catching the light, more of them on the lit side
    ctx.fillStyle = th.glint;
    for (i = 0; i < treeTips.length; i += 4) {
      if (treeTips[i + 3] < 6) continue;
      id2 = treeTips[i + 2];
      if (hash(id2 + 33) < (th.day ? 0.5 : 0.62) || treeTips[i] < cx - u * 0.05) continue;
      ctx.globalAlpha = 0.5 + 0.5 * Math.max(0, Math.sin(t * 1.3 + id2));   // shimmer as the leaves turn
      ctx.beginPath();
      ctx.ellipse(treeTips[i] + u * 0.01, treeTips[i + 1] - u * 0.012, u * 0.007, u * 0.0035, Math.sin(t * 2.5 + id2), 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // grass tufts bending with the wind
    ctx.strokeStyle = th.grass; ctx.lineWidth = 1.3; ctx.lineCap = "round";
    ctx.beginPath();
    for (i = 0; i < T.grass.length; i++) {
      var b = T.grass[i], gy0 = groundY(T, b.x) + 3;
      var bend = (wd * 0.5 + 0.12 * Math.sin(t * 1.4 + b.ph)) * b.h * 0.6;
      ctx.moveTo(b.x, gy0); ctx.quadraticCurveTo(b.x + bend * 0.3, gy0 - b.h * 0.6, b.x + bend, gy0 - b.h);
    }
    ctx.stroke();

    // fireflies at night, drifting pollen by day; a tap brightens them
    var prevOp = ctx.globalCompositeOperation; ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < T.flies.length; i++) {
      var f = T.flies[i];
      x = f.x + Math.sin(t * f.sp + f.ph) * u * 0.08 + (th.day ? wd * u * 0.05 : 0); y = f.y + Math.cos(t * f.sp * 1.3 + f.ph) * u * 0.04;
      var a = (th.day ? 0.35 + 0.35 * Math.sin(t * 0.6 + f.ph) : Math.max(0, Math.sin(t * 0.9 + f.ph * 3))) * (0.5 + V.pulse * 0.5) * (th.day ? 1 : 1);
      if (a < 0.03) continue;
      ctx.globalAlpha = a * (th.day ? 0.6 : 1); var fr = u * (th.day ? 0.006 : 0.012) * (1 + V.pulse * 0.8);
      ctx.drawImage(T.fly, x - fr, y - fr, fr * 2, fr * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = prevOp;

    // a distant bird now and then, by day
    if (th.day) {
      if (!T.bird && Math.random() < dt * 0.06) T.bird = { x: -20, y: H * (0.18 + 0.2 * Math.random()), v: 40 + 30 * Math.random(), ph: 0 };
      if (T.bird) {
        var bd = T.bird; bd.x += bd.v * dt; bd.y -= 4 * dt; bd.ph += dt * 7;
        var fl = Math.sin(bd.ph) * u * 0.008;
        ctx.strokeStyle = "rgba(40,50,50,0.7)"; ctx.lineWidth = 1.2; ctx.beginPath();
        ctx.moveTo(bd.x - u * 0.014, bd.y - fl); ctx.quadraticCurveTo(bd.x - u * 0.005, bd.y - fl * 0.2 - 2, bd.x, bd.y);
        ctx.quadraticCurveTo(bd.x + u * 0.005, bd.y - fl * 0.2 - 2, bd.x + u * 0.014, bd.y - fl); ctx.stroke();
        if (bd.x > W + 20) T.bird = null;
      }
    }

    // a gust shakes a few leaves loose
    if (V.pulse > 0.25 && treeTips.length && Math.random() < V.pulse * 0.2 && fallen.length < 40) {
      n = Math.floor(Math.random() * (treeTips.length / 4)) * 4;
      fallen.push({ x: treeTips[n], y: treeTips[n + 1], vx: 20 + Math.random() * 30, vy: 12 + Math.random() * 20, ph: Math.random() * 6, r: u * 0.008 + Math.random() * 2.5 });
    }
    ctx.fillStyle = th.fall;
    for (i = fallen.length - 1; i >= 0; i--) {
      var lf = fallen[i];
      lf.x += (lf.vx + wd * 60) * dt; lf.y += lf.vy * dt + Math.sin(lf.ph) * 6 * dt; lf.ph += dt * 3;
      if (lf.y > T.gy + u * 0.02 || lf.x > W + 20) { fallen.splice(i, 1); continue; }
      ctx.beginPath(); ctx.ellipse(lf.x, lf.y, lf.r, lf.r * 0.5, lf.ph, 0, 6.3); ctx.fill();
    }

    // butterflies by day, wandering about the meadow
    for (i = 0; i < T.bflies.length; i++) {
      var bf = T.bflies[i];
      bf.a += (Math.sin(t * 0.7 + bf.ph) * 1.2 + (Math.random() - 0.5) * 2) * dt;
      var bsp = u * 0.07 * (1 + V.pulse * 2);
      bf.x += Math.cos(bf.a) * bsp * dt + wd * u * 0.04 * dt; bf.y += Math.sin(bf.a) * bsp * dt * 0.6 + Math.sin(t * 5 + bf.ph) * u * 0.02 * dt;
      if (bf.x < u * 0.05 || bf.x > W - u * 0.05 || bf.y < T.gy - u * 0.55 || bf.y > T.gy - u * 0.03) bf.a += angDiff(Math.atan2(T.gy - u * 0.25 - bf.y, W / 2 - bf.x), bf.a) * 2 * dt * 3;
      var flap = Math.abs(Math.sin(t * 14 + bf.ph)), bs = u * 0.014;
      ctx.save(); ctx.translate(bf.x, bf.y); ctx.rotate(Math.cos(bf.a) < 0 ? -0.3 : 0.3);
      ctx.fillStyle = "rgba(" + bf.col + ",0.92)";
      [1, -1].forEach(function (sd) {
        ctx.beginPath(); ctx.ellipse(sd * bs * 0.55 * (0.25 + 0.75 * flap), -bs * 0.2, bs * 0.6 * (0.25 + 0.75 * flap), bs * 0.5, sd * 0.4, 0, 6.3); ctx.fill();
        ctx.beginPath(); ctx.ellipse(sd * bs * 0.4 * (0.25 + 0.75 * flap), bs * 0.35, bs * 0.4 * (0.25 + 0.75 * flap), bs * 0.32, -sd * 0.3, 0, 6.3); ctx.fill();
      });
      ctx.fillStyle = "rgba(40,30,25,0.9)"; ctx.fillRect(-0.6, -bs * 0.5, 1.2, bs * 1.1);
      ctx.restore();
    }
  }

  /* ---------- scene helpers ---------- */
  // Paints once into an offscreen canvas at the screen's pixel density, so the still parts of a scene cost nothing per frame.
  function offscreen(W, H, paint) {
    var dpr = V.dpr || 1, c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(W * dpr)); c.height = Math.max(1, Math.round(H * dpr));
    var g = c.getContext("2d"); g.scale(dpr, dpr); paint(g);
    return c;
  }
  // A soft disc, for out-of-focus lights, smoke and snowflakes.
  function softDisc(rgb, size, core) {
    return offscreen(size, size, function (g) {
      var r = size / 2, gr = g.createRadialGradient(r, r, 0, r, r, r);
      gr.addColorStop(0, "rgba(" + rgb + ",1)"); gr.addColorStop(core || 0.5, "rgba(" + rgb + ",0.55)"); gr.addColorStop(1, "rgba(" + rgb + ",0)");
      g.fillStyle = gr; g.fillRect(0, 0, size, size);
    });
  }
  function ridgeY(x, W, base, amp, ph) {
    var k = x / W;
    return base - amp * (0.55 * Math.sin(k * 4.1 + ph) + 0.3 * Math.sin(k * 9.7 + ph * 2.3) + 0.15 * Math.sin(k * 23 + ph * 1.7));
  }
  // A line of hills or mountains, closed down to y0. jag adds sharper peaks.
  function ridgePath(g, W, base, amp, ph, y0, jag) {
    g.beginPath(); g.moveTo(0, y0);
    for (var x = 0; x <= W + 4; x += 4) {
      var y = ridgeY(x, W, base, amp, ph);
      if (jag) y -= jag * (0.7 * Math.pow(1 - Math.abs(Math.sin(x * 0.016 + ph * 3)), 2) + 0.3 * Math.pow(1 - Math.abs(Math.sin(x * 0.043 + ph)), 2));   // pointed peaks
      g.lineTo(x, y);
    }
    g.lineTo(W, y0); g.closePath();
  }
  // A row of pines standing on a ridge, optionally with snow on their tiers.
  function pines(g, W, base, amp, ph, hMin, hMax, gap, col, seed, snow, x0, x1) {
    x0 = x0 == null ? -6 : x0; x1 = x1 == null ? W + 6 : x1;
    for (var x = x0, i = 0; x < x1; x += gap * (0.5 + hash(seed + i * 0.37)), i++) {
      var y = ridgeY(x, W, base, amp, ph) + 2, h = hMin + (hMax - hMin) * hash(seed + i * 1.7), w = h * 0.3;
      g.fillStyle = col;
      g.beginPath(); g.moveTo(x, y - h);
      g.lineTo(x - w * 0.45, y - h * 0.58); g.lineTo(x - w * 0.22, y - h * 0.58);
      g.lineTo(x - w * 0.75, y - h * 0.24); g.lineTo(x - w * 0.38, y - h * 0.24);
      g.lineTo(x - w, y); g.lineTo(x + w, y);
      g.lineTo(x + w * 0.38, y - h * 0.24); g.lineTo(x + w * 0.75, y - h * 0.24);
      g.lineTo(x + w * 0.22, y - h * 0.58); g.lineTo(x + w * 0.45, y - h * 0.58);
      g.closePath(); g.fill();
      if (snow) {
        g.fillStyle = snow;
        [[1, 0.42, 0.13], [0.58, 0.62, 0.11], [0.24, 0.85, 0.1]].forEach(function (tr) {
          var ty = y - h * tr[0], tw = w * tr[1];
          g.beginPath(); g.moveTo(x, ty - (tr[0] === 1 ? 0 : h * 0.06)); g.lineTo(x - tw * 0.8, ty + h * tr[2]); g.quadraticCurveTo(x, ty + h * tr[2] * 0.4, x + tw * 0.8, ty + h * tr[2]); g.closePath(); g.fill();
        });
      }
    }
  }
  var STARDOT = null;
  function starDot() { return STARDOT || (STARDOT = glowDot("235,242,255", 32)); }
  // Shooting stars, shared by the night skies.
  function shootStar(list, W, H) {
    if (list.length >= 3) return;
    list.push({ x: W * (0.05 + Math.random() * 0.6), y: H * (0.04 + Math.random() * 0.28), a: 0.3 + Math.random() * 0.4,
      v: Math.max(W, H) * (0.75 + Math.random() * 0.5), len: 0.1 + Math.random() * 0.08, life: 1 });
  }
  function drawShooters(ctx, list, dt) {
    if (!list.length) return;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.lineCap = "round";
    for (var i = list.length - 1; i >= 0; i--) {
      var s = list[i], vx = Math.cos(s.a) * s.v, vy = Math.sin(s.a) * s.v;
      s.x += vx * dt; s.y += vy * dt; s.life -= dt * 1.2;
      if (s.life <= 0) { list.splice(i, 1); continue; }
      var f = Math.min(1, (1 - s.life) * 6) * Math.min(1, s.life * 2.5), tx = s.x - vx * s.len, ty = s.y - vy * s.len;
      var g = ctx.createLinearGradient(s.x, s.y, tx, ty);
      g.addColorStop(0, "rgba(255,255,255," + (0.95 * f).toFixed(3) + ")");
      g.addColorStop(0.25, "rgba(200,220,255," + (0.4 * f).toFixed(3) + ")");
      g.addColorStop(1, "rgba(160,190,255,0)");
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.globalAlpha = f; ctx.drawImage(starDot(), s.x - 7, s.y - 7, 14, 14); ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  function angDiff(a, b) { var d = a - b; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }

  /* rain on a lake: hills fading into mist, rain falling at three depths, rings spreading on the water */
  var RAIN = null;
  function rainDrop(R, anywhere) {
    var z = Math.random(), land = R.hz + (R.h - R.hz) * (0.02 + 0.98 * Math.pow(z, 1.4));
    return { z: z, x: Math.random() * (R.w + 120) - 60, y: anywhere ? Math.random() * land : -30 - Math.random() * R.h * 0.4,
      land: land, v: 380 + 640 * z, l: 5 + 30 * z };
  }
  function rainBuild(W, H) {
    var hz = H * 0.6, R = { w: W, h: H, hz: hz, drops: [], rip: [], spl: [], mist: [], shim: [] }, i;
    R.bg = offscreen(W, H, function (g) {
      var sk = g.createLinearGradient(0, 0, 0, hz);
      sk.addColorStop(0, "#0a1216"); sk.addColorStop(0.65, "#1a292f"); sk.addColorStop(1, "#2e4046");
      g.fillStyle = sk; g.fillRect(0, 0, W, hz + 1);
      for (i = 0; i < 16; i++) {   // heavy, low cloud
        var cx = hash(i + 1) * W, cy = hash(i + 30) * hz * 0.5, r = W * (0.3 + 0.35 * hash(i + 60));
        var cg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
        cg.addColorStop(0, "rgba(4,8,10,0.32)"); cg.addColorStop(1, "rgba(4,8,10,0)");
        g.fillStyle = cg; g.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      var wg = g.createLinearGradient(0, hz, 0, H);
      wg.addColorStop(0, "#22343a"); wg.addColorStop(1, "#060c0f");
      g.fillStyle = wg; g.fillRect(0, hz, W, H - hz);
      // two ranges of hills, the nearer one wooded, each mirrored faintly in the lake
      [[hz - H * 0.012, H * 0.09, 0.6, "rgb(54,74,80)", false], [hz + 1, H * 0.045, 2.4, "rgb(25,39,43)", true]].forEach(function (hl) {
        for (var m = 0; m < 2; m++) {
          g.save();
          if (m) { g.translate(0, hz * 2); g.scale(1, -1); g.globalAlpha = hl[4] ? 0.35 : 0.16; }
          g.fillStyle = hl[3]; ridgePath(g, W, hl[0], hl[1], hl[2], hz + 1, 0); g.fill();
          if (hl[4]) pines(g, W, hl[0], hl[1], hl[2], H * 0.012, H * 0.032, 6, hl[3], 40);
          g.restore();
        }
        var mg = g.createLinearGradient(0, hz - H * 0.1, 0, hz + H * 0.04);   // mist settling in front of each range
        mg.addColorStop(0, "rgba(150,175,180,0)"); mg.addColorStop(0.7, "rgba(150,175,180,0.12)"); mg.addColorStop(1, "rgba(150,175,180,0)");
        g.fillStyle = mg; g.fillRect(0, hz - H * 0.1, W, H * 0.14);
      });
    });
    R.mistImg = softDisc("165,190,195", 128, 0.35);
    for (i = 0; i < 5; i++) R.mist.push({ x: Math.random() * W, y: hz + (Math.random() - 0.65) * H * 0.07, w: W * (0.7 + 0.7 * Math.random()), v: 3 + 6 * Math.random(), a: 0.12 + 0.12 * Math.random() });
    for (i = 0; i < 46; i++) { var d = Math.pow(Math.random(), 1.6); R.shim.push({ x: Math.random() * W, y: hz + 3 + (H - hz) * d, l: 6 + 40 * d, a: 0.04 + 0.08 * Math.random(), sp: 0.3 + Math.random(), ph: Math.random() * 6.3 }); }
    var n = Math.min(300, Math.round(W * H / 2200));
    for (i = 0; i < n; i++) R.drops.push(rainDrop(R, true));
    return R;
  }
  function sceneRain(ctx, W, H, t, dt) {
    if (!RAIN || RAIN.w !== W || RAIN.h !== H) RAIN = rainBuild(W, H);
    var R = RAIN, P = V.pulse, hz = R.hz, i, d;
    ctx.drawImage(R.bg, 0, 0, W, H);
    // mist drifting along the far shore
    for (i = 0; i < R.mist.length; i++) {
      var m = R.mist[i]; m.x += m.v * dt; if (m.x > W + m.w / 2) m.x = -m.w / 2;
      ctx.globalAlpha = m.a; ctx.drawImage(R.mistImg, m.x - m.w / 2, m.y - m.w * 0.09, m.w, m.w * 0.18);
    }
    // the lake surface catching what light there is
    ctx.fillStyle = "rgb(170,200,205)";
    for (i = 0; i < R.shim.length; i++) {
      var s = R.shim[i], a = Math.max(0, Math.sin(t * s.sp + s.ph)) * s.a;
      if (a < 0.01) continue;
      ctx.globalAlpha = a; ctx.fillRect(s.x + Math.sin(t * 0.4 + s.ph) * 6, s.y, s.l, 1);
    }
    ctx.globalAlpha = 1;
    // rain, in three layers: far drops fine and slow, near ones long and quick
    var slant = 0.1 + V.wind * 0.07, boost = 1 + P * 0.7, layers = [[], [], []];
    for (i = 0; i < R.drops.length; i++) {
      d = R.drops[i]; var sp = d.v * boost;
      d.y += sp * dt; d.x += sp * slant * dt;
      if (d.y >= d.land) {
        if (R.rip.length < 110) R.rip.push({ x: d.x, y: d.land, r: 0, max: 3 + 30 * d.z * d.z, a: 0.45 + 0.55 * d.z, z: d.z });
        if (d.z > 0.82 && R.spl.length < 70) for (var k = 0; k < 3; k++) R.spl.push({ x: d.x, y: d.land, vx: (Math.random() - 0.5) * 70, vy: -50 - Math.random() * 80, life: 0.3 + Math.random() * 0.15 });
        R.drops[i] = d = rainDrop(R, false);
      }
      layers[d.z < 0.4 ? 0 : d.z < 0.78 ? 1 : 2].push(d);
    }
    ctx.lineCap = "round";
    [[0.6, 0.13], [1, 0.22], [1.5, 0.34]].forEach(function (st, li) {
      ctx.lineWidth = st[0];
      ctx.strokeStyle = "rgba(175,205,215," + Math.min(0.7, st[1] * (1 + P * 0.6)).toFixed(3) + ")";
      ctx.beginPath();
      layers[li].forEach(function (q) { ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.l * slant, q.y - q.l); });
      ctx.stroke();
    });
    // a tap makes it pour for a moment
    if (P > 0.2 && Math.random() < P * 0.9 && R.rip.length < 110) {
      var zz = Math.random();
      R.rip.push({ x: Math.random() * W, y: hz + (H - hz) * (0.02 + 0.98 * Math.pow(zz, 1.4)), r: 0, max: 4 + 32 * zz * zz, a: 0.85, z: zz });
    }
    // rings on the water: one ring, then a fainter one inside it
    ctx.lineWidth = 1;
    for (i = R.rip.length - 1; i >= 0; i--) {
      var p = R.rip[i]; p.r += p.max * 1.2 * dt;
      var f = 1 - p.r / p.max;
      if (f <= 0) { R.rip.splice(i, 1); continue; }
      var flat = 0.16 + 0.16 * p.z;
      ctx.strokeStyle = "rgba(190,215,222," + (f * p.a * 0.5).toFixed(3) + ")";
      ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r, p.r * flat, 0, 0, 6.2832); ctx.stroke();
      if (p.r > p.max * 0.35) {
        ctx.strokeStyle = "rgba(190,215,222," + (f * p.a * 0.25).toFixed(3) + ")";
        ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 0.55, p.r * 0.55 * flat, 0, 0, 6.2832); ctx.stroke();
      }
    }
    // little splashes where the nearest drops land
    ctx.fillStyle = "rgba(205,228,232,0.65)";
    for (i = R.spl.length - 1; i >= 0; i--) {
      var q = R.spl[i]; q.vy += 520 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt;
      if (q.life <= 0) { R.spl.splice(i, 1); continue; }
      ctx.fillRect(q.x, q.y, 1.3, 1.3);
    }
  }

  /* night ocean: stars, the moon, and its light broken into glints across slow swells */
  var SEA = null;
  function seaBuild(W, H) {
    var u = Math.min(W, H), hz = H * 0.56, mx = W * 0.66, my = H * 0.17, mr = u * 0.055, i;
    var O = { w: W, h: H, hz: hz, mx: mx, glints: [] };
    O.bg = offscreen(W, H, function (g) {
      var sk = g.createLinearGradient(0, 0, 0, hz);
      sk.addColorStop(0, "#040912"); sk.addColorStop(0.7, "#0e1d2b"); sk.addColorStop(1, "#1d3446");
      g.fillStyle = sk; g.fillRect(0, 0, W, hz + 1);
      for (i = 0; i < 170; i++) {
        var sx = hash(i + 3) * W, sy = hash(i + 70) * hz * 0.92, dm = Math.sqrt((sx - mx) * (sx - mx) + (sy - my) * (sy - my)) / u;
        var a = (0.15 + 0.6 * hash(i + 140)) * Math.min(1, dm * 1.4) * (1 - sy / hz * 0.7);
        g.fillStyle = "rgba(225,235,250," + a.toFixed(2) + ")";
        g.beginPath(); g.arc(sx, sy, 0.4 + hash(i + 9), 0, 6.3); g.fill();
      }
      var mg = g.createRadialGradient(mx, my, mr, mx, my, u * 0.8);
      mg.addColorStop(0, "rgba(205,222,228,0.3)"); mg.addColorStop(0.25, "rgba(170,200,210,0.1)"); mg.addColorStop(1, "rgba(170,200,210,0)");
      g.fillStyle = mg; g.fillRect(0, 0, W, hz + 1);
      var md = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, 0, mx, my, mr);   // the moon, with its soft grey seas
      md.addColorStop(0, "#fdfcf3"); md.addColorStop(1, "#d8dccd");
      g.fillStyle = md; g.beginPath(); g.arc(mx, my, mr, 0, 6.3); g.fill();
      g.fillStyle = "rgba(140,150,140,0.2)";
      [[-0.3, -0.15, 0.3], [0.25, 0.2, 0.22], [-0.05, 0.42, 0.16], [0.38, -0.3, 0.12]].forEach(function (c) { g.beginPath(); g.arc(mx + c[0] * mr, my + c[1] * mr, c[2] * mr, 0, 6.3); g.fill(); });
      for (i = 0; i < 14; i++) {   // thin streaks of cloud low over the horizon, faintly moonlit
        var cy = hz - H * (0.02 + 0.12 * hash(i + 300)), ccx = hash(i + 310) * W, cw = W * (0.3 + 0.5 * hash(i + 320)), ch = H * (0.01 + 0.012 * hash(i + 330));
        var near = Math.max(0, 1 - Math.abs(ccx - mx) / W);
        var cg = g.createRadialGradient(ccx, cy, 0, ccx, cy, cw / 2);
        cg.addColorStop(0, "rgba(" + (110 + Math.round(60 * near)) + ",135,150," + (0.12 + 0.12 * near).toFixed(2) + ")"); cg.addColorStop(1, "rgba(110,135,150,0)");
        g.save(); g.translate(ccx, cy); g.scale(1, ch / (cw / 2)); g.translate(-ccx, -cy);
        g.fillStyle = cg; g.fillRect(ccx - cw / 2, cy - cw / 2, cw, cw); g.restore();
      }
      var sea = g.createLinearGradient(0, hz, 0, H);
      sea.addColorStop(0, "#1b3343"); sea.addColorStop(0.35, "#0f2130"); sea.addColorStop(1, "#040a0f");
      g.fillStyle = sea; g.fillRect(0, hz, W, H - hz);
      var col = g.createLinearGradient(mx - W * 0.35, 0, mx + W * 0.35, 0);   // a broad, soft column of moonlight
      col.addColorStop(0, "rgba(180,205,215,0)"); col.addColorStop(0.5, "rgba(180,205,215,0.1)"); col.addColorStop(1, "rgba(180,205,215,0)");
      g.fillStyle = col; g.fillRect(0, hz, W, H - hz);
      var hg = g.createLinearGradient(0, hz - 8, 0, hz + 10);   // haze along the horizon
      hg.addColorStop(0, "rgba(160,190,205,0)"); hg.addColorStop(0.5, "rgba(160,190,205,0.2)"); hg.addColorStop(1, "rgba(160,190,205,0)");
      g.fillStyle = hg; g.fillRect(0, hz - 8, W, 18);
    });
    for (i = 0; i < 240; i++) O.glints.push({ d: Math.pow(Math.random(), 1.5), xo: (Math.random() + Math.random() + Math.random()) / 3 - 0.5, ph: Math.random() * 6.3, sp: 0.8 + Math.random() * 2.4 });
    return O;
  }
  function sceneOcean(ctx, W, H, t) {
    if (!SEA || SEA.w !== W || SEA.h !== H) SEA = seaBuild(W, H);
    var O = SEA, P = V.pulse, hz = O.hz, mx = O.mx, i, x, y, ROWS = 16;
    ctx.drawImage(O.bg, 0, 0, W, H);
    // rows of swell, bigger and quicker the nearer they are; their crests catch the moon
    for (i = 0; i < ROWS; i++) {
      var dd = (i + 1) / ROWS, y0 = hz + (H - hz) * Math.pow(dd, 1.8), amp = (0.6 + 9 * Math.pow(dd, 1.6)) * (1 + P * 0.9);
      var k = 0.022 / (0.3 + dd), sp = 0.4 + dd * 0.9;
      ctx.beginPath();
      for (x = 0; x <= W + 6; x += 6) {
        y = y0 + amp * Math.sin(x * k + t * sp + i * 1.9) + amp * 0.4 * Math.sin(x * k * 2.7 - t * sp * 0.8 + i);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      var a = (0.07 + 0.3 * dd) * (1 + P * 0.5), lg = ctx.createLinearGradient(mx - W * 0.5, 0, mx + W * 0.5, 0);
      lg.addColorStop(0, "rgba(140,175,195," + (a * 0.15).toFixed(3) + ")");
      lg.addColorStop(0.5, "rgba(215,230,232," + Math.min(1, a).toFixed(3) + ")");
      lg.addColorStop(1, "rgba(140,175,195," + (a * 0.15).toFixed(3) + ")");
      ctx.strokeStyle = lg; ctx.lineWidth = 0.6 + dd * 1.4; ctx.stroke();
      ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
      ctx.fillStyle = "rgba(3,9,14," + (0.05 + 0.05 * dd).toFixed(3) + ")"; ctx.fill();
    }
    // the moon's path: glints that flash and fade, the path widening toward you
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = "rgb(240,242,225)";
    for (i = 0; i < O.glints.length; i++) {
      var gl = O.glints[i], gy = hz + 2 + (H - hz) * gl.d, spread = W * (0.03 + 0.42 * gl.d);
      var b = Math.pow(Math.max(0, Math.sin(t * gl.sp + gl.ph)), 3) * (1 - Math.abs(gl.xo) * 1.6) * (0.6 + P * 0.7);
      if (b < 0.02) continue;
      var len = 2 + 18 * gl.d, gx = mx + gl.xo * spread * 2 + Math.sin(t * 0.7 + gl.ph) * 3 * (1 + gl.d * 3);
      ctx.globalAlpha = Math.min(1, b); ctx.fillRect(gx - len / 2, gy, len, 0.8 + gl.d * 1.6);
    }
    ctx.restore();
  }

  /* starry sky: the Milky Way turning slowly over dark hills, bright stars twinkling, now and then a shooting star */
  var SKY = null, shooters = [];
  function skyBuild(W, H) {
    var D = Math.ceil(Math.sqrt(W * W + H * H) * 1.04), hz = H * 0.8, i, K = { w: W, h: H, D: D, tw: [], img: {}, next: 0 };
    K.base = offscreen(W, H, function (g) {
      var sk = g.createLinearGradient(0, 0, 0, H);
      sk.addColorStop(0, "#03050c"); sk.addColorStop(0.6, "#0a1022"); sk.addColorStop(1, "#1b2542");
      g.fillStyle = sk; g.fillRect(0, 0, W, H);
      var gl = g.createRadialGradient(W * 0.3, hz, 0, W * 0.3, hz, W * 0.95);   // the last of the light, far off
      gl.addColorStop(0, "rgba(95,115,175,0.3)"); gl.addColorStop(1, "rgba(95,115,175,0)");
      g.fillStyle = gl; g.fillRect(0, 0, W, H);
    });
    K.sky = offscreen(D, D, function (g) {
      var c = D / 2, ca = Math.cos(-0.95), sa = Math.sin(-0.95);
      function band(along, off) { return [c + ca * along - sa * off, c + sa * along + ca * off]; }
      var cols = ["150,160,230", "190,160,220", "235,205,170", "140,190,220"];
      for (i = 0; i < 220; i++) {   // the band's glow, as many small soft clouds of colour
        var p = band((hash(i + 1) - 0.5) * D, (hash(i + 2) + hash(i + 3) - 1) * D * 0.06), r = D * (0.02 + 0.05 * hash(i + 4));
        var gg = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
        gg.addColorStop(0, "rgba(" + cols[i % 4] + ",0.045)"); gg.addColorStop(1, "rgba(" + cols[i % 4] + ",0)");
        g.fillStyle = gg; g.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
      }
      var n = Math.round(D * D / 700);
      for (i = 0; i < n; i++) {   // a dust of faint stars, thickest along the band
        var q;
        if (Math.random() < 0.55) q = band((Math.random() - 0.5) * D, (Math.random() + Math.random() + Math.random() - 1.5) / 1.5 * D * 0.09);
        else q = [Math.random() * D, Math.random() * D];
        var sz = Math.random() < 0.92 ? 0.6 : 1.1;
        g.fillStyle = "rgba(225,232,255," + (0.15 + Math.random() * 0.5).toFixed(2) + ")"; g.fillRect(q[0], q[1], sz, sz);
      }
      for (i = 0; i < 320; i++) {   // a dark lane of dust winding down the middle of it
        var al = (hash(i + 500) - 0.5) * D * 0.95, dp = band(al, Math.sin(al / D * 9) * D * 0.012 + (hash(i + 501) - 0.5) * D * 0.012), dr = D * (0.006 + 0.014 * hash(i + 502));
        var dg = g.createRadialGradient(dp[0], dp[1], 0, dp[0], dp[1], dr);
        dg.addColorStop(0, "rgba(3,5,12,0.16)"); dg.addColorStop(1, "rgba(3,5,12,0)");
        g.fillStyle = dg; g.fillRect(dp[0] - dr, dp[1] - dr, dr * 2, dr * 2);
      }
    });
    var tints = ["255,240,220", "225,235,255", "200,215,255", "255,225,200"];
    for (i = 0; i < 90; i++) {
      var col = tints[i % 4];
      K.img[col] = K.img[col] || glowDot(col, 32);
      K.tw.push({ x: (Math.random() - 0.5) * D, y: (Math.random() - 0.5) * D, r: 0.6 + Math.pow(Math.random(), 3) * 1.6, tw: 0.5 + Math.random() * 2.2, ph: Math.random() * 6.3, col: col, big: i < 9 });
    }
    K.land = offscreen(W, H, function (g) {
      g.fillStyle = "#0a1020"; ridgePath(g, W, hz - H * 0.02, H * 0.07, 1.2, H, H * 0.035); g.fill();
      var lg = g.createLinearGradient(0, hz - H * 0.12, 0, hz + H * 0.05);   // faint skyglow on the far range
      lg.addColorStop(0, "rgba(120,140,195,0.1)"); lg.addColorStop(1, "rgba(120,140,195,0)");
      g.fillStyle = lg; ridgePath(g, W, hz - H * 0.02, H * 0.07, 1.2, H, H * 0.035); g.fill();
      g.fillStyle = "#03050a"; ridgePath(g, W, hz + H * 0.06, H * 0.04, 3.3, H, 0); g.fill();
      pines(g, W, hz + H * 0.06, H * 0.04, 3.3, H * 0.02, H * 0.055, 8, "#03050a", 900);
    });
    return K;
  }
  function sceneStars(ctx, W, H, t, dt) {
    if (!SKY || SKY.w !== W || SKY.h !== H) SKY = skyBuild(W, H);
    var K = SKY, P = V.pulse, i, s;
    ctx.drawImage(K.base, 0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(t * 0.004);   // the whole sky wheels, very slowly
    ctx.drawImage(K.sky, -K.D / 2, -K.D / 2, K.D, K.D);
    ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < K.tw.length; i++) {
      s = K.tw[i];
      var a = Math.min(1, (0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * s.tw + s.ph), 2)) * (1 + P * 0.7)), r = s.r * (3 + P * 1.5);
      ctx.globalAlpha = a; ctx.drawImage(K.img[s.col], s.x - r, s.y - r, r * 2, r * 2);
      if (s.big) {   // the brightest get a little cross of light
        ctx.fillStyle = "rgba(" + s.col + "," + (0.4 * a).toFixed(3) + ")";
        ctx.fillRect(s.x - r * 2.4, s.y - 0.4, r * 4.8, 0.8); ctx.fillRect(s.x - 0.4, s.y - r * 2.4, 0.8, r * 4.8);
      }
    }
    ctx.restore();
    if (!K.next) K.next = t + 4 + Math.random() * 8;
    if (t > K.next) { shootStar(shooters, W, H); K.next = t + 10 + Math.random() * 25; }
    if (V.shoot) { V.shoot = false; shootStar(shooters, W, H); }
    drawShooters(ctx, shooters, dt);
    ctx.drawImage(K.land, 0, 0, W, H);
  }

  /* northern lights: curtains of green and violet moving over snowy peaks, mirrored in a still lake */
  var AUR = null;
  function auroraStrip(stops) {
    return offscreen(4, 256, function (g) {
      var gr = g.createLinearGradient(0, 0, 0, 256);
      stops.forEach(function (s) { gr.addColorStop(s[0], s[1]); });
      g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    });
  }
  function auroraBuild(W, H) {
    var hz = H * 0.66, i, A = { w: W, h: H, hz: hz, shim: [] };
    A.sky = offscreen(W, H, function (g) {
      var sk = g.createLinearGradient(0, 0, 0, hz);
      sk.addColorStop(0, "#02050c"); sk.addColorStop(0.75, "#061522"); sk.addColorStop(1, "#0c2330");
      g.fillStyle = sk; g.fillRect(0, 0, W, hz + 1);
      for (i = 0; i < 220; i++) {
        g.fillStyle = "rgba(225,235,250," + (0.15 + 0.6 * hash(i + 11)).toFixed(2) + ")";
        g.beginPath(); g.arc(hash(i + 1) * W, hash(i + 2) * hz * 0.95, 0.4 + hash(i + 3) * 0.9, 0, 6.3); g.fill();
      }
      var lk = g.createLinearGradient(0, hz, 0, H);
      lk.addColorStop(0, "#0a1d27"); lk.addColorStop(1, "#02070b");
      g.fillStyle = lk; g.fillRect(0, hz, W, H - hz);
    });
    A.land = offscreen(W, H, function (g) {
      for (var m = 0; m < 2; m++) {
        g.save();
        if (m) { g.translate(0, hz * 2); g.scale(1, -1); g.globalAlpha = 0.5; }
        var top = hz - H * 0.22, mg = g.createLinearGradient(0, top, 0, hz);   // a far, snowy range: pale at the peaks, into shadow below
        mg.addColorStop(0, "#a4b8c8"); mg.addColorStop(0.3, "#56697a"); mg.addColorStop(1, "#13212b");
        g.fillStyle = mg; ridgePath(g, W, hz - H * 0.075, H * 0.08, 0.8, hz + 1, H * 0.07); g.fill();
        g.fillStyle = "rgba(7,14,20,0.6)"; ridgePath(g, W, hz - H * 0.02, H * 0.045, 2.6, hz + 1, H * 0.025); g.fill();
        g.fillStyle = "#03080b"; g.fillRect(0, hz - 2, W, 3);
        pines(g, W, hz + 1, H * 0.006, 4.1, H * 0.016, H * 0.045, 5, "#03080b", 300);
        g.restore();
      }
    });
    A.glow = offscreen(W, H, function (g) {
      var gg = g.createLinearGradient(0, hz * 0.2, 0, hz);
      gg.addColorStop(0, "rgba(60,200,150,0)"); gg.addColorStop(0.5, "rgba(60,200,150,0.09)"); gg.addColorStop(1, "rgba(60,200,150,0.16)");
      g.fillStyle = gg; g.fillRect(0, 0, W, hz);
      var lg = g.createLinearGradient(0, hz, 0, H);   // and its reflection on the lake
      lg.addColorStop(0, "rgba(60,200,150,0.06)"); lg.addColorStop(1, "rgba(60,200,150,0)");
      g.fillStyle = lg; g.fillRect(0, hz, W, H - hz);
    });
    A.lw = Math.ceil(W / 2); A.lh = Math.ceil(hz / 2);   // the lights are drawn at half size: cheaper, and softer
    A.layer = document.createElement("canvas"); A.layer.width = A.lw; A.layer.height = A.lh; A.lg = A.layer.getContext("2d");
    A.strips = [
      auroraStrip([[0, "rgba(150,70,220,0)"], [0.35, "rgba(140,80,230,0.35)"], [0.72, "rgba(80,235,160,0.85)"], [0.9, "rgba(170,255,205,1)"], [1, "rgba(110,255,170,0)"]]),
      auroraStrip([[0, "rgba(230,90,170,0)"], [0.4, "rgba(200,90,200,0.3)"], [0.75, "rgba(60,220,190,0.8)"], [0.92, "rgba(160,255,230,0.95)"], [1, "rgba(60,220,190,0)"]])
    ];
    for (i = 0; i < 30; i++) { var d = Math.pow(Math.random(), 1.5); A.shim.push({ x: Math.random() * W, y: hz + 4 + (H - hz) * d, l: 8 + 40 * d, sp: 0.3 + Math.random(), ph: Math.random() * 6.3 }); }
    return A;
  }
  function sceneAurora(ctx, W, H, t) {
    if (!AUR || AUR.w !== W || AUR.h !== H) AUR = auroraBuild(W, H);
    var A = AUR, P = V.pulse, g = A.lg, lw = A.lw, lh = A.lh, x, r, i;
    ctx.drawImage(A.sky, 0, 0, W, H);
    g.clearRect(0, 0, lw, lh);
    g.globalCompositeOperation = "lighter";
    var sp = 1 + P * 1.5;
    for (r = 0; r < 3; r++) {
      var strip = A.strips[r % 2], base = lh * (0.5 + 0.13 * r), ph = r * 2.1;
      for (x = 0; x < lw; x += 1) {
        var y = base + lh * 0.09 * Math.sin(x * 0.012 + t * 0.11 * sp + ph) + lh * 0.05 * Math.sin(x * 0.031 - t * 0.17 * sp + ph * 1.7);
        var hgt = lh * (0.3 + 0.12 * Math.sin(x * 0.02 + t * 0.07 + ph)) * (1 - 0.22 * r);
        var a = (0.5 + 0.5 * Math.sin(x * 0.018 + t * 0.23 * sp + ph)) * (0.55 + 0.45 * Math.sin(x * 0.007 - t * 0.09 + ph * 0.5));
        a *= 0.78 + 0.13 * Math.sin(x * 0.23 + t * 0.9 + ph) + 0.09 * Math.sin(x * 0.61 - t * 1.4);   // fine rays running up the curtain
        if (a <= 0.02) continue;
        g.globalAlpha = Math.min(1, a * (0.2 - r * 0.04) * (1 + P * 0.9));
        g.drawImage(strip, x - 0.5, y - hgt, 2.5, hgt);
      }
    }
    g.globalAlpha = 1; g.globalCompositeOperation = "source-over";
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 0.15) + P * 0.4;   // the lights wash the lower sky green
    ctx.drawImage(A.glow, 0, 0, W, H);
    ctx.globalAlpha = 1;
    ctx.drawImage(A.layer, 0, 0, W, A.hz);
    ctx.globalAlpha = 0.32; ctx.translate(0, A.hz * 2); ctx.scale(1, -1);   // and again, upside down, in the lake
    ctx.drawImage(A.layer, 0, 0, W, A.hz);
    ctx.restore();
    ctx.drawImage(A.land, 0, 0, W, H);
    ctx.fillStyle = "rgb(150,210,190)";   // the faintest ripple on the water
    for (i = 0; i < A.shim.length; i++) {
      var s = A.shim[i], al = Math.max(0, Math.sin(t * s.sp + s.ph)) * 0.08;
      if (al < 0.01) continue;
      ctx.globalAlpha = al; ctx.fillRect(s.x + Math.sin(t * 0.3 + s.ph) * 5, s.y, s.l, 1);
    }
    ctx.globalAlpha = 1;
  }

  /* a cabin in the snow: flakes drifting at three depths, a warm window, smoke curling from the chimney */
  var SNOW = null;
  function snowBuild(W, H) {
    var u = Math.min(W, H), hz = H * 0.7, i, N = { w: W, h: H, u: u, flakes: [], smoke: [], next: 0 };
    var cx = W * 0.7, gy = ridgeY(cx, W, hz, H * 0.03, 1.4), s = u * 0.15;
    N.win = { x: cx - s * 0.14, y: gy - s * 0.27 }; N.chim = { x: cx + s * 0.24, y: gy - s * 1.02 };
    N.bg = offscreen(W, H, function (g) {
      var sk = g.createLinearGradient(0, 0, 0, hz);
      sk.addColorStop(0, "#0a1322"); sk.addColorStop(0.6, "#1a2940"); sk.addColorStop(1, "#34445e");
      g.fillStyle = sk; g.fillRect(0, 0, W, H);
      var mx = W * 0.24, my = H * 0.15, mg = g.createRadialGradient(mx, my, 0, mx, my, u * 0.55);   // the moon behind a veil of cloud
      mg.addColorStop(0, "rgba(225,232,242,0.55)"); mg.addColorStop(0.07, "rgba(205,215,232,0.3)"); mg.addColorStop(0.35, "rgba(160,175,200,0.08)"); mg.addColorStop(1, "rgba(160,175,200,0)");
      g.fillStyle = mg; g.fillRect(0, 0, W, H);
      var fh = g.createLinearGradient(0, hz - H * 0.18, 0, hz);   // far hills, snow catching the moon
      fh.addColorStop(0, "#8395b0"); fh.addColorStop(1, "#3d4e68");
      g.fillStyle = fh; ridgePath(g, W, hz - H * 0.09, H * 0.06, 0.4, H, 0); g.fill();
      pines(g, W, hz - H * 0.09, H * 0.06, 0.4, H * 0.012, H * 0.026, 6, "rgba(30,44,62,0.85)", 50, "rgba(150,168,192,0.6)");
      var nh = g.createLinearGradient(0, hz - H * 0.05, 0, H);   // the near slope
      nh.addColorStop(0, "#8f9fb6"); nh.addColorStop(0.35, "#56667f"); nh.addColorStop(1, "#232d42");
      g.fillStyle = nh; ridgePath(g, W, hz, H * 0.03, 1.4, H, 0); g.fill();
      // warm light from the window spilling onto the snow
      var sp = g.createRadialGradient(N.win.x, gy + s * 0.15, 0, N.win.x, gy + s * 0.15, s * 1.6);
      sp.addColorStop(0, "rgba(255,190,110,0.32)"); sp.addColorStop(1, "rgba(255,190,110,0)");
      g.save(); g.translate(0, gy + s * 0.15); g.scale(1, 0.35); g.translate(0, -(gy + s * 0.15)); g.fillStyle = sp; g.fillRect(N.win.x - s * 1.6, gy - s * 1.5, s * 3.2, s * 3.2); g.restore();
      // the cabin
      g.fillStyle = "#2a1f1b"; g.fillRect(cx - s * 0.5, gy - s * 0.52, s, s * 0.56);
      g.strokeStyle = "rgba(0,0,0,0.3)"; g.lineWidth = 1; g.beginPath();
      for (i = 1; i < 5; i++) { g.moveTo(cx - s * 0.5, gy - s * 0.52 + i * s * 0.11); g.lineTo(cx + s * 0.5, gy - s * 0.52 + i * s * 0.11); }
      g.stroke();
      g.fillStyle = "#1c1412"; g.fillRect(cx + s * 0.13, gy - s * 0.36, s * 0.2, s * 0.4);   // door
      g.fillStyle = "#1d1715"; g.fillRect(N.chim.x - s * 0.06, N.chim.y, s * 0.12, s * 0.5);   // chimney
      g.fillStyle = "#e9eff7"; g.beginPath(); g.ellipse(N.chim.x, N.chim.y, s * 0.085, s * 0.03, 0, 0, 6.3); g.fill();
      g.fillStyle = "#1a1412"; g.beginPath(); g.moveTo(cx - s * 0.64, gy - s * 0.48); g.lineTo(cx, gy - s * 0.98); g.lineTo(cx + s * 0.64, gy - s * 0.48); g.closePath(); g.fill();   // roof
      var sn = g.createLinearGradient(0, gy - s * 1.04, 0, gy - s * 0.44);   // thick snow on the roof
      sn.addColorStop(0, "#f4f7fb"); sn.addColorStop(1, "#b8c6d8");
      g.fillStyle = sn; g.beginPath();
      g.moveTo(cx - s * 0.7, gy - s * 0.45); g.quadraticCurveTo(cx - s * 0.68, gy - s * 0.53, cx - s * 0.6, gy - s * 0.56);
      g.lineTo(cx, gy - s * 1.06); g.lineTo(cx + s * 0.6, gy - s * 0.56); g.quadraticCurveTo(cx + s * 0.68, gy - s * 0.53, cx + s * 0.7, gy - s * 0.45);
      g.lineTo(cx + s * 0.62, gy - s * 0.47); g.lineTo(cx, gy - s * 0.96); g.lineTo(cx - s * 0.62, gy - s * 0.47); g.closePath(); g.fill();
      var wg = g.createLinearGradient(0, N.win.y - s * 0.1, 0, N.win.y + s * 0.1);   // the window
      wg.addColorStop(0, "#ffdd99"); wg.addColorStop(1, "#f29a45");
      g.fillStyle = wg; g.fillRect(N.win.x - s * 0.12, N.win.y - s * 0.1, s * 0.24, s * 0.2);
      g.fillStyle = "#2a1f1b"; g.fillRect(N.win.x - 0.75, N.win.y - s * 0.1, 1.5, s * 0.2); g.fillRect(N.win.x - s * 0.12, N.win.y - 0.75, s * 0.24, 1.5);
      g.fillStyle = "#eef3f9"; g.fillRect(N.win.x - s * 0.14, N.win.y + s * 0.1, s * 0.28, s * 0.03);
      g.fillStyle = "#dfe7f1"; g.beginPath(); g.ellipse(cx, gy + s * 0.04, s * 0.62, s * 0.06, 0, 0, 6.3); g.fill();   // drift against the walls
      // big snowy pines close by
      pines(g, W, hz + H * 0.02, H * 0.03, 1.4, H * 0.12, H * 0.2, W * 0.09, "#0f1d26", 77, "rgba(228,236,246,0.92)", -W * 0.05, W * 0.38);
      pines(g, W, hz + H * 0.03, H * 0.03, 1.4, H * 0.1, H * 0.16, W * 0.08, "#0f1d26", 88, "rgba(228,236,246,0.92)", W * 0.92, W * 1.08);
      var fg = g.createLinearGradient(0, H * 0.8, 0, H);   // darker toward the bottom, so the words there stay readable
      fg.addColorStop(0, "rgba(16,24,40,0)"); fg.addColorStop(1, "rgba(16,24,40,0.7)");
      g.fillStyle = fg; g.fillRect(0, H * 0.8, W, H * 0.2);
    });
    N.glowR = s * 0.9; N.glow = softDisc("255,180,90", 96, 0.25);
    N.puff = softDisc("200,208,222", 64, 0.4);
    N.flake = softDisc("255,255,255", 32, 0.45);
    var n = Math.min(260, Math.round(W * H / 1500));
    for (i = 0; i < n; i++) N.flakes.push({ x: Math.random() * W, y: Math.random() * H, z: Math.random(), ph: Math.random() * 6.3, sw: 0.4 + Math.random() * 0.9 });
    return N;
  }
  function sceneSnow(ctx, W, H, t, dt) {
    if (!SNOW || SNOW.w !== W || SNOW.h !== H) SNOW = snowBuild(W, H);
    var N = SNOW, P = V.pulse, u = N.u, i;
    ctx.drawImage(N.bg, 0, 0, W, H);
    // the window flickers, like a fire inside
    var fl = 0.7 + 0.12 * Math.sin(t * 7.3) + 0.08 * Math.sin(t * 13.1 + 1) + 0.06 * Math.sin(t * 2.1) + P * 0.3;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = Math.min(1, fl * 0.5);
    ctx.drawImage(N.glow, N.win.x - N.glowR, N.win.y - N.glowR, N.glowR * 2, N.glowR * 2);
    ctx.restore();
    // chimney smoke, rising and leaning with the wind
    if (t > N.next) { N.smoke.push({ x: N.chim.x, y: N.chim.y - 2, r: u * 0.012, a: 0.28, vy: -(10 + Math.random() * 6), ph: Math.random() * 6.3 }); N.next = t + 0.4 + Math.random() * 0.3; }
    for (i = N.smoke.length - 1; i >= 0; i--) {
      var p = N.smoke[i];
      p.y += p.vy * dt; p.x += (5 + V.wind * 8 + Math.sin(t * 0.8 + p.ph) * 4 + P * 40) * dt; p.r += u * 0.014 * dt; p.a -= dt * 0.04;
      if (p.a <= 0) { N.smoke.splice(i, 1); continue; }
      ctx.globalAlpha = p.a; ctx.drawImage(N.puff, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    // snow at three depths: far flakes small and slow, near ones large and soft. A tap sends a gust.
    var wind = V.wind * 12 + P * 170;
    for (i = 0; i < N.flakes.length; i++) {
      var f = N.flakes[i];
      f.y += (10 + 46 * f.z) * dt * (1 + P * 0.4);
      f.x += (Math.sin(t * f.sw + f.ph) * (5 + 12 * f.z) + wind * (0.35 + f.z)) * dt;
      if (f.y > H + 6) { f.y = -6; f.x = Math.random() * W; }
      if (f.x > W + 10) f.x -= W + 20; else if (f.x < -10) f.x += W + 20;
      var r = 0.7 + 3.2 * Math.pow(f.z, 1.6);
      ctx.globalAlpha = 0.35 + 0.6 * f.z; ctx.drawImage(N.flake, f.x - r, f.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  /* koi pond, seen from above: fish gliding over pebbles under lily pads. A tap sends rings across the water and the fish dart off. */
  var POND = null;
  var KOI_LOOKS = [
    { body: "242,236,226", fin: "245,240,232", spots: ["214,64,40", "224,92,52"] },     // kohaku: white and red
    { body: "240,160,58", fin: "250,195,110", spots: ["250,208,125"] },                // ogon: gold
    { body: "236,118,42", fin: "246,165,95", spots: ["250,244,236"] },                 // orange and white
    { body: "32,32,36", fin: "70,70,76", spots: ["214,70,44", "238,232,224"] },        // showa: black, red, white
    { body: "244,240,234", fin: "248,244,240", spots: [], head: "214,52,40" },         // tancho: a single red crown
    { body: "122,146,164", fin: "155,176,190", spots: ["226,122,62"] }                 // asagi: blue-grey and orange
  ];
  function lilyPad(r, flower, seed) {
    var S2 = Math.ceil(r * 2.4);
    return offscreen(S2, S2, function (g) {
      var c = S2 / 2, notch = hash(seed) * 6.28, i;
      var pg = g.createRadialGradient(c - r * 0.3, c - r * 0.3, 0, c, c, r);
      pg.addColorStop(0, "#6aa24e"); pg.addColorStop(1, "#2f5f2c");
      g.fillStyle = pg; g.beginPath(); g.moveTo(c, c); g.arc(c, c, r, notch + 0.22, notch - 0.22 + 6.2832); g.closePath(); g.fill();
      g.strokeStyle = "rgba(20,55,22,0.35)"; g.lineWidth = 0.8; g.beginPath();
      for (i = 0; i < 11; i++) { var a = notch + 0.4 + i * 0.5; g.moveTo(c, c); g.lineTo(c + Math.cos(a) * r * 0.92, c + Math.sin(a) * r * 0.92); }
      g.stroke();
      g.strokeStyle = "rgba(190,230,160,0.35)"; g.lineWidth = 1.2; g.beginPath(); g.arc(c, c, r - 0.8, notch + 0.3, notch - 0.3 + 6.2832); g.stroke();
      if (flower) {   // a lotus: two rings of pink petals around a gold heart
        [[r * 0.55, 8, 0, "#f7c6d4", "#e98aa8"], [r * 0.36, 6, 0.4, "#fde4ec", "#f4a8c0"]].forEach(function (ring) {
          for (i = 0; i < ring[1]; i++) {
            var a2 = ring[2] + i / ring[1] * 6.2832, px = c + Math.cos(a2) * ring[0] * 0.55, py = c + Math.sin(a2) * ring[0] * 0.55;
            var fg = g.createLinearGradient(c, c, c + Math.cos(a2) * ring[0], c + Math.sin(a2) * ring[0]);
            fg.addColorStop(0, ring[4]); fg.addColorStop(1, ring[3]);
            g.fillStyle = fg; g.beginPath(); g.ellipse(px, py, ring[0] * 0.55, ring[0] * 0.26, a2, 0, 6.3); g.fill();
          }
        });
        g.fillStyle = "#f2c94c"; g.beginPath(); g.arc(c, c, r * 0.12, 0, 6.3); g.fill();
      }
    });
  }
  function pondBuild(W, H) {
    var u = Math.min(W, H), i, K = { w: W, h: H, u: u, fish: [], rings: [], pads: [], light: [], next: 0, lastTap: 0 };
    K.bg = offscreen(W, H, function (g) {
      var fl = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, Math.max(W, H) * 0.75);
      fl.addColorStop(0, "#2d4b40"); fl.addColorStop(0.6, "#1a332d"); fl.addColorStop(1, "#0a1815");
      g.fillStyle = fl; g.fillRect(0, 0, W, H);
      for (i = 0; i < Math.round(W * H / 420); i++) {   // pebbles on the bottom, softened by the water
        var px = Math.random() * W, py = Math.random() * H, pr = 2 + Math.random() * 7, sh = 60 + Math.random() * 80;
        g.fillStyle = "rgba(" + Math.round(sh * 0.82) + "," + Math.round(sh) + "," + Math.round(sh * 0.86) + "," + (0.1 + Math.random() * 0.16).toFixed(2) + ")";
        g.beginPath(); g.ellipse(px, py, pr, pr * (0.6 + Math.random() * 0.4), Math.random() * 3, 0, 6.3); g.fill();
      }
      var vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
      vg.addColorStop(0, "rgba(2,10,8,0)"); vg.addColorStop(1, "rgba(2,10,8,0.6)");
      g.fillStyle = vg; g.fillRect(0, 0, W, H);
    });
    K.dapple = softDisc("200,240,205", 64, 0.3);
    for (i = 0; i < 6; i++) K.light.push({ x: Math.random() * W, y: Math.random() * H, r: u * (0.25 + 0.25 * Math.random()), vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, ph: Math.random() * 6.3 });
    var spots = [[0.1, 0.13], [0.86, 0.22], [0.08, 0.6], [0.9, 0.68], [0.3, 0.92], [0.78, 0.95]];
    spots.forEach(function (p, j) {
      var r = u * (0.07 + 0.05 * hash(j + 40));
      K.pads.push({ x: p[0] * W, y: p[1] * H, r: r, img: lilyPad(r, j === 1 || j === 4, j + 5), ph: hash(j + 60) * 6.3 });
    });
    for (i = 0; i < 6; i++) {
      var look = KOI_LOOKS[i], L = u * (0.17 + 0.07 * Math.random()), a = Math.random() * 6.28, f = { x: W * (0.2 + 0.6 * Math.random()), y: H * (0.2 + 0.6 * Math.random()),
        a: a, sp: L * (0.35 + 0.2 * Math.random()), L: L, look: look, turn: 0, flee: 0, fleeA: 0, ph: Math.random() * 6.3, pts: [], c: [], marks: [] };
      for (var j = 0; j < 12; j++) f.pts.push({ x: f.x - Math.cos(a) * L * j / 11, y: f.y - Math.sin(a) * L * j / 11 });
      for (j = 0; j < 5 && look.spots.length; j++) f.marks.push({ s: 0.12 + 0.6 * Math.random(), o: (Math.random() - 0.5) * 1.1, r: 0.5 + 0.6 * Math.random(), c: look.spots[j % look.spots.length] });
      K.fish.push(f);
    }
    return K;
  }
  function koiStep(f, K, dt, t) {
    var W = K.w, H = K.h, m = K.u * 0.1;
    f.turn += (Math.random() - 0.5) * dt * 2.2; f.turn *= Math.pow(0.5, dt);
    var want = f.turn;
    if (f.x < m || f.x > W - m || f.y < m * 1.6 || f.y > H - m) want += angDiff(Math.atan2(H / 2 - f.y, W / 2 - f.x), f.a) * 1.6;   // turn back from the edge
    var speed = f.sp;
    if (f.flee > 0) { want += angDiff(f.fleeA, f.a) * 5; speed *= 1 + 3 * f.flee; f.flee -= dt * 0.8; }
    f.a += want * dt;
    f.x += Math.cos(f.a) * speed * dt; f.y += Math.sin(f.a) * speed * dt;
    f.ph += dt * (3 + speed / f.L * 5);
    f.pts[0].x = f.x; f.pts[0].y = f.y;
    var seg = f.L / (f.pts.length - 1);
    for (var i = 1; i < f.pts.length; i++) {
      var p = f.pts[i], q = f.pts[i - 1], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      p.x = q.x + dx / d * seg; p.y = q.y + dy / d * seg;
    }
  }
  // Traces a closed shape through points with smooth curves.
  function smoothShape(ctx, P2) {
    var n = P2.length / 2, i;
    ctx.beginPath(); ctx.moveTo((P2[0] + P2[2]) / 2, (P2[1] + P2[3]) / 2);
    for (i = 1; i <= n; i++) {
      var a = (i % n) * 2, b = ((i + 1) % n) * 2;
      ctx.quadraticCurveTo(P2[a], P2[a + 1], (P2[a] + P2[b]) / 2, (P2[a + 1] + P2[b + 1]) / 2);
    }
    ctx.closePath();
  }
  function koiShape(f, t) {
    var N = f.pts.length, L = f.L, side1 = [], side2 = [], i;
    for (i = 0; i < N; i++) {
      var o = f.pts[Math.max(0, i - 1)], q = f.pts[Math.min(N - 1, i + 1)], dx = o.x - q.x, dy = o.y - q.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / d, ny = dx / d, s = i / (N - 1);
      var w = L * 0.14 * Math.pow(Math.sin(Math.PI * (0.1 + 0.9 * s)), 0.7) * (1 - 0.62 * s) + L * 0.008;
      var wig = Math.sin(f.ph - s * 4.5) * L * 0.035 * s;   // the body ripples more toward the tail
      var cx = f.pts[i].x + nx * wig, cy = f.pts[i].y + ny * wig;
      f.c[i] = [cx, cy, nx, ny, w, dx / d, dy / d];
      side1.push(cx + nx * w, cy + ny * w); side2.unshift(cx - nx * w, cy - ny * w);
    }
    return side1.concat(side2);
  }
  function koiDraw(ctx, f, K, t, P2) {
    var N = f.pts.length, L = f.L, lk = f.look, c = f.c, i;
    // tail fin: two soft lobes that sway
    var tb = c[N - 1], back = [-tb[5], -tb[6]], sw = Math.sin(f.ph - 4.5) * 0.5;
    var bx = back[0] * Math.cos(sw) - back[1] * Math.sin(sw), by2 = back[0] * Math.sin(sw) + back[1] * Math.cos(sw);
    ctx.fillStyle = "rgba(" + lk.fin + ",0.55)";
    ctx.beginPath(); ctx.moveTo(tb[0], tb[1]);
    ctx.quadraticCurveTo(tb[0] + bx * L * 0.12 + tb[2] * L * 0.1, tb[1] + by2 * L * 0.12 + tb[3] * L * 0.1, tb[0] + bx * L * 0.24 + tb[2] * L * 0.12, tb[1] + by2 * L * 0.24 + tb[3] * L * 0.12);
    ctx.quadraticCurveTo(tb[0] + bx * L * 0.14, tb[1] + by2 * L * 0.14, tb[0] + bx * L * 0.24 - tb[2] * L * 0.12, tb[1] + by2 * L * 0.24 - tb[3] * L * 0.12);
    ctx.quadraticCurveTo(tb[0] + bx * L * 0.12 - tb[2] * L * 0.1, tb[1] + by2 * L * 0.12 - tb[3] * L * 0.1, tb[0], tb[1]);
    ctx.fill();
    // pectoral fins, paddling
    var pf = c[3], flap = 0.75 + 0.25 * Math.sin(t * 4 + f.ph);
    [1, -1].forEach(function (sd) {
      var ax = pf[0] + pf[2] * pf[4] * sd, ay = pf[1] + pf[3] * pf[4] * sd;
      ctx.beginPath(); ctx.ellipse(ax + (pf[2] * sd * 0.5 - pf[5] * 0.6) * L * 0.06, ay + (pf[3] * sd * 0.5 - pf[6] * 0.6) * L * 0.06, L * 0.075 * flap, L * 0.03, Math.atan2(pf[3] * sd - pf[6], pf[2] * sd - pf[5]), 0, 6.3);
      ctx.fill();
    });
    // the body, with its markings
    smoothShape(ctx, P2);
    ctx.fillStyle = "rgb(" + lk.body + ")"; ctx.fill();
    ctx.save(); ctx.clip();
    f.marks.forEach(function (mk) {
      var k = Math.round(mk.s * (N - 1)), p = c[k];
      ctx.fillStyle = "rgb(" + mk.c + ")";
      ctx.beginPath(); ctx.ellipse(p[0] + p[2] * p[4] * mk.o, p[1] + p[3] * p[4] * mk.o, p[4] * mk.r * 1.3, p[4] * mk.r, Math.atan2(p[6], p[5]), 0, 6.3); ctx.fill();
    });
    if (lk.head) { ctx.fillStyle = "rgb(" + lk.head + ")"; ctx.beginPath(); ctx.arc(c[1][0], c[1][1], c[1][4] * 0.55, 0, 6.3); ctx.fill(); }
    ctx.strokeStyle = "rgba(255,255,255,0.16)"; ctx.lineWidth = c[4][4] * 0.6; ctx.lineCap = "round";   // a sheen along the back
    ctx.beginPath(); ctx.moveTo(c[1][0], c[1][1]);
    for (i = 2; i < N - 3; i++) ctx.lineTo(c[i][0], c[i][1]);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "rgba(10,10,10,0.7)";   // eyes
    [1, -1].forEach(function (sd) { ctx.beginPath(); ctx.arc(c[1][0] + c[1][2] * c[1][4] * 0.6 * sd, c[1][1] + c[1][3] * c[1][4] * 0.6 * sd, Math.max(0.8, L * 0.008), 0, 6.3); ctx.fill(); });
  }
  function scenePond(ctx, W, H, t, dt) {
    if (!POND || POND.w !== W || POND.h !== H) POND = pondBuild(W, H);
    var K = POND, P = V.pulse, u = K.u, i, f;
    ctx.drawImage(K.bg, 0, 0, W, H);
    // sunlight through the leaves overhead, dappling the bottom
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (i = 0; i < K.light.length; i++) {
      var l = K.light[i]; l.x += l.vx * dt; l.y += l.vy * dt;
      if (l.x < -l.r) l.x = W + l.r; else if (l.x > W + l.r) l.x = -l.r;
      if (l.y < -l.r) l.y = H + l.r; else if (l.y > H + l.r) l.y = -l.r;
      ctx.globalAlpha = 0.06 + 0.03 * Math.sin(t * 0.4 + l.ph); ctx.drawImage(K.dapple, l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
    }
    ctx.restore();
    // a tap: rings spread from where you touched, and any fish nearby dart away
    if (V.tap && V.tap.t !== K.lastTap) {
      K.lastTap = V.tap.t;
      K.rings.push({ x: V.tap.x, y: V.tap.y, r: 0, a: 0.6, v: u * 0.45 }, { x: V.tap.x, y: V.tap.y, r: -u * 0.05, a: 0.4, v: u * 0.45 });
      K.fish.forEach(function (fh) {
        var dx = fh.x - V.tap.x, dy = fh.y - V.tap.y;
        if (dx * dx + dy * dy < u * u * 0.3) { fh.flee = 1; fh.fleeA = Math.atan2(dy, dx); }
      });
    }
    if (t > K.next) {   // now and then a fish kisses the surface
      var fk = K.fish[Math.floor(Math.random() * K.fish.length)];
      if (!K.next) fk = null;
      if (fk) K.rings.push({ x: fk.x, y: fk.y, r: 0, a: 0.35, v: u * 0.12 });
      K.next = t + 3 + Math.random() * 6;
    }
    var shapes = [];
    for (i = 0; i < K.fish.length; i++) { f = K.fish[i]; koiStep(f, K, dt, t); shapes.push(koiShape(f, t)); }
    // shadows on the bottom, then the fish, then the pads floating above them
    var sx = u * 0.03, sy = u * 0.045;
    ctx.fillStyle = "rgba(0,8,6,0.3)";
    ctx.save(); ctx.translate(sx, sy);
    for (i = 0; i < shapes.length; i++) { smoothShape(ctx, shapes[i]); ctx.fill(); }
    ctx.restore();
    for (i = 0; i < K.pads.length; i++) { var pd = K.pads[i]; ctx.beginPath(); ctx.arc(pd.x + sx * 1.3, pd.y + sy * 1.3, pd.r, 0, 6.3); ctx.fill(); }
    for (i = 0; i < K.fish.length; i++) koiDraw(ctx, K.fish[i], K, t, shapes[i]);
    for (i = 0; i < K.pads.length; i++) {
      var p = K.pads[i], s = p.img.width / (V.dpr || 1), rot = Math.sin(t * 0.25 + p.ph) * 0.06 + P * 0.08 * Math.sin(t * 6 + p.ph);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(rot); ctx.drawImage(p.img, -s / 2, -s / 2, s, s); ctx.restore();
    }
    // rings on the surface
    ctx.lineWidth = 1.2;
    for (i = K.rings.length - 1; i >= 0; i--) {
      var rg = K.rings[i]; rg.r += rg.v * dt; rg.a -= dt * 0.35;
      if (rg.a <= 0) { K.rings.splice(i, 1); continue; }
      if (rg.r <= 0) continue;
      ctx.strokeStyle = "rgba(220,245,235," + rg.a.toFixed(3) + ")";
      ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r, 0, 6.3); ctx.stroke();
    }
  }

  var SCENES = { flame: sceneFlame, daytree: sceneDayTree, tree: sceneTree, rain: sceneRain, ocean: sceneOcean, stars: sceneStars,
    aurora: sceneAurora, snow: sceneSnow, koi: scenePond };

  function drawScene(now) {
    var fn = SCENES[S.anchor];
    if (!V.ctx || !fn) return;
    var dt = V.last ? Math.min(0.05, (now - V.last) / 1000) : 0.016;
    V.last = now;
    var t = now / 1000;
    V.pulse *= Math.exp(-dt * 1.6);
    if (t > V.nextWind) { V.windTarget = (Math.random() - 0.5) * 2; V.nextWind = t + 1.5 + Math.random() * 2.5; }
    V.wind += (V.windTarget - V.wind) * Math.min(1, dt * 1.2);
    V.ctx.clearRect(0, 0, V.w, V.h);
    fn(V.ctx, V.w, V.h, t, dt);
  }

  return {
    set: function (name) { S.anchor = name; V.last = 0; V.nextWind = 0; V.pulse = 0; sizeCanvas(); },
    resize: sizeCanvas,
    draw: drawScene,
    // a tap stirs the scene: a gust, a shooting star, ripples on the pond
    tap: function (x, y, strength) {
      V.pulse = Math.min(1, V.pulse + (strength || 0.9));
      if (S.anchor === "stars" || S.anchor === "tree") V.shoot = true;
      V.tap = { x: x == null ? V.w / 2 : x, y: y == null ? V.h * 0.45 : y, t: performance.now() / 1000 };
    },
    stop: function () { S.active = false; }
  };
}
