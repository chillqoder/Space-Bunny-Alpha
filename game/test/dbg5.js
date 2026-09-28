const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  console.log(await p.evaluate(() => {
    return [0, 100, 200, 300, 400, 500, 550].map(tx => tx + ':' + Level.zoneAt[tx] + '/' + Level.zoneAtPx(tx*16).name).join('  ');
  }));
  await b.close();
})();
