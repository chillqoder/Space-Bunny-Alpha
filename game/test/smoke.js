// headless smoke test: boot, start, play, screenshot
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => { if (errors.length < 3) errors.push('PAGEERROR: ' + e.message + ' @ ' + (e.stack||'').split('\n')[1]); else errors.push('PAGEERROR: ' + e.message); });
  await page.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: __dirname + '/../shots/01-title.png' });

  // start the game
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await page.screenshot({ path: __dirname + '/../shots/02-start.png' });

  // helper: hold keys for a while
  async function hold(keys, ms) {
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(ms);
    for (const k of keys) await page.keyboard.up(k);
  }

  await hold(['ArrowRight'], 3000);
  await page.screenshot({ path: __dirname + '/../shots/03-run.png' });
  await page.keyboard.down('z');
  await hold(['ArrowRight'], 1500);
  await page.keyboard.up('z');
  await page.screenshot({ path: __dirname + '/../shots/04-shoot.png' });

  // jump
  await hold(['Space'], 300);
  await hold(['ArrowRight'], 2000);
  await page.screenshot({ path: __dirname + '/../shots/05-jump.png' });

  // dump state
  const state = await page.evaluate(() => {
    const w = G.scenes.game.world;
    return {
      scene: Object.keys(G.scenes).find(k => G.scenes[k] === G.scene),
      px: Math.round(w.player.x), py: Math.round(w.player.y),
      hp: w.player.hp, onGround: w.player.onGround,
      enemies: w.enemies.length, bullets: w.bullets.length,
      particles: Particles.length, pickups: w.pickups.length,
      score: w.score, camX: Math.round(w.camX), lives: w.lives,
      rescued: w.rescued, fps: Math.round(G.fps),
      wave: w.waveIndex, weapon: w.player.weapon,
    };
  });
  console.log('STATE', JSON.stringify(state, null, 1));
  console.log('ERRORS', errors.length ? errors.slice(0, 12) : 'none');
  await browser.close();
})();
