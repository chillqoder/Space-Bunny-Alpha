const { chromium } = require('playwright');
const P = '/Users/konstantin/Documents/Dev/Space Bunny/game/';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
  const errs = [];
  page.on('pageerror', e => { if (errs.length < 5) errs.push(e.message + ' @ ' + (e.stack||'').split('\n')[1]); });
  await page.goto('file://' + P + 'index.html');
  await page.waitForTimeout(800);

  // ---- pause screen ----
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await page.screenshot({ path: P + 'shots/s-pause.png' });
  console.log('pause scene:', await page.evaluate(() => Object.keys(G.scenes).find(k => G.scenes[k] === G.scene)));
  // navigate + resume
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(150);
  await page.keyboard.press('z');
  await page.waitForTimeout(400);
  console.log('after resume:', await page.evaluate(() => Object.keys(G.scenes).find(k => G.scenes[k] === G.scene)));

  // ---- vehicle ----
  await page.evaluate(() => {
    const w = G.scenes.game.world;
    w.player.x = Level.vehicleX - 4;
    w.player.y = Level.groundYAt(w.player.x) - 30;
    w.camX = w.player.x - 240;
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: P + 'shots/s-vehicle-near.png' });
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(500);
  console.log('riding:', await page.evaluate(() => G.scenes.game.world.vehicle.ridden));
  await page.keyboard.down('ArrowRight');
  await page.keyboard.down('z');
  await page.waitForTimeout(700);
  await page.screenshot({ path: P + 'shots/s-vehicle-mg.png' });
  await page.keyboard.up('z');
  await page.keyboard.press('v');
  await page.waitForTimeout(300);
  await page.screenshot({ path: P + 'shots/s-vehicle-cannon.png' });
  await page.keyboard.press('Space');
  await page.waitForTimeout(300);
  await page.screenshot({ path: P + 'shots/s-vehicle-hop.png' });
  await page.keyboard.up('ArrowRight');
  // destroy it
  await page.evaluate(() => { const w = G.scenes.game.world; w.vehicle.hurt(999, w); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: P + 'shots/s-vehicle-boom.png' });
  console.log('after boom, riding:', await page.evaluate(() => G.scenes.game.world.vehicle.ridden), 'state:', await page.evaluate(() => G.scenes.game.world.player.state));

  // ---- death & game over ----
  await page.evaluate(() => { const w = G.scenes.game.world; w.player.invuln = 0; w.player.damage(99, w, 0); });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: P + 'shots/s-respawn.png' });
  await page.evaluate(() => { const w = G.scenes.game.world; w.player.invuln = 0; w.player.damage(99, w, 0); });
  await page.waitForTimeout(2600);
  await page.evaluate(() => { const w = G.scenes.game.world; if (w && w.player) { w.player.invuln = 0; w.player.damage(99, w, 0); } });
  await page.waitForTimeout(3000);
  const sc = await page.evaluate(() => Object.keys(G.scenes).find(k => G.scenes[k] === G.scene));
  console.log('after 3 deaths:', sc);
  await page.screenshot({ path: P + 'shots/s-gameover.png' });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(600);
  console.log('after continue:', await page.evaluate(() => Object.keys(G.scenes).find(k => G.scenes[k] === G.scene)));

  console.log('ERRORS:', errs.length ? errs : 'none');
  await browser.close();
})();
