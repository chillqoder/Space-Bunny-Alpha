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
    w.waveIndex = Level.waves.length - 1;
    w.waveActive = null; w.camLock = null;
    w.enemies.length = 0;
    w.defeatedPosts = new Set(Level.spawns.map((_,i)=>i));
    pl.x = Level.vehicleX - 4; pl.y = Level.groundYAt(pl.x) - 30;
    w.camX = pl.x - 240; w.camY = 0;
  });
  await p.waitForTimeout(500);
  await p.keyboard.press('ArrowUp');
  await p.waitForTimeout(600);
  await p.keyboard.down('ArrowRight'); await p.keyboard.down('z');
  await p.waitForTimeout(900);
  await p.screenshot({ path: P+'shots/vdraw.png' });
  await p.keyboard.up('z'); await p.keyboard.up('ArrowRight');
  await p.keyboard.press('v');
  await p.waitForTimeout(250);
  await p.screenshot({ path: P+'shots/vdraw-cannon.png' });
  console.log(await p.evaluate(() => {
    const w = G.scenes.game.world, v = w.vehicle;
    return JSON.stringify({ ridden: v.ridden, vx: Math.round(v.x), camX: Math.round(w.camX), camY: Math.round(w.camY), lock: w.camLock });
  }));
  await b.close();
})();
