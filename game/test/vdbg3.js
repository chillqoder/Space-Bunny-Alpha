const { chromium } = require('playwright');
const P='/Users/konstantin/Documents/Dev/Space Bunny/game/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:960,height:540} });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://'+P+'index.html');
  await p.waitForTimeout(800);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(400);
  await p.evaluate(() => {
    const w = G.scenes.game.world, pl = w.player;
    window.__hist = [];
    pl.x = Level.vehicleX - 4; pl.y = Level.groundYAt(pl.x) - 30;
    const oldRespawn = w.respawnAtCheckpoint.bind(w);
    w.respawnAtCheckpoint = function() { window.__hist.push('respawn'); return oldRespawn(); };
    const oldDie = pl.die.bind(pl);
    pl.die = function(...a) { window.__hist.push('die@' + Math.round(pl.x)); return oldDie(...a); };
    setInterval(() => window.__hist.push('x=' + Math.round(pl.x) + ' cp=' + Math.round(w.checkpoint.x)), 50);
  });
  await p.waitForTimeout(600);
  console.log(await p.evaluate(() => JSON.stringify(window.__hist.slice(0,20))));
  await b.close();
})();
