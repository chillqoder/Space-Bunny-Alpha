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
  console.log(await p.evaluate(() => {
    const w = G.scenes.game.world, v = w.vehicle, pl = w.player;
    pl.x = Level.vehicleX - 4; pl.y = Level.groundYAt(pl.x) - 30;
    w.camX = pl.x - 240;
    return JSON.stringify({
      vx: v.x, vy: v.y, vw: v.w, vh: v.h, vactive: v.active, vridden: v.ridden,
      px: pl.x, py: pl.y, pcx: pl.cx, pcy: pl.cy,
      vcenter: v.x + 22, d: Math.round(Math.sqrt((pl.cx-(v.x+22))**2 + (pl.cy-(v.y-10))**2)),
      prompts: w.prompts.length,
    });
  }));
  await p.waitForTimeout(600);
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(500);
  console.log('ridden:', await p.evaluate(() => G.scenes.game.world.vehicle.ridden),
              'dist:', await p.evaluate(() => { const w=G.scenes.game.world,v=w.vehicle,pl=w.player; return Math.round(Math.hypot(pl.cx-(v.x+22), pl.cy-(v.y-10))); }));
  await b.close();
})();
