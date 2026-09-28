const { chromium } = require('playwright');
const P='/Users/konstantin/Documents/Dev/Space Bunny/game/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport:{width:900,height:400} });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://'+P+'index.html');
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    const c = document.createElement('canvas');
    c.width=900;c.height=400;
    c.style.cssText='position:fixed;left:0;top:0;z-index:9999;image-rendering:pixelated';
    document.body.appendChild(c);
    const g=c.getContext('2d'); g.imageSmoothingEnabled=false;
    g.fillStyle='#2a3040'; g.fillRect(0,0,900,400);
    let x=8;
    for (let i=0;i<3;i++){ const s=explosionSprite(i); g.drawImage(s, x, 8); g.drawImage(s, x, 60, 96,96); x+=110; }
    x=8;
    for (const s of [fighterFrame('hero','run',0,'mg',{}), fighterFrame('hero','idle',0,'pistol',{}), fighterFrame('soldier','run',2,'mg',{}), fighterFrame('rusher','run',3,'none',{}), fighterFrame('heavy','run',1,'mg',{}), fighterFrame('civ','salute',1,'none',{}), fighterFrame('sniper','crouch',0,'pistol',{}), fighterFrame('soldier','panic',1,'none',{})]) { g.drawImage(s,x,180); x+=60; }
    x=8;
    for (let i=0;i<4;i++){ g.drawImage(droneSprites[i],x,240); x+=50; }
    x=8; g.drawImage(tankB,x,270); x+=70; g.drawImage(trackFrames[0],x,290); x+=60;
    g.drawImage(bossParts.hull,x,270); x+=180; g.drawImage(bossParts.head,x,280); x+=80;
    g.drawImage(bossParts.cannon,x,300); x+=90; g.drawImage(bossParts.pod,x,300); x+=70;
    g.drawImage(bossParts.core,x,300);
    x=8; for (const k of ['medal','fruit','gold','health','ammo','shield','grenade','star']) { g.drawImage(pickupIcon(k),x,320); x+=18; }
    x=8; for (const k of ['pistol','mg','shotgun','flame','rocket','laser']) { g.drawImage(weaponIcon(k),x,338); x+=24; }
    x=8; for (const bl of ['pistol','mg','shotgun','rocket','laser','flame','ebolt','grenade']) { g.drawImage(bulletSprite(bl),x,356); x+=22; }
    x=220; for (const s of [sandbag(),sandbagWall(),crate(),barrel(),barrelStack(),wreckCar(),cactus(),palm(),rubblePile(),sandbagWall(),tyre(),barrelBlue(),drum(),ammoBoxProp(),streetSign(),girder(),fenceProp(),tentProp(),satelliteDish(),bones()]) { g.drawImage(s,x,320); x+=s.width+4; }
  });
  await p.waitForTimeout(300);
  await p.screenshot({ path: P+'shots/sprites.png' });
  await b.close();
})();
