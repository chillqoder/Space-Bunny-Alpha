/* ============================================================
   04 - VEHICLES, DRONES, BOSS ART, AMBIENT CRITTERS
   ============================================================ */

/* ---------- drone / helicopter (enemy flyer) ---------- */
const droneSprites = {};
function droneFrame(i) {
  return prop('drone' + i, 34, 20, (c) => {
    const t = i;
    // rotor
    const rw = 16 - Math.abs(t) * 4;
    c.fillStyle = '#c8ccd4';
    c.fillRect(17 - rw, 2, rw * 2, 2);
    c.fillRect(2, 8, 8, 2);
    // body
    ellipseO(c, 17, 12, 10, 5, { o: P_OUT, c: '#5a6068', h: '#7a828c', s: '#33383e' });
    R(c, 10, 13, 14, 4, P_OUT); R(c, 11, 14, 12, 2, '#3a4048');
    // eye
    const eye = t % 2 ? '#ff5040' : '#ff8060';
    ellipseO(c, 24, 12, 3, 3, { o: P_OUT, c: eye, h: '#ffffff' });
    R(c, 25, 10, 1, 1, '#ffffff');
    // gun pods
    R(c, 20, 16, 3, 4, P_OUT); R(c, 20, 16, 2, 3, '#8a9098');
    R(c, 6, 15, 3, 4, P_OUT); R(c, 6, 15, 2, 3, '#8a9098');
    // tail
    R(c, 0, 10, 8, 2, P_OUT); R(c, 0, 10, 7, 1, '#6a7078');
  });
}
for (let i = 0; i < 4; i++) droneSprites[i] = droneFrame(i);

/* ---------- tracked combat vehicle (player) ---------- */
const trackFrames = [];
function trackFrame(i) {
  return prop('track' + i, 46, 10, (c) => {
    const off = (i * 3) % 6;
    R(c, 0, 0, 46, 10, P_OUT);
    R(c, 1, 1, 44, 8, '#3a3a42');
    R(c, 1, 1, 44, 2, '#5a5a64');
    for (let x = -6 + off; x < 46; x += 6) { R(c, x, 1, 3, 8, '#2a2a30'); R(c, x, 1, 1, 8, '#4a4a54'); }
    R(c, 1, 1, 44, 1, '#6a6a76'); R(c, 1, 8, 44, 1, '#202028');
  });
}
for (let i = 0; i < 6; i++) trackFrames.push(trackFrame(i));

function tankBody() {
  return prop('tankbody', 54, 34, (c) => {
    // hull
    polyO(c, [4, 20, 50, 20, 46, 32, 8, 32], { o: P_OUT, c: '#4a6a3a' });
    R(c, 4, 19, 46, 3, P_OUT); R(c, 5, 20, 44, 2, '#5f8a4a');
    // turret
    ellipseO(c, 22, 16, 12, 7, { o: P_OUT, c: '#54743f', h: '#6f9455', s: '#38502a' });
    R(c, 12, 10, 20, 10, P_OUT); R(c, 13, 11, 18, 8, '#5f8a4a'); R(c, 13, 11, 18, 2, '#7cae60');
    // commander + hatch
    R(c, 17, 4, 10, 8, P_OUT); R(c, 18, 5, 8, 6, '#6f9455');
    ellipseO(c, 22, 5, 4, 3, { o: P_OUT, c: '#e8a878', h: '#ffcfa0' });
    R(c, 18, 3, 9, 3, P_OUT); R(c, 19, 3, 7, 2, '#4a6a3a');
    // barrel
    R(c, 30, 12, 22, 6, P_OUT); R(c, 30, 12, 22, 4, '#4a5a3a'); R(c, 31, 12, 20, 1, '#6a7a4a');
    R(c, 48, 11, 5, 8, P_OUT); R(c, 48, 12, 4, 6, '#3a4a2a');
    // mg
    R(c, 14, 2, 12, 3, P_OUT); R(c, 15, 2, 10, 2, '#3a3a42');
    // exhaust
    R(c, 44, 14, 4, 5, P_OUT); R(c, 44, 14, 3, 4, '#5a5a52');
    // markings
    R(c, 8, 26, 8, 3, P_OUT); R(c, 9, 26, 6, 2, '#e0d050');
    R(c, 40, 25, 6, 3, P_OUT); R(c, 41, 25, 4, 2, '#e0d050');
  });
}
const tankB = tankBody();

/* ---------- enemy jeep ---------- */
function jeepFrame(i) {
  return prop('jeep' + i, 46, 26, (c) => {
    const bob = i % 2 ? 0 : 1;
    // wheels
    const w = tyre();
    c.drawImage(w, 3, 16); c.drawImage(w, 28, 16);
    // body
    R(c, 1, 12 + bob, 42, 10, P_OUT); R(c, 2, 13 + bob, 40, 8, '#6a5a3a');
    R(c, 2, 13 + bob, 40, 2, '#8a7a4a'); R(c, 2, 18 + bob, 40, 3, '#4a3e28');
    // cab
    R(c, 8, 4 + bob, 22, 9, P_OUT); R(c, 9, 5 + bob, 20, 7, '#7a6a42');
    R(c, 11, 6 + bob, 8, 5, '#2a3a3e'); R(c, 21, 6 + bob, 6, 5, '#2a3a3e');
    R(c, 11, 6 + bob, 8, 1, '#4a6a70'); R(c, 21, 6 + bob, 6, 1, '#4a6a70');
    // roll bar + gunner
    R(c, 30, 2 + bob, 2, 12, P_OUT);
    // gun
    R(c, 28, 6 + bob, 16, 3, P_OUT); R(c, 28, 6 + bob, 15, 2, '#3a3a42');
    // headlight + grill
    R(c, 41, 14 + bob, 3, 4, P_OUT); R(c, 41, 14 + bob, 2, 3, '#f0e070');
    R(c, 2, 14 + bob, 3, 6, P_OUT);
    // dust
  });
}
for (let i = 0; i < 2; i++) jeepFrame(i);

function jeepGunner() {
  return prop('jeepgun', 16, 18, (c) => {
    R(c, 2, 6, 12, 10, P_OUT); R(c, 3, 7, 10, 8, '#6a5a3a');
    ellipseO(c, 8, 5, 4, 4, { o: P_OUT, c: '#e8a878', h: '#ffcfa0' });
    R(c, 4, 2, 8, 3, P_OUT); R(c, 5, 2, 6, 2, '#4a4a3a');
    R(c, 10, 4, 8, 3, P_OUT); R(c, 10, 4, 7, 2, '#3a3a42');
  });
}

/* ---------- BOSS: the SANDWORM MK-IV siege machine ---------- */
const bossParts = {};
function bossPart(key, w, h, fn) { bossParts[key] = prop('boss|' + key, w, h, fn); }

/* main hull */
bossPart('hull', 168, 96, (c) => {
  // tracks
  for (const tx of [4, 112]) {
    R(c, tx, 58, 52, 38, P_OUT);
    R(c, tx + 1, 59, 50, 36, '#2e323a');
    R(c, tx + 1, 59, 50, 3, '#4a505a');
    for (let i = 0; i < 8; i++) { R(c, tx + 2 + i * 6, 60, 3, 34, '#22262c'); R(c, tx + 2 + i * 6, 60, 1, 34, '#3c424a'); }
    for (let i = 0; i < 5; i++) { const d = 12 + i * 6; ellipseO(c, tx + 26, 77, d, d - 2, { o: '#1a1e24', c: '#3c424a', h: '#565e68' }); disc(c, tx + 26, 77, 5, '#22262c'); }
    R(c, tx + 1, 92, 50, 3, '#1a1e24');
  }
  // lower hull
  polyO(c, [12, 44, 156, 44, 164, 66, 4, 66], { o: '#0a0a10', c: '#4a4f5c' });
  R(c, 14, 45, 140, 4, '#5f6674');
  R(c, 10, 60, 148, 5, '#33373f');
  for (let x = 16; x < 152; x += 12) R(c, x, 52, 6, 8, '#3a3f4a');
  // rivets
  for (let x = 10; x < 160; x += 8) { R(c, x, 46, 2, 2, '#6b7280'); }
  // armour plating top
  polyO(c, [26, 20, 142, 20, 150, 44, 18, 44], { o: '#0a0a10', c: '#545a68' });
  R(c, 28, 22, 112, 4, '#6e7684');
  R(c, 24, 38, 124, 4, '#3d434e');
  // vents
  for (let i = 0; i < 5; i++) { R(c, 36 + i * 20, 26, 12, 10, '#20242c'); R(c, 37 + i * 20, 27, 10, 2, '#0a0a10'); R(c, 37 + i * 20, 31, 10, 1, '#4a505c'); }
  // stencilled faction mark
  R(c, 128, 34, 16, 8, '#0a0a10'); R(c, 130, 36, 12, 4, '#c03a2a');
  // exhaust stacks
  for (const ex of [30, 138]) {
    R(c, ex, 4, 12, 18, '#0a0a10'); R(c, ex + 1, 5, 10, 16, '#3a4048'); R(c, ex + 2, 5, 3, 16, '#5a626c');
    R(c, ex - 1, 2, 14, 3, '#0a0a10'); R(c, ex, 2, 12, 2, '#4a5058');
  }
});
/* head / cockpit */
bossPart('head', 66, 52, (c) => {
  polyO(c, [4, 10, 60, 6, 66, 30, 56, 48, 8, 48, 0, 28], { o: '#0a0a10', c: '#5a6070' });
  R(c, 8, 12, 50, 4, '#727a8a');
  // visor slit
  R(c, 10, 22, 48, 10, '#0a0a10'); R(c, 12, 24, 44, 6, '#1a2a3a');
  for (let x = 14; x < 54; x += 8) R(c, x, 26, 4, 2, '#e0603a');
  // mandible guards
  polyO(c, [2, 30, 18, 32, 16, 48, 2, 46], { o: '#0a0a10', c: '#454b58' });
  polyO(c, [64, 28, 48, 30, 50, 48, 64, 46], { o: '#0a0a10', c: '#454b58' });
  R(c, 3, 32, 12, 3, '#6e7684'); R(c, 51, 30, 12, 3, '#6e7684');
  // top antenna
  R(c, 30, 0, 4, 10, '#0a0a10'); R(c, 31, 0, 2, 9, '#5a6070'); disc(c, 32, -1, 2, '#e05050');
});
/* cannon (weak point 1) - left arm */
bossPart('cannon', 78, 34, (c) => {
  R(c, 0, 4, 62, 26, '#0a0a10'); R(c, 1, 5, 60, 24, '#3f454f');
  R(c, 1, 6, 58, 4, '#5c636f');
  R(c, 58, 2, 20, 30, '#0a0a10'); R(c, 59, 3, 18, 28, '#4a505c'); R(c, 62, 6, 14, 4, '#6e7684');
  R(c, 60, 12, 16, 3, '#2a2e36'); R(c, 60, 21, 16, 3, '#2a2e36');
  for (let x = 6; x < 56; x += 10) R(c, x, 10, 5, 12, '#343941');
  R(c, 0, 12, 6, 10, '#2a2e36');
});
/* missile pod (weak point 2) - right arm */
bossPart('pod', 56, 40, (c) => {
  R(c, 2, 2, 52, 34, '#0a0a10'); R(c, 3, 3, 50, 32, '#464c58');
  R(c, 4, 4, 48, 4, '#646c7a');
  for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) {
    const x = 8 + k * 12, y = 12 + r * 13;
    ellipseO(c, x + 4, y + 4, 5, 4.5, { o: '#0a0a10', c: '#c03a2a', h: '#e0604a', s: '#7a2418' });
    disc(c, x + 3, y + 3, 1.5, '#f0d060');
  }
  R(c, 0, 14, 4, 12, '#2a2e36');
});
/* weak point core */
bossPart('core', 34, 34, (c) => {
  disc(c, 17, 17, 16, '#0a0a10');
  disc(c, 17, 17, 14, '#8a2a1a');
  disc(c, 17, 17, 11, '#e0502a');
  disc(c, 17, 17, 7, '#ffd060');
  disc(c, 15, 15, 4, '#ffffff');
  c.strokeStyle = '#0a0a10'; c.lineWidth = 2;
  for (let i = 0; i < 6; i++) { const a = i * TAU / 6; c.beginPath(); c.moveTo(17 + Math.cos(a) * 15, 17 + Math.sin(a) * 15); c.lineTo(17 + Math.cos(a + 0.4) * 8, 17 + Math.sin(a + 0.4) * 8); c.stroke(); }
});
/* boss leg / foot stomp fx */
bossPart('stomp', 40, 20, (c) => {
  polyO(c, [0, 8, 40, 6, 38, 20, 2, 20], { o: '#0a0a10', c: '#4a4f5c' });
  R(c, 2, 9, 36, 3, '#6b7280');
});

/* ---------- ambient: birds, dust, weather ---------- */
const birdFrame = (i) => prop('bird' + i, 12, 6, (c) => {
  const y = i % 2 ? 0 : 2;
  c.strokeStyle = '#2a2a3a'; c.lineWidth = 1.4;
  c.beginPath(); c.moveTo(0, 3 + y); c.quadraticCurveTo(3, 0 + y, 6, 2.5); c.quadraticCurveTo(9, 0 + y, 12, 3 + y); c.stroke();
});
for (let i = 0; i < 4; i++) birdFrame(i);

/* blood/goo decal */
const decal = (col) => prop('decal' + col, 16, 8, (c) => {
  c.fillStyle = col;
  c.beginPath(); c.ellipse(8, 4, 7, 3.2, 0, 0, TAU); c.fill();
  for (let i = 0; i < 5; i++) { const a = i / 5 * TAU; disc(c, 8 + Math.cos(a) * 7, 4 + Math.sin(a) * 3, 1.2, col); }
});

/* candle / misc fx sprite */
const casSprite = prop('cas', 6, 6, (c) => { R(c, 0, 0, 5, 3, P_OUT); R(c, 1, 0, 3, 2, '#e0c060'); R(c, 1, 2, 3, 1, '#8a6a2a'); });
