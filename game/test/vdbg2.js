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
    pl.x = Level.vehicleX - 4; pl.y = Level.groundYAt(pl.x) - 30;
    w.camX = pl.x - 240;
  });
  for (let i=0;i<5;i++) {
    await p.waitForTimeout(200);
    console.log(i, await p.evaluate(() => {
      const w=G.scenes.game.world,v=w.vehicle,pl=w.player;
      return JSON.stringify({px:Math.round(pl.x),py:Math.round(pl.y),g:pl.onGround,vx:v.x,vy:v.y,ride:v.ridden,prompts:w.prompts.length, d: Math.round(Math.hypot(pl.cx-(v.x+22), pl.cy-(v.y-10)))});
    }));
  }
  await p.keyboard.down('ArrowUp');
  await p.waitForTimeout(200);
  console.log('up held:', await p.evaluate(() => {
    const w=G.scenes.game.world,v=w.vehicle;
    return JSON.stringify({ride:v.ridden, keysUp: Keys.up, pressedUp: pressed.up});
  }));
  await p.keyboard.up('ArrowUp');
  await b.close();
})();
