const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  console.log(await p.evaluate(() => {
    const s = {};
    for (let x = 0; x < 600; x += 25) s[x] = Level.groundY[x];
    return JSON.stringify(s);
  }));
  await b.close();
})();
