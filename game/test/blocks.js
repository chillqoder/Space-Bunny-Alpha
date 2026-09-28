const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file:///Users/konstantin/Documents/Dev/Space%20Bunny/game/index.html');
  await p.waitForTimeout(700);
  console.log(await p.evaluate(() => {
    // find columns where a 22px-tall body cannot fit standing on the surface
    const bad = [];
    for (let tx = 0; tx < Level.W; tx++) {
      const gy = Level.groundY[tx] * 16;
      // check the rows just above the surface for a 22px body (2 tiles)
      const y0 = gy - 24, y1 = gy - 1;
      let blocked = true;
      for (let y = y0; y <= y1; y += 2) {
        if (!Level.solidAt(tx*16+8, y)) { blocked = false; break; }
      }
      if (blocked) bad.push(tx);
    }
    // group into ranges
    const ranges = [];
    for (const t of bad) {
      const last = ranges[ranges.length-1];
      if (last && t === last[1]+1) last[1] = t; else ranges.push([t,t]);
    }
    return JSON.stringify(ranges);
  }));
  await b.close();
})();
