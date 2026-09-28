/* ============================================================
   15 - SCENES: title, pause, game over, level complete
   ============================================================ */

G.scenes.title = {
  t: 0, camX: 0, demo: 0, world: null,
  enter() {
    this.t = 0; this.demo = 0;
    Audio_.playMusic('title');
  },
  update(dt) {
    this.t += dt;
    this.demo += dt;
    this.camX += 22 * dt;
    if (this.camX > Level.W * TILE - VW) this.camX = 0;
    if (hit('start') || hit('fire') || hit('jump')) {
      SFX('confirm');
      Audio_.unlock();
      G.score = 0; G.lives = 3;
      G.scenes.game.world = null;
      Scene.set('game');
      return;
    }
    if (hit('mute')) { G.muted = !G.muted; Audio_.setMuted(G.muted); }
  },
  draw(c) {
    const camX = Math.floor(this.camX), camY = 0;
    BG.draw(c, camX, 0, this.demo);
    c.save();
    c.translate(-camX, 0);
    this.drawDemoTiles(c, camX);
    c.restore();
    BG.fore(c, camX, 0, this.demo);
    // darken for the logo
    c.fillStyle = 'rgba(8,6,12,0.45)';
    c.fillRect(0, 0, VW, VH);
    // logo
    const bounce = Math.sin(this.t * 2.2) * 2;
    const t2 = this.t;
    // sun burst rays
    c.save();
    c.globalAlpha = 0.10;
    c.translate(VW / 2, 78);
    c.rotate(t2 * 0.15);
    for (let i = 0; i < 12; i++) {
      c.rotate(TAU / 12);
      c.fillStyle = i % 2 ? '#ffd060' : '#ff8040';
      c.beginPath(); c.moveTo(0, 0); c.lineTo(300, -26); c.lineTo(300, 26); c.closePath(); c.fill();
    }
    c.restore();
    // shadow plate
    c.save();
    c.globalAlpha = 0.5;
    c.fillStyle = '#1a0c14';
    c.fillRect(0, 52, VW, 58);
    c.restore();
    // title
    const big = 4;
    text(c, 'OPERATION', VW / 2, 58 + bounce, '#ff5030', big, 'c');
    text(c, 'OPERATION', VW / 2, 56 + bounce, '#ffe060', big, 'c');
    text(c, 'SANDSTORM', VW / 2, 86 + bounce, '#ff5030', big, 'c');
    text(c, 'SANDSTORM', VW / 2, 84 + bounce, '#ffffff', big, 'c');
    text(c, 'A RUN-AND-GUN BLOODBATH', VW / 2, 114, '#c0c8d8', 1, 'c');

    // hero mascot
    const hx = VW / 2, hy = 176;
    const spr = fighterFrame('hero', this.t % 2 < 1 ? 'idle' : 'salute', Math.floor(this.t * 8) % 4, 'pistol', {});
    drawSpr(c, spr, hx, hy, 1, 0);
    c.save();
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.2 + 0.1 * Math.sin(this.t * 5);
    c.fillStyle = '#ff8040';
    c.fillRect(hx - 16, hy - 34, 32, 34);
    c.restore();
    // muzzle blink
    if (this.t % 2 < 0.08) {
      c.save();
      c.translate(hx + 12, hy - 20);
      c.globalAlpha = 0.9;
      c.drawImage(muzzleFlash(), 0, -9);
      c.restore();
    }

    // press start
    if (this.t > 0.6 && (this.t % 1.1) < 0.7) {
      text(c, 'PRESS  START', VW / 2, 200, '#ffffff', 2, 'c');
    }
    text(c, Touch.active ? 'TAP TO START' : 'PRESS ENTER OR Z', VW / 2, 218, '#9aa2b4', 1, 'c');
    // controls
    c.fillStyle = 'rgba(8,6,12,0.6)';
    c.fillRect(0, VH - 40, VW, 40);
    text(c, 'MOVE/ AIM: ARROWS OR WASD', 8, VH - 35, '#8a90a0', 1);
    text(c, 'JUMP: SPACE    FIRE: Z / J', 8, VH - 26, '#8a90a0', 1);
    text(c, 'GRENADE: X    KNIFE: C', 8, VH - 17, '#8a90a0', 1);
    text(c, 'PAUSE: ESC    MUTE: M', 8, VH - 8, '#8a90a0', 1);
    text(c, 'GAMEPAD + TOUCH SUPPORTED', VW - 8, VH - 35, '#8a90a0', 1, 'r');
    text(c, 'HIGH SCORE ' + String(Math.max(G.score, 0)).padStart(7, '0'), VW - 8, VH - 8, '#ffe060', 1, 'r');
    if (G.muted) text(c, 'SOUND OFF (M)', VW - 8, VH - 26, '#ff5040', 1, 'r');
    if (G.fps) text(c, Math.round(G.fps) + ' FPS', 4, VH - 48, 'rgba(255,255,255,0.25)', 1);
  },
  drawDemoTiles(c, camX) {
    const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
    const x1 = Math.min(Level.W - 1, Math.floor((camX + VW) / TILE) + 1);
    for (let tx = x0; tx <= x1; tx++) {
      const ty = Level.groundY[tx];
      const type = ZONES[Level.zoneAt[tx]].ground;
      for (let y = ty; y < Level.H; y++) {
        c.drawImage(tileSprite(type, (hash2(tx, y * 3) * 3) | 0, y === ty), tx * TILE, y * TILE);
      }
    }
    // scattered silhouette props for depth
    for (const pr of Level.props) {
      if (pr.x < camX - 60 || pr.x > camX + VW + 60) continue;
      if (pr.kind === 'flag' || pr.kind === 'ladder' || pr.kind === '_plat') continue;
      const spr = { palm: palm, cactus: cactus, wreckCar: wreckCar, sandbagWall: sandbagWall, rubble: rubblePile, sign: signProp, street: streetSign, tent: tentProp, bones: bones, lamp: lampPost }[pr.kind];
      if (spr) { const img = spr(); c.drawImage(img, pr.x, pr.y - img.height); }
    }
  },
};

G.scenes.game = {
  world: null,
  enter() {
    Audio_.unlock();
    if (!this.world) this.world = new World(true);

    this.world.active = true;
    Audio_.playMusic(this.world.boss && !this.world.boss.dead ? 'boss' : 'action');
  },
  exit() { },
  update(dt) {
    if (this.world.active) this.world.update(dt);
  },
  draw() {
    if (this.world) this.world.draw(vctx);
  },
};

G.scenes.pause = {
  world: null, t: 0, sel: 0,
  enter() { Audio_.playMusic(null); this.t = 0; this.sel = 0; },
  update(dt) {
    this.t += dt;
    if (hit('pause') || hit('start')) { SFX('blip'); Scene.set('game'); return; }
    if (hit('down')) { this.sel = (this.sel + 1) % 4; SFX('blip'); }
    if (hit('up')) { this.sel = (this.sel + 3) % 4; SFX('blip'); }
    if (hit('left') || hit('right')) { this.sel = (this.sel + 1) % 4; SFX('blip'); }
    if (hit('mute')) { G.muted = !G.muted; Audio_.setMuted(G.muted); }
    if (hit('jump') || hit('fire')) {
      SFX('confirm');
      if (this.sel === 0) { Scene.set('game'); }
      else if (this.sel === 1) { G.scenes.game.world = null; Scene.set('game'); }
      else if (this.sel === 2) { G.muted = !G.muted; Audio_.setMuted(G.muted); }
      else { Audio_.playMusic('title'); Scene.set('title'); }
    }
  },
  draw() {
    const w = G.scenes.game.world;
    if (w) w.draw(vctx);
    c2d().fillStyle = 'rgba(6,4,10,0.65)';
    c2d().fillRect(0, 0, VW, VH);
    text(vctx, 'PAUSED', VW / 2, 80, '#ffffff', 3, 'c');
    const items = ['RESUME', 'RESTART LEVEL', 'SOUND: ' + (G.muted ? 'OFF' : 'ON'), 'QUIT TO TITLE'];
    for (let i = 0; i < items.length; i++) {
      const y = 130 + i * 18;
      const on = i === this.sel;
      if (on) {
        vctx.fillStyle = 'rgba(255,224,96,0.15)';
        vctx.fillRect(VW / 2 - 90, y - 4, 180, 14);
        text(vctx, '>', VW / 2 - 84, y, '#ffe060', 1);
      }
      text(vctx, items[i], VW / 2, y, on ? '#ffe060' : '#a0a8b8', 1, 'c');
    }
    text(vctx, 'ARROWS + Z / SPACE', VW / 2, VH - 20, '#6a7080', 1, 'c');
  },
};

G.scenes.gameover = {
  t: 0, count: 10, world: null, lastBeep: 99,
  enter(arg) {
    this.t = 0; this.count = 10; this.world = arg;
    this.lastBeep = 99;
    Audio_.stopMusic();
    SFX('gameOver');
  },
  update(dt) {
    this.t += dt;
    const c = Math.ceil(10 - this.t);
    if (c !== this.lastBeep && c >= 0) { this.lastBeep = c; SFX('beep', { v: c <= 3 ? 1 : 0.6 }); }
    if (this.t > 10.2) { G.scenes.game.world = null; Scene.set('title'); return; }
    if (hit('start') || hit('fire') || hit('jump')) {
      SFX('confirm');
      G.lives = 3;
      G.scenes.game.world = null;
      Scene.set('game');
    }
  },
  draw() {
    if (this.world) this.world.draw(vctx);
    const c2 = c2d();
    c2.fillStyle = 'rgba(10,2,4,0.72)';
    c2.fillRect(0, 0, VW, VH);
    const bob = Math.sin(this.t * 3) * 1.5;
    text(vctx, 'GAME OVER', VW / 2, 88 + bob, '#c02a1a', 4, 'c');
    text(vctx, 'GAME OVER', VW / 2, 86 + bob, '#ff5030', 4, 'c');
    text(vctx, 'SCORE  ' + String(this.world ? this.world.score : 0).padStart(7, '0'), VW / 2, 126, '#ffffff', 2, 'c');
    text(vctx, 'POW RESCUED  ' + (this.world ? this.world.rescued + '/' + this.world.totalCaptives : '0/0'), VW / 2, 148, '#ffe060', 1, 'c');
    const left = Math.max(0, 10 - this.t);
    text(vctx, 'CONTINUE?  ' + Math.ceil(left), VW / 2, 172, left < 3.5 ? '#ff4030' : '#ffffff', 2, 'c');
    if (this.t < 10 && (this.t % 1 < 0.55)) text(vctx, 'PRESS START', VW / 2, 196, '#ffffff', 1, 'c');
  },
};

G.scenes.complete = {
  tally: null, t: 0, step: 0, shown: 0,
  enter(tally) {
    this.tally = tally || { score: 0, rescued: 0, total: 0, lives: 0, time: 0 };
    this.t = 0; this.step = 0; this.shown = 0;
    Audio_.playMusic('action');
    SFX('levelClear');
    G.credits++;
  },
  update(dt) {
    this.t += dt;
    const T = this.tally;
    const bonusP = T.rescued * 1000;
    const secretP = T.rescued >= 3 ? T.rescued * 500 : 0;
    const lifeP = T.lives * 2000;
    this.total = T.score + bonusP + secretP + lifeP;
    if (this.t > 0.4 && this.step === 0) { this.step = 1; SFX('beep'); }
    if (this.t > 1.1 && this.step === 1) { this.step = 2; SFX('beep'); }
    if (this.t > 1.6 && this.step === 2) { this.step = 3; SFX('beep'); }
    if (this.t > 2.1 && this.step === 3) { this.step = 4; SFX('coin'); }
    this.shown = lerp(this.shown, this.total, 0.08);
    if (this.t > 3.2 && (hit('start') || hit('fire') || hit('jump'))) {
      SFX('confirm');
      G.scenes.game.world = null;
      Scene.set('title');
    }
  },
  draw() {
    const T = this.tally, c2 = c2d();
    const t = this.t;
    // celebration background
    c2.fillStyle = '#0a0812'; c2.fillRect(0, 0, VW, VH);
    for (let i = 0; i < 60; i++) {
      const x = hash2(i, 3) * VW, y = ((hash2(i, 5) * VH) + t * (20 + hash2(i, 7) * 60)) % (VH + 20);
      c2.fillStyle = ['#ffe060', '#ff6030', '#60f0f0', '#ff90c0'][i % 4];
      c2.fillRect(x | 0, (y - 10) | 0, 2, 4);
    }
    text(vctx, 'MISSION COMPLETE!', VW / 2, 24, '#ffd040', 2, 'c');
    text(vctx, 'OPERATION SANDSTORM - ZONE CLEARED', VW / 2, 44, '#c0c8d8', 1, 'c');
    // hero victory pose
    const spr = fighterFrame('hero', 'victory', Math.floor(t * 8) % 4, 'none', {});
    drawSpr(vctx, spr, VW / 2, VH - 44, 1, 0);
    const rows = [
      ['SCORE', T.score, this.step >= 0],
      ['POW RESCUED  ' + T.rescued + '/' + T.total, T.rescued * 1000, this.step >= 1],
      ['SECRET AREAS', T.rescued >= 3 ? T.rescued * 500 : 0, this.step >= 2],
      ['LIVES BONUS  ' + T.lives, T.lives * 2000, this.step >= 2],
    ];
    let y = 70;
    for (const [label, val, show] of rows) {
      if (!show) continue;
      text(vctx, label, 80, y, '#a0a8b8', 1);
      text(vctx, String(val), 400, y, '#ffffff', 1, 'r');
      y += 14;
    }
    text(vctx, 'TOTAL', 80, y + 6, '#ffe060', 2);
    text(vctx, String(Math.floor(this.shown)), 400, y + 6, '#ffe060', 2, 'r');
    // rank
    if (this.step >= 4) {
      const rank = this.total > 90000 ? 'S' : this.total > 60000 ? 'A' : this.total > 35000 ? 'B' : 'C';
      const pulse = 1 + 0.12 * Math.sin(t * 6);
      c2.save();
      c2.translate(VW - 56, 96);
      c2.scale(pulse, pulse);
      text(vctx, 'RANK', 0, -14, '#a0a8b8', 1, 'c');
      text(vctx, rank, 0, -2, rank === 'S' ? '#ffd040' : rank === 'A' ? '#60f0f0' : '#c0c8d8', 4, 'c');
      c2.restore();
    }
    if (this.step >= 4 && (t % 1.1) < 0.7) text(vctx, 'PRESS START', VW / 2, VH - 22, '#ffffff', 1, 'c');
  },
};

function c2d() { return vctx; }

/* ============================================================
   BOOT
   ============================================================ */
function boot() {
  Level.build();
  // build a few hot sprites up-front to avoid hitches
  tileSprite('sand', 0, true);
  crate(); sandbagWall(); wreckCar(); cactus(); palm();
  explosionSprite(0); explosionSprite(1); explosionSprite(2);
  fighterFrame('hero', 'idle', 0, 'pistol', {});
  tankBody();
  setupTouch();
  resize();
  Scene.set('title');
  requestAnimationFrame(frame);
  // audio needs a user gesture on most browsers
  const unlock = () => { Audio_.unlock(); if (G.scenes.title) Audio_.playMusic('title'); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });
  addEventListener('touchstart', unlock, { once: true });
  document.body.addEventListener('click', unlock, { once: true });
  window.__gameReady = true;
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
