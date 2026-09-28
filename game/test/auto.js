// Autopilot: an AI bot that plays the level with god-mode to validate
// progression, waves, and the boss fight. Teleports forward in steps.
const { chromium } = require('playwright');
const P = '/Users/konstantin/Documents/Dev/Space Bunny/game/';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errors = [];
  page.on('pageerror', e => { if (errors.length < 6) errors.push(e.message + ' @ ' + (e.stack || '').split('\n')[1]); });
  await page.goto('file://' + P + 'index.html');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(400);

  // install autopilot: walk right, shoot at enemies, jump gaps, clear waves by cheating
  await page.evaluate(() => {
    const w = G.scenes.game.world;
    window.__log = [];
    window.__autopilot = setInterval(() => {
      if (!w || !w.player) return;
      const p = w.player;
      p.hp = p.maxHp; p.invuln = 2; p.shield = 5;
      p.grenades = 20;
      // shoot at nearest enemy
      let best = null, bd = 1e9;
      for (const e of w.enemies) {
        if (e.dead) continue;
        const d = Math.abs(e.cx - p.cx);
        if (d < bd) { bd = d; best = e; }
      }
      Keys.left = false; Keys.right = true;      // always push forward
      Keys.fire = true; Keys.up = false; Keys.down = false;
      if (best) {
        const dy = best.cy - p.cy;
        if (dy < -14) Keys.up = true;             // aim up but keep moving
        else if (dy > 14) Keys.down = true;
      }
      // break any cover crates in the way
      for (const pk of w.pickups) if (!pk.dead && pk.kind === 'crate_cover') {
        if (Math.abs(pk.cx - p.cx) < 26) w.breakCrate(pk);
      }
      if (w.waveActive) { for (const e of w.waveActive.list) if (!e.dead) e.hurt(999, w, p.cx); }
      // jump when blocked by a wall, a crate, or a ledge
      const aheadSolid = Level.solidAt(p.cx + 12, p.y + 6) || Level.solidAt(p.cx + 12, p.y + 18);
      const ledge = !Level.solidAt(p.cx + 14, p.feet + 2) && !Level.solidAt(p.cx + 14, p.feet + 6);
      if (p.onGround && (aheadSolid || ledge || Math.random() < 0.02)) { pressed.jump = true; }
      p.x += 1.1;                       // gentle forward push
      if (w.boss && !w.boss.dead) {
        // damage the boss parts so the fight progresses
        const b = w.boss;
        b.parts.cannon.hp -= 4; b.parts.pod.hp -= 4; b.parts.core.hp -= 4;
        if (b.parts.cannon.hp <= 0) b.parts.cannon.broken = true;
        if (b.parts.pod.hp <= 0) b.parts.pod.broken = true;
        if (b.parts.cannon.broken && b.parts.pod.broken) b.parts.core.hidden = false;
        b.hp -= 2.2;
        if (b.hp <= 0) b.die(w);
      }
    }, 33);
  });

  const marks = [0.15, 0.35, 0.55, 0.75, 0.9, 0.99];
  let lastMark = 0;
  for (let step = 0; step < 200; step++) {
    await page.waitForTimeout(400);
    const st = await page.evaluate(() => {
      const sc = Object.keys(G.scenes).find(k => G.scenes[k] === G.scene);
      const w = G.scenes.game.world;
      if (!w) return { sc, done: true };
      return {
        sc, done: false, px: Math.round(w.player.x), camX: Math.round(w.camX),
        wave: w.waveIndex, locked: !!w.waveActive, enemies: w.enemies.length,
        score: w.score, rescued: w.rescued, lives: w.lives,
        boss: w.boss ? { hp: Math.round(w.boss.hp), phase: w.boss.phase, state: w.boss.state, dead: w.boss.dead, x: Math.round(w.boss.x) } : null,
        finished: w.finished, part: Particles.length, fps: Math.round(G.fps),
        vehicle: w.vehicle.active && w.vehicle.ridden,
      };
    });
    const prog = st.sc !== 'game' ? 1 : Math.min(1, (st.px || 0) / (570 * 16));
    while (lastMark < marks.length && prog >= marks[lastMark]) {
      await page.screenshot({ path: P + 'shots/auto-' + marks[lastMark] + '.png' });
      console.log('MARK', marks[lastMark], JSON.stringify(st));
      lastMark++;
    }
    if (st.done || st.sc !== 'game') { console.log('END SCENE', st.sc, JSON.stringify(st)); break; }
    if (step % 25 === 0) console.log('step', step, JSON.stringify(st));
    if (st.finished) { await page.waitForTimeout(3000); }
  }
  console.log('ERRORS:', errors.length ? errors : 'none');
  await page.screenshot({ path: P + 'shots/auto-final.png' });
  await browser.close();
})();
