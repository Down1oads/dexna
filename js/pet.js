// A small pet that lives along the bottom of the window: it wanders, runs while you type, naps when you stop,
// jumps for joy when your program works, looks worried when it fails, and loves being clicked.

const W = 76, H = 56; // canvas size in CSS pixels

/* ---------------- drawing (facing right; flipped for left) ---------------- */
function drawCat(ctx, st, col) {
  const { pose, t, blink } = st;
  const body = col.body, dark = col.dark, pink = "#f29bb0";
  const legSwing = pose === "walk" || pose === "run" ? Math.sin(t * (pose === "run" ? 22 : 12)) * 4 : 0;
  ctx.lineCap = "round";
  if (pose === "sleep") {
    // curled up in a ball, tail around the front
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(38, 42, 18, 10 + Math.sin(t * 2) * 0.6, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(50, 40, 8, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(45, 33); ctx.lineTo(47, 27); ctx.lineTo(50, 33); ctx.fill(); ctx.beginPath(); ctx.moveTo(51, 33); ctx.lineTo(55, 28); ctx.lineTo(56, 35); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(47, 40); ctx.lineTo(50, 41); ctx.moveTo(52, 40); ctx.lineTo(55, 41); ctx.stroke();
    ctx.strokeStyle = body; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(22, 44); ctx.quadraticCurveTo(26, 52, 46, 50); ctx.stroke();
    return;
  }
  const sit = pose === "sit" || pose === "sad";
  // tail
  ctx.strokeStyle = body; ctx.lineWidth = 4.5;
  const wag = Math.sin(t * (pose === "happy" ? 14 : 3)) * (pose === "sad" ? 2 : 6);
  ctx.beginPath();
  if (sit) { ctx.moveTo(26, 46); ctx.quadraticCurveTo(14, 48, 12 + wag * 0.3, 40); }
  else { ctx.moveTo(18, 34); ctx.quadraticCurveTo(8, 26 + wag, 10, 16 + wag); }
  ctx.stroke();
  // legs
  ctx.lineWidth = 4;
  if (sit) { ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(41, 50); ctx.moveTo(46, 40); ctx.lineTo(47, 50); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(22, 38); ctx.lineTo(22 + legSwing, 49); ctx.moveTo(28, 38); ctx.lineTo(28 - legSwing, 49); ctx.moveTo(36, 38); ctx.lineTo(36 - legSwing, 49); ctx.moveTo(42, 38); ctx.lineTo(42 + legSwing, 49); ctx.stroke(); }
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  if (sit) ctx.ellipse(36, 38, 11, 12, -0.3, 0, 6.3); else ctx.ellipse(31, 33 + (pose === "run" ? Math.sin(t * 22) : 0), 15, 8, 0, 0, 6.3);
  ctx.fill();
  // head
  const hx = sit ? 44 : 47, hy = (sit ? 22 : 26) + (pose === "happy" ? Math.sin(t * 14) : 0);
  ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, 6.3); ctx.fill();
  const droop = pose === "sad" ? 3 : 0;
  ctx.beginPath(); ctx.moveTo(hx - 7, hy - 3); ctx.lineTo(hx - 6 - droop, hy - 13 + droop); ctx.lineTo(hx - 1, hy - 7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(hx + 1, hy - 7); ctx.lineTo(hx + 6 + droop, hy - 13 + droop); ctx.lineTo(hx + 7, hy - 3); ctx.fill();
  ctx.fillStyle = pink; ctx.beginPath(); ctx.moveTo(hx - 5.5, hy - 5); ctx.lineTo(hx - 5.5 - droop * 0.6, hy - 10 + droop); ctx.lineTo(hx - 2.5, hy - 7); ctx.fill();
  // face
  ctx.fillStyle = dark;
  if (blink || pose === "happy") { ctx.strokeStyle = dark; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx - 1, hy); ctx.lineTo(hx + 2, hy - (pose === "happy" ? 1.5 : 0)); ctx.moveTo(hx + 4, hy); ctx.lineTo(hx + 7, hy - (pose === "happy" ? 1.5 : 0)); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(hx + 0.5, hy - 0.5, 1.5, 0, 6.3); ctx.arc(hx + 5.5, hy - 0.5, 1.5, 0, 6.3); ctx.fill(); }
  ctx.fillStyle = pink; ctx.beginPath(); ctx.arc(hx + 7.5, hy + 2.5, 1.2, 0, 6.3); ctx.fill();
}
function drawDog(ctx, st, col) {
  const { pose, t, blink } = st;
  const body = col.body, dark = col.dark, ear = col.ear;
  const legSwing = pose === "walk" || pose === "run" ? Math.sin(t * (pose === "run" ? 22 : 12)) * 4 : 0;
  ctx.lineCap = "round";
  if (pose === "sleep") {
    ctx.fillStyle = body; ctx.beginPath(); ctx.ellipse(36, 43, 19, 9 + Math.sin(t * 2) * 0.6, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.ellipse(52, 44, 9, 7, 0.2, 0, 6.3); ctx.fill(); ctx.beginPath(); ctx.ellipse(60, 46, 5, 4, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = ear; ctx.beginPath(); ctx.ellipse(49, 41, 3.5, 6, 0.6, 0, 6.3); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(53, 42); ctx.lineTo(56, 43); ctx.stroke();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(64, 45, 1.5, 0, 6.3); ctx.fill();
    return;
  }
  const sit = pose === "sit" || pose === "sad";
  ctx.strokeStyle = body; ctx.lineWidth = 4;
  const wag = Math.sin(t * (pose === "happy" || pose === "run" ? 20 : 6)) * 6;
  ctx.beginPath(); if (sit) { ctx.moveTo(26, 44); ctx.lineTo(16, 42 + wag * 0.3); } else { ctx.moveTo(17, 30); ctx.lineTo(9 + wag * 0.4, 20 + wag * 0.4); } ctx.stroke();
  ctx.lineWidth = 4.5;
  if (sit) { ctx.beginPath(); ctx.moveTo(40, 40); ctx.lineTo(41, 50); ctx.moveTo(46, 40); ctx.lineTo(47, 50); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(21, 37); ctx.lineTo(21 + legSwing, 49); ctx.moveTo(27, 37); ctx.lineTo(27 - legSwing, 49); ctx.moveTo(37, 37); ctx.lineTo(37 - legSwing, 49); ctx.moveTo(43, 37); ctx.lineTo(43 + legSwing, 49); ctx.stroke(); }
  ctx.fillStyle = body; ctx.beginPath();
  if (sit) ctx.ellipse(35, 38, 11, 12, -0.25, 0, 6.3); else ctx.ellipse(31, 31 + (pose === "run" ? Math.sin(t * 22) : 0), 16, 9, 0, 0, 6.3);
  ctx.fill();
  const hx = sit ? 44 : 48, hy = (sit ? 21 : 24) + (pose === "happy" ? Math.sin(t * 14) * 1.5 : 0);
  ctx.beginPath(); ctx.arc(hx, hy, 8.5, 0, 6.3); ctx.fill();
  ctx.beginPath(); ctx.ellipse(hx + 8, hy + 3, 5.5, 4, 0, 0, 6.3); ctx.fill(); // snout
  ctx.fillStyle = ear; ctx.beginPath(); ctx.ellipse(hx - 5, hy + (pose === "sad" ? 2 : 0), 3.5, 7, pose === "sad" ? 0.1 : 0.35, 0, 6.3); ctx.fill();
  ctx.fillStyle = dark;
  if (blink || pose === "happy") { ctx.strokeStyle = dark; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + 1, hy - 1); ctx.lineTo(hx + 4, hy - 2); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(hx + 2.5, hy - 1.5, 1.6, 0, 6.3); ctx.fill(); }
  ctx.beginPath(); ctx.arc(hx + 13, hy + 2, 1.8, 0, 6.3); ctx.fill(); // nose
  if (pose === "happy" || pose === "run") { ctx.fillStyle = "#e8738a"; ctx.beginPath(); ctx.ellipse(hx + 9, hy + 8, 2, 3, 0, 0, 6.3); ctx.fill(); }
}
function drawSlime(ctx, st, col) {
  const { pose, t, blink } = st;
  const hop = pose === "walk" || pose === "run" ? Math.abs(Math.sin(t * (pose === "run" ? 10 : 6))) : pose === "happy" ? Math.abs(Math.sin(t * 9)) * 1.6 : 0;
  const squash = pose === "sleep" ? 1.25 : 1 + (1 - hop) * 0.12 - hop * 0.08;
  const w = 17 * squash, hgt = 15 / squash, cx = 38, base = 50 - hop * 9;
  ctx.fillStyle = col.body;
  ctx.beginPath(); ctx.moveTo(cx - w, base); ctx.bezierCurveTo(cx - w, base - hgt * 1.9, cx + w, base - hgt * 1.9, cx + w, base); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(cx - w * 0.45, base - hgt * 1.05, 3, 5, -0.5, 0, 6.3); ctx.fill();
  ctx.fillStyle = col.dark; ctx.strokeStyle = col.dark; ctx.lineWidth = 1.5;
  const ey = base - hgt * 0.75;
  if (pose === "sleep" || blink) { ctx.beginPath(); ctx.moveTo(cx + 1, ey); ctx.lineTo(cx + 5, ey); ctx.moveTo(cx + 9, ey); ctx.lineTo(cx + 13, ey); ctx.stroke(); }
  else if (pose === "happy") { ctx.beginPath(); ctx.arc(cx + 3, ey + 1, 2.2, Math.PI, 0); ctx.arc(cx + 11, ey + 1, 2.2, Math.PI, 0); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(cx + 3, ey, 2, 0, 6.3); ctx.arc(cx + 11, ey, 2, 0, 6.3); ctx.fill(); }
  if (pose === "sad") { ctx.beginPath(); ctx.arc(cx + 7, ey + 7, 3, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else if (pose !== "sleep") { ctx.beginPath(); ctx.arc(cx + 7, ey + 3, 2.5, 0.2, Math.PI - 0.2); ctx.stroke(); }
}
function drawBubble(ctx, kind, t) {
  ctx.save();
  ctx.translate(60, 12);
  if (kind === "heart") {
    const s = 1 + Math.sin(t * 8) * 0.08; ctx.scale(s, s);
    ctx.fillStyle = "#ff5c8a"; ctx.beginPath(); ctx.moveTo(0, 4); ctx.bezierCurveTo(-8, -2, -4, -9, 0, -4); ctx.bezierCurveTo(4, -9, 8, -2, 0, 4); ctx.fill();
  } else if (kind === "z") {
    ctx.fillStyle = "rgba(160,180,220,.9)"; ctx.font = "bold 10px sans-serif"; ctx.fillText("z", -6, 2 - (t * 4) % 4); ctx.font = "bold 7px sans-serif"; ctx.fillText("z", 0, -5 - (t * 4) % 4);
  } else if (kind === "!") {
    ctx.fillStyle = "#ffd257"; ctx.beginPath(); ctx.arc(0, -2, 7, 0, 6.3); ctx.fill(); ctx.fillStyle = "#3a2a00"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("!", 0, 2);
  } else if (kind === "?") {
    ctx.fillStyle = "#9db4d8"; ctx.beginPath(); ctx.arc(0, -2, 7, 0, 6.3); ctx.fill(); ctx.fillStyle = "#1a2433"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "center"; ctx.fillText("?", 0, 2);
  }
  ctx.restore();
}

export const PETS = [
  ["cat", "Cat"], ["dog", "Dog"], ["slime", "Slime"],
];
export const PET_COLORS = {
  cat: [["#e89a4c", "Ginger"], ["#8a8f99", "Grey"], ["#2c2c30", "Black"], ["#f2ede4", "White"]],
  dog: [["#c08a5a", "Brown"], ["#e8d1a8", "Cream"], ["#4a4038", "Dark"]],
  slime: [["accent", "Your accent color"], ["#6fd17a", "Green"], ["#6fb6ff", "Blue"], ["#ff7aa8", "Pink"]],
};

export function createPet(A) {
  let el = null, ctx = null, raf = 0, last = 0;
  const st = { x: 120, dir: 1, pose: "walk", until: 0, t: 0, blink: false, bubble: null, bubbleUntil: 0, lastType: performance.now(), vy: 0, y: 0 };
  const colors = () => {
    const kind = A.settings.pet, c = A.settings.petColor;
    const list = PET_COLORS[kind] || PET_COLORS.cat;
    let body = list.some(([v]) => v === c) ? c : list[0][0];
    if (body === "accent") body = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#4c8dff";
    const light = /^#(f|e|d)/i.test(body);
    return { body, dark: light || kind === "slime" ? "#2b2b33" : "#16161a", ear: kind === "dog" ? (light ? "#c9a571" : "#5a3e28") : body };
  };
  function mount() {
    if (el) return;
    el = Object.assign(document.createElement("canvas"), { id: "pet", title: "Click me" });
    const r = Math.min(2, devicePixelRatio || 1);
    el.width = W * r; el.height = H * r;
    ctx = el.getContext("2d"); ctx.setTransform(r, 0, 0, r, 0, 0);
    el.addEventListener("click", () => { say("heart", 1600); setPose("happy", 1500); const n = (A.LS.get("petPets", 0) || 0) + 1; A.LS.set("petPets", n); A.onPetClicked?.(n); });
    document.body.append(el);
    place();
    raf = requestAnimationFrame(tick);
  }
  function unmount() { cancelAnimationFrame(raf); raf = 0; el?.remove(); el = null; }
  const floor = () => {
    const sb = document.getElementById("statusbar");
    return sb && sb.offsetParent ? innerHeight - sb.getBoundingClientRect().top : 0;
  };
  function place() { if (el) { el.style.transform = `translate(${Math.round(st.x)}px, ${Math.round(-st.y)}px)`; el.style.bottom = floor() + "px"; } }
  const say = (kind, ms) => { st.bubble = kind; st.bubbleUntil = performance.now() + ms; };
  const setPose = (p, ms) => { st.pose = p; st.until = performance.now() + ms; };
  function decide(now) {
    const idle = now - st.lastType;
    if (idle > 60000) { if (st.pose !== "sleep") { st.pose = "sleep"; st.until = Infinity; } return; }
    if (idle < 1500) { st.pose = "run"; st.until = now + 400; return; }
    const r = Math.random();
    if (r < 0.45) { st.pose = "walk"; if (Math.random() < 0.4) st.dir *= -1; st.until = now + 2000 + Math.random() * 4000; }
    else if (r < 0.85) { st.pose = "sit"; st.until = now + 2000 + Math.random() * 5000; }
    else { st.pose = "sit"; st.until = now + 3000; say("?", 1200); }
  }
  function tick(now) {
    raf = requestAnimationFrame(tick);
    if (document.hidden) { last = now; return; }
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (A.settings.reduceMotion) { st.t += 0; } else st.t += dt;
    if (now > st.until) decide(now);
    if (st.pose === "sleep" && now - st.lastType < 1000) { st.pose = "sit"; st.until = now + 800; say("!", 900); }
    const maxX = innerWidth - W;
    const speed = st.pose === "run" ? 95 : st.pose === "walk" ? 30 : 0;
    st.x += st.dir * speed * dt;
    if (st.x < 0) { st.x = 0; st.dir = 1; } if (st.x > maxX) { st.x = maxX; st.dir = -1; }
    // jumping
    if (st.vy || st.y > 0) { st.vy -= 900 * dt; st.y += st.vy * dt; if (st.y <= 0) { st.y = 0; st.vy = st.pose === "happy" && now < st.until ? 260 : 0; } }
    st.blink = st.pose !== "sleep" && (Math.floor(now / 100) % 38 === 0);
    if (st.pose === "sleep") st.bubble = "z", st.bubbleUntil = now + 500;
    // draw
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    if (st.dir < 0) { ctx.translate(W, 0); ctx.scale(-1, 1); }
    const col = colors();
    const draw = { cat: drawCat, dog: drawDog, slime: drawSlime }[A.settings.pet] || drawCat;
    // soft shadow
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.beginPath(); ctx.ellipse(36, 52, 20 - Math.min(10, st.y / 4), 2.5, 0, 0, 6.3); ctx.fill();
    draw(ctx, { pose: st.pose, t: st.t, blink: st.blink }, col);
    ctx.restore();
    if (st.bubble && now < st.bubbleUntil) drawBubble(ctx, st.bubble, st.t);
    place();
  }
  return {
    apply() { if (A.settings.pet && A.settings.pet !== "off") mount(); else unmount(); },
    typed() { st.lastType = performance.now(); },
    runEnded(failed) {
      if (!el) return;
      if (failed) { setPose("sad", 2500); say("?", 2000); }
      else { setPose("happy", 2200); say("heart", 1800); st.vy = 260; }
    },
    get state() { return st; },
  };
}
