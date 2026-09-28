const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  let shown = false;
  page.on('pageerror', e => { if (!shown) { shown = true; console.log(e.stack.split('\n').slice(0,6).join('\n')); } });
  await page.goto('file://' + path.join('/Users/konstantin/Documents/Dev/Space Bunny/game', 'index.html'));
  await page.waitForTimeout(600);
  await page.keyboard.press('Enter');
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(2500);
  await page.keyboard.up('ArrowRight');
  await browser.close();
})();
