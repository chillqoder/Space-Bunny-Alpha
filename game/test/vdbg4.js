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
    const w = G.scenes.game.world, pl = w.player;
    pl.x = Level.vehicleX - 4; pl.y = Level.groundYAt(pl.x) - 30;
    return 'set x=' + Math.round(pl.x) + ' vehicleX=' + Level.vehicleX + ' v.x=' + w.vehicle.x;
  }));
  await p.waitForTimeout(30);
  console.log(await p.evaluate(() => 'after30 x=' + Math.round(G.scenes.game.world.player.x)));
  await p.waitForTimeout(200);
  console.log(await p.evaluate(() => 'after230 x=' + Math.round(G.scenes.game.world.player.x)));
  await b.close();
})();
