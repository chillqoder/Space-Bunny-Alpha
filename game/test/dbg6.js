const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  console.log(await p.evaluate(() => {
    const w = G.scenes.game.world;
    w.camX = 2760; w.camY = 0;
    const z = Level.zoneAtPx(w.camX + VW/2);
    return JSON.stringify({ camX: w.camX, zone: z.name, sky: z.sky, tile: Math.floor((w.camX+240)/16) });
  }));
  await b.close();
})();
