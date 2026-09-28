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
    w.camX = 2760;
    // sample the top-left sky pixel from the world draw path
    const c = vctx;
    const before = c.getImageData(5, 100, 1, 1).data;
    return JSON.stringify({
      zoneName: Level.zoneAtPx(2760+240).name,
      zoneAt187: Level.zoneAt[187],
      ZONES1: ZONES[1].name, ZONES1sky: ZONES[1].sky,
      skyPixel: [before[0],before[1],before[2]],
    });
  }));
  await b.close();
})();
