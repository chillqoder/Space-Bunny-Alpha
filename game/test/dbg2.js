const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  await page.goto('file://' + path.join('/Users/konstantin/Documents/Dev/Space Bunny/game', 'index.html'));
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    try { const w = new World(true); return 'OK px=' + w.player.x; }
    catch (e) { return 'THROW: ' + e.message + '\n' + e.stack.split('\n').slice(0,5).join('\n'); }
  });
  console.log(r);
  await browser.close();
})();
