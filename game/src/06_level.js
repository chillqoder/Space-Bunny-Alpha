/* ============================================================
   06 - LEVEL: terrain, zones, waves, secrets, parallax
   ============================================================ */
const T_EMPTY = 0, T_SOLID = 1, T_PLAT = 2, T_LADDER = 3, T_SPIKE = 4, T_SAND = 5;

function RNG(seed) {
  let s = seed >>> 0 || 1;
  return function () {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

const ZONES = [
  { i: 0, name: 'OUTPOST 7', x0: 0, x1: 170, type: 'desert', ground: 'sand', sky: ['#f6c96a', '#f2a45c', '#e07a4a'], far: '#c05a3a', mid: '#9a4a34', near: '#6a3428' },
  { i: 1, name: 'BOMBED VILLAGE', x0: 170, x1: 330, type: 'village', ground: 'dirt', sky: ['#9aa8c0', '#7a8aa8', '#5a6a8a'], far: '#4a5a74', mid: '#3c4a60', near: '#2a3444' },
  { i: 2, name: 'THE CANYON', x0: 330, x1: 460, type: 'canyon', ground: 'stone', sky: ['#3a2a44', '#241a2c', '#120c18'], far: '#2a1e30', mid: '#1e1624', near: '#140e18' },
  { i: 3, name: 'FORTRESS APPROACH', x0: 460, x1: 600, type: 'arena', ground: 'fort', sky: ['#8a2a30', '#5a1a24', '#2a0e14'], far: '#3c1418', mid: '#2a0e12', near: '#1c0a0c' },
];
const ZONE_X_END = 600;

const Level = {
  W: 600, H: 32, grid: null, groundY: null, zoneAt: null,
  props: [], waves: [], spawns: [], pickups: [], captives: [], decals: [],
  secrets: [], ammoPiles: [], flags: [], smokes: [], birds: [],
  build() {
    const W = this.W, H = this.H;
    this.grid = new Uint8Array(W * H);
    this.groundY = new Int16Array(W);
    this.zoneAt = new Int16Array(W);
    this.props = []; this.waves = []; this.spawns = []; this.pickups = [];
    this.captives = []; this.secrets = []; this.flags = []; this.ammoPiles = [];
    this.setT = (x, y, t) => { if (x >= 0 && x < W && y >= 0 && y < H) this.grid[y * W + x] = t; };
    this.getT = (x, y) => x < 0 || x >= W || y < 0 ? T_SOLID : y >= H ? T_EMPTY : this.grid[y * W + x];
    // Authored plateaus: a clear street through every biome, with short stair transitions.
    const terraces = [[0,18],[66,17],[78,18],[110,17],[124,18],[170,18],
      [330,19],[346,18],[364,19],[394,18],[418,19],[446,18],[460,18],[500,17],[516,18]];
    for (let x = 0; x < W; x++) {
      let gy = 18;
      for (const [start, row] of terraces) if (x >= start) gy = row;
      this.groundY[x] = gy;
      this.zoneAt[x] = x < 170 ? 0 : x < 330 ? 1 : x < 460 ? 2 : 3;
      for (let y = gy; y < H; y++) this.setT(x, y, T_SOLID);
      if (x >= 330 && x < 460) for (let y = 0; y < 3 + (Math.floor(x / 9) % 2); y++) this.setT(x, y, T_SOLID);
    }
    for (let x = 596; x < W; x++) for (let y = 4; y < H; y++) this.setT(x, y, T_SOLID);
    const groundProp = (x, kind, opts) => this.prop(x, this.groundY[x], kind, opts);
    const deck = (x, width, rise, material = 'wood') => {
      const row = this.groundY[x] - rise;
      this.platform(x, row, width, material);
      const lx = x + 1;
      // The ladder ends under the platform so the platform remains standable.
      for (let y = row + 1; y < this.groundY[lx]; y++) this.ladder(lx, y);
      this.prop(lx, row + 1, 'ladder', {h:(this.groundY[lx]-row-1)*TILE});
      return row;
    };
    // Outpost: open runway, two watch posts, supply stops and a vehicle depot.
    for (const [x, kind] of [[8,'sign'],[14,'palm'],[26,'wreckCar'],[31,'sandbagWall'],
      [52,'flag'],[60,'tent'],[68,'cactus'],[83,'rubble'],[88,'sandbagWall'],[106,'palm'],
      [117,'wreckCar'],[132,'flag'],[145,'tent'],[157,'sandbagWall'],[164,'sign']]) groundProp(x,kind);
    deck(22,6,3); deck(72,7,3); deck(112,7,3);
    // Village: facades are scenery, roofs are optional routes, the street stays open.
    for (const [x,width,rise] of [[176,12,5],[204,14,6],[235,12,5],[270,14,6],[305,12,5]]) {
      const row=deck(x,width,rise,'metal');
      this.props.push({kind:'facade',x:x*TILE,y:row*TILE,w:width*TILE,h:rise*TILE,z:1});
      groundProp(x+width+2,'lamp');groundProp(x+3,'rubble');
      this.platform(x-4,this.groundY[x]-3,4,'wood');
    }
    for(const x of [194,226,259,292,326])groundProp(x,'street');
    // Canyon: generous clearance, alternating shelves and a readable lower route.
    for(const x of [342,374,408,438]) {deck(x,8,3,'metal');groundProp(x+10,'bones');}
    for(const x of [336,362,398,430,452])groundProp(x,'boulders');
    groundProp(354,'pipe');groundProp(424,'pipe');
    // Fortress: cover silhouettes, low firing decks, then a flat boss arena.
    for(const x of [466,484,506,528,548]) {groundProp(x,'sandbagWall');groundProp(x+6,'rubble');}
    deck(480,7,3,'metal');deck(524,8,3,'metal');
    groundProp(462,'flag',{zone:3});groundProp(552,'flag',{zone:3});
    // Optional supply rooms have a through passage, never a dead end on the main path.
    this.secretBox(56,13,8,5,'sand');
    this.secretBox(250,13,8,5,'dirt');
    this.secretBox(400,14,8,5,'stone');
    this.waves = [
      {x:40,msg:'OUTPOST PATROL',list:[['soldier',3]]},
      {x:92,msg:'HOLD THE ROAD',list:[['soldier',3],['rusher',1]]},
      {x:138,msg:'DEPOT GUARD',list:[['soldier',2],['heavy',1],['drone',1]]},
      {x:196,msg:'VILLAGE DEFENCE',list:[['soldier2',3],['rusher',2]]},
      {x:250,msg:'ARMORED PATROL',list:[['soldier2',2],['heavy',2]]},
      {x:300,msg:'EVACUATION STREET',list:[['soldier2',3],['drone',1]]},
      {x:356,msg:'CANYON AMBUSH',list:[['soldier',2],['rusher',2]]},
      {x:412,msg:'TUNNEL GUARD',list:[['heavy',1],['soldier',2],['barrelman',1]]},
      {x:476,msg:'FORTRESS GATE',list:[['heavy',2],['soldier2',2]]},
      {x:530,msg:'FINAL PUSH',list:[['soldier2',3],['drone',1],['rusher',2]]},
    ].map(w=>({...w,lock:true,clear:'AREA CLEAR - GO!'}));
    const post=(t,tx,roof=false)=>this.spawns.push({t,tx,x:tx*TILE,roof});
    for(const x of [65,126,286,388,510])post('turret',x);
    for(const x of [184,212,278,312])post('sniper',x,true);
    post('emplacement',550);
    for(const x of [83,233,392,491])post('barrel',x);
    const supplies=[[16,'mg'],[34,'grenade'],[82,'health'],[120,'shotgun'],[158,'health'],
      [180,'ammo'],[228,'grenade'],[260,'flame'],[290,'health'],[334,'rocket'],[382,'ammo'],
      [426,'health'],[458,'shield'],[494,'laser'],[522,'grenade'],[550,'health']];
    for(const [x,item]of supplies)this.pickup(x,this.groundY[x]-1,'crate_'+item);
    for(const x of [28,50,88,116,154,192,224,264,294,324,368,396,432,454,488,518,546])
      this.captive(x,this.groundY[x]-1,{pts:200,item:x%3===0?'grenade':'ammo'});
    for(const [x,row,secret,item]of [[60,16,1,'shotgun'],[254,16,2,'mg'],[404,17,3,'rocket']])
      this.captive(x,row,{pts:1000,item,secret});
    // Rewards on the optional decks make the high route useful.
    for(const [x,width,rise]of [[22,6,3],[72,7,3],[112,7,3],[176,12,5],[235,12,5],[342,8,3],[438,8,3],[524,8,3]])
      for(let i=2;i<width-1;i+=2)this.pickup(x+i,this.groundY[x]-rise-1,'medal');
    this.checkpoints=[14,80,166,234,330,394,460,550].map((tx,i)=>({id:i,x:tx*TILE,y:this.groundY[tx]*TILE}));
    this.vehicleX=160*TILE;this.vehicleY=this.groundY[160]*TILE;
    this.bossX=570*TILE;this.bossTrigger=556*TILE;this.checkpointX=300*TILE;
    this.birds=Array.from({length:8},(_,i)=>({x:i*1200,y:50+(i%3)*16,sp:12,dir:1,f:0,off:i}));
    this.smokes=Array.from({length:12},(_,i)=>({x:i*800,y:180,t:i/2,sp:-6,sc:0.7}));
  },

  /* --- helpers --- */
  zoneOf(x) { return ZONES[this.zoneAt ? this.zoneAt[clamp(x, 0, this.W - 1) | 0] : 0] || ZONES[0]; },
  prop(x, y, kind, opts) { this.props.push(Object.assign({ x: x * TILE, y: y * TILE, kind, z: this.zoneAt ? this.zoneAt[clamp(x, 0, this.W - 1) | 0] : 0 }, opts || {})); },
  platform(x, y, w, kind) { this.setT; for (let i = 0; i < w; i++) this.grid[y * this.W + x + i] = T_PLAT; this.props.push({ x: x * TILE, y: y * TILE, kind: '_plat', plat: true, h: w }); },
  ladder(x, y) { this.grid[y * this.W + x] = T_LADDER; },
  building(x, w, h, groundRow, style) {
    // solid block with interior, roof platform, balconies, windows
    const W = this.W;
    const top = groundRow - h;
    for (let yy = top; yy < groundRow; yy++) for (let xx = x; xx < x + w; xx++) this.grid[yy * W + xx] = T_SOLID;
    // carve interior
    for (let yy = top + 2; yy < groundRow - 1; yy++) for (let xx = x + 2; xx < x + w - 2; xx++) this.grid[yy * W + xx] = T_EMPTY;
    // door on ground floor
    for (let yy = groundRow - 2; yy < groundRow; yy++) for (let xx = x + 4; xx < x + 7; xx++) this.grid[yy * W + xx] = T_EMPTY;
    // Street-level passage through both walls, with a continuous floor.
    for (let xx = x; xx < x + w; xx++) {
      for (let yy = groundRow - 3; yy < groundRow; yy++) this.grid[yy * W + xx] = T_EMPTY;
      for (let yy = groundRow; yy < this.H; yy++) this.grid[yy * W + xx] = T_SOLID;
      this.groundY[xx] = groundRow;
    }
    // roof
    for (let xx = x; xx < x + w; xx++) this.grid[top * W + xx] = T_PLAT;
    this.props.push({ x: x * TILE, y: top * TILE, kind: 'roof', w: w * TILE, z: this.zoneAt[clamp(x, 0, this.W - 1) | 0] });
    // interior floors (one-way platforms)
    for (let f = top + 3; f < groundRow - 2; f += 3) {
      for (let xx = x + 2; xx < x + w - 2; xx++) this.grid[f * W + xx] = T_PLAT;
      this.props.push({ x: (x + 2) * TILE, y: f * TILE, kind: '_plat', plat: true, h: (w - 4) * TILE });
    }
    // facade decorations
    for (let yy = top + 1; yy < groundRow - 1; yy++) {
      for (let xx = x + 2; xx < x + w - 2; xx++) {
        if (this.grid[yy * W + xx] === T_PLAT) continue;
        if (hash2(xx, yy) > 0.86) this.props.push({ x: xx * TILE, y: yy * TILE, kind: 'window', z: this.zoneAt[clamp(xx, 0, this.W - 1) | 0] });
      }
    }
    if (w > 12) this.props.push({ x: (x + 1) * TILE, y: (top + 4) * TILE, kind: 'balcony', z: this.zoneAt[clamp(x, 0, this.W - 1) | 0] });
    // ladder inside
    const lx = x + 2;
    for (let yy = top; yy < groundRow; yy++) this.grid[yy * W + lx] = T_LADDER;
    this.props.push({ x: lx * TILE, y: top * TILE, kind: 'ladder', h: (groundRow - top) * TILE, z: this.zoneAt[clamp(x, 0, this.W - 1) | 0] });
  },
  secretBox(x, y, w, h, mat) {
    // A hollow chamber buried in the terrain. Its 3-tile-tall mouth on the
    // left is plugged with destructible crates, so the only way in is to
    // blast your way through - the entrance is deliberately too tall to
    // simply walk over, so the player can never be stuck.
    const W = this.W;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.grid[yy * W + xx] = T_SOLID;
    for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x + 1; xx < x + w - 1; xx++) this.grid[yy * W + xx] = T_EMPTY;
    // carve a walkable tunnel from the left face into the chamber
    for (let yy = y + 1; yy < y + h - 1; yy++) for (let xx = x; xx < x + 2; xx++) this.grid[yy * W + xx] = T_EMPTY;
    // A room crossing the main route needs an exit on the far side too.
    for (let yy = y + 1; yy < y + h - 1; yy++) this.grid[yy * W + x + w - 1] = T_EMPTY;
    this.secrets.push({ x: x * TILE, y: y * TILE, w: w * TILE, h: h * TILE, found: false, mat });
    // plug the mouth with cover crates (2 wide x 3 tall)
    for (let r = 0; r < 3; r++) {
      for (let cc = 0; cc < 2; cc++) this.pickup(x + cc, y + 1 + r, 'crate_cover');
    }
  },
  captive(x, y, opts) {
    this.captives.push(Object.assign({ x: x * TILE + 2, y: (y + 1) * TILE - 22, freed: false, t: 0, anim: 0 }, opts || {}));
  },
  pickup(x, y, kind) {
    this.pickups.push({ kind, x: x * TILE + 1, y: (y + 1) * TILE - 14, t: 0, taken: false, crate: kind.indexOf('crate_') === 0 });
  },
  tileAt(x, y) {
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (tx < 0 || tx >= this.W || ty < 0) return T_SOLID;
    if (ty >= this.H) return T_EMPTY;
    return this.grid[ty * this.W + tx];
  },
  solidAt(x, y) { const t = this.tileAt(x, y); return t === T_SOLID || t === T_SPIKE; },
  platAt(x, y) { return this.tileAt(x, y) === T_PLAT; },
  groundYAt(x) { return this.groundY[clamp(Math.floor(x / TILE), 0, this.W - 1)] * TILE; },
  zoneAtPx(x) { return ZONES[this.zoneAt[clamp(Math.floor(x / TILE), 0, this.W - 1) | 0]] || ZONES[0]; },
  /** highest standable surface (platform top or solid surface) in a column, above maxRow */
  ledgeAt(tx, maxRow) {
    const W = this.W;
    const lim = maxRow === undefined ? this.H - 1 : maxRow;
    for (let ty = 2; ty <= lim; ty++) {
      const t = this.grid[ty * W + tx];
      if (t !== T_PLAT && t !== T_SOLID) continue;
      const above = ty > 0 ? this.grid[(ty - 1) * W + tx] : T_EMPTY;
      if (above === T_SOLID || above === T_PLAT) continue;
      return ty * TILE;
    }
    return null;
  },
};
function zoneOf(x) { return Level.zoneAtPx(x); }

/* ============================================================
   PARALLAX BACKGROUNDS
   ============================================================ */
const BG = {
  draw(c, camX, camY, t) {
    const z = Level.zoneAtPx(camX + VW / 2);
    const sky = c.createLinearGradient(0, 0, 0, VH);
    sky.addColorStop(0, z.sky[0]); sky.addColorStop(0.55, z.sky[1]); sky.addColorStop(1, z.sky[2]);
    c.fillStyle = sky; c.fillRect(0, 0, VW, VH);
    if (z.type === 'desert') this.sun(c, camX, camY, t, z);
    if (z.type === 'canyon') this.glowworms(c, camX, camY, t);
    if (z.type === 'arena') this.fireGlow(c, camX, camY, t, z);
    if (z.type === 'canyon') {
      this.canyonWalls(c, camX, camY, z, t);
    } else {
      // far range, mid range, near range (bases low enough to leave sky visible)
      this.mountains(c, camX, camY, z, 0.10, z.far, 118, 26, 46, 1.2);
      if (z.type === 'village') this.cityline(c, camX, camY, z, 0.18, z.far, 138, 46, t);
      if (z.type === 'arena') this.fortress(c, camX, camY, t, z);
      this.mountains(c, camX, camY, z, 0.22, z.mid, 168, 30, 34, 2.4);
      this.mountains(c, camX, camY, z, 0.40, z.near, 206, 22, 24, 3.6);
      this.groundBand(c, camX, camY, z);
    }
  },
  sun(c, camX, camY, t, z) {
    const x = VW * 0.72 - camX * 0.03, y = 44 - camY * 0.1;
    const g = c.createRadialGradient(x, y, 2, x, y, 70);
    g.addColorStop(0, 'rgba(255,246,200,0.95)');
    g.addColorStop(0.25, 'rgba(255,210,120,0.55)');
    g.addColorStop(1, 'rgba(255,180,90,0)');
    c.fillStyle = g; c.fillRect(x - 80, y - 80, 160, 160);
    c.fillStyle = 'rgba(255,248,210,0.9)';
    c.beginPath(); c.arc(x, y, 17, 0, TAU); c.fill();
  },
  mountains(c, camX, camY, z, par, col, base, amp, freq, depth) {
    c.fillStyle = col;
    const y0 = base - camY * par * 0.5;
    const bottom = VH + 40;
    c.beginPath(); c.moveTo(0, bottom);
    for (let sx = -20; sx <= VW + 20; sx += 6) {
      const wx = (camX * par + sx) / freq;
      let h = 0;
      h += Math.sin(wx) * amp * 0.5;
      h += Math.sin(wx * 2.3 + 1.7) * amp * 0.28;
      h += Math.sin(wx * 5.1 + 3.1) * amp * 0.14;
      h += (hash2(Math.floor(wx * 3), 7) - 0.5) * amp * 0.3;
      c.lineTo(sx, y0 - h);
    }
    c.lineTo(VW, bottom); c.closePath(); c.fill();
    // sunlit rim along the ridge
    c.save();
    c.globalAlpha = 0.16;
    c.fillStyle = '#ffffff';
    c.beginPath();
    for (let sx = -20; sx <= VW + 20; sx += 6) {
      const wx = (camX * par + sx) / freq;
      let h = 0;
      h += Math.sin(wx) * amp * 0.5;
      h += Math.sin(wx * 2.3 + 1.7) * amp * 0.28;
      h += Math.sin(wx * 5.1 + 3.1) * amp * 0.14;
      h += (hash2(Math.floor(wx * 3), 7) - 0.5) * amp * 0.3;
      if (sx === -20) c.moveTo(sx, y0 - h);
      else c.lineTo(sx, y0 - h);
    }
    for (let sx = VW + 20; sx >= -20; sx -= 6) {
      const wx = (camX * par + sx) / freq;
      let h = 0;
      h += Math.sin(wx) * amp * 0.5;
      h += Math.sin(wx * 2.3 + 1.7) * amp * 0.28;
      h += Math.sin(wx * 5.1 + 3.1) * amp * 0.14;
      h += (hash2(Math.floor(wx * 3), 7) - 0.5) * amp * 0.3;
      c.lineTo(sx, y0 - h + 2);
    }
    c.closePath(); c.fill();
    c.restore();
  },
  canyonWalls(c, camX, camY, z, t) {
    // back wall with strata
    c.fillStyle = '#1e1626';
    c.fillRect(0, 0, VW, VH);
    for (let band = 0; band < 7; band++) {
      c.fillStyle = band % 2 ? '#241a2e' : '#1a1222';
      c.fillRect(0, band * 40 - (camY * 0.25) % 40, VW, 20);
    }
    // distant rock columns (parallax 0.4)
    for (let i = 0; i < 26; i++) {
      const wx = i * 67 + 900;
      let x = wx - camX * 0.4;
      x = ((x % (VW + 400)) + (VW + 400)) % (VW + 400) - 100;
      const w = 26 + hash2(i, 3) * 34;
      const h = 60 + hash2(i, 9) * 150;
      c.fillStyle = '#2c2038';
      c.fillRect(x, 30 - camY * 0.2, w, h);
      c.fillStyle = '#191122';
      c.fillRect(x, 30 - camY * 0.2 + h - 10, w, 10);
    }
    // ceiling stalactites hugging the top of the frame
    c.fillStyle = '#241a30';
    for (let i = 0; i < 22; i++) {
      const wx = i * 37 + 400;
      let x = wx - camX * 0.92;
      x = ((x % (VW + 90)) + (VW + 90)) % (VW + 90) - 30;
      const len = 10 + hash2(i, 5) * 30;
      const w = 5 + hash2(i, 11) * 8;
      c.beginPath();
      c.moveTo(x - w, -10); c.lineTo(x + w, -10); c.lineTo(x, len);
      c.closePath(); c.fill();
    }
    // corridor side walls: fixed to the frame, jitter keyed to world position
    const w = 26;
    for (const side of [0, 1]) {
      const seg = Math.floor(camX / 24);
      c.fillStyle = side ? '#241a2c' : '#241a2c';
      c.beginPath();
      const base = side ? VW : 0;
      const dir = side ? -1 : 1;
      c.moveTo(base, 0);
      for (let i = 0; i <= 9; i++) {
        const yy = i / 9 * VH;
        const j = (hash2(seg * 9 + i, side * 31) - 0.5) * 14 + Math.sin(camX * 0.05 + i) * 3;
        c.lineTo(base + dir * (w + j), yy);
      }
      c.lineTo(base, VH); c.closePath(); c.fill();
      c.fillStyle = '#160f1c';
      c.beginPath();
      c.moveTo(base, 0);
      for (let i = 0; i <= 9; i++) {
        const yy = i / 9 * VH;
        const j = (hash2(seg * 9 + i, side * 31) - 0.5) * 14 + Math.sin(camX * 0.05 + i) * 3;
        c.lineTo(base + dir * (w + j - 9), yy);
      }
      c.lineTo(base, VH); c.closePath(); c.fill();
    }
  },
  cityline(c, camX, camY, z, par, col, base, amp, t) {
    for (let sx = -20; sx <= VW + 20; sx += 6) {
      const wx = (camX * par + sx);
      const i = Math.floor(wx / 26);
      const h = 18 + hash2(i, 5) * amp;
      const w = 22 + hash2(i, 9) * 12;
      c.fillStyle = col;
      c.fillRect(sx, base - h - camY * par * 0.4, w, h + 80);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(sx + w - 4, base - h - camY * par * 0.4, 4, h + 80);
      if (hash2(i, 13) > 0.7) { c.fillStyle = col; c.fillRect(sx + w * 0.4, base - h - 12 - camY * par * 0.4, 3, 12); }
    }
  },
  fortress(c, camX, camY, t, z) {
    const par = 0.3;
    const bx = -camX * par;
    c.fillStyle = '#2a0e12';
    for (let i = 0; i < 5; i++) {
      const x = bx + i * 300 - 100;
      c.fillRect(x, 40, 90, 200);
      for (let m = 0; m < 4; m++) c.fillRect(x - 6, 44 + m * 8, 102, 6);
      c.fillStyle = 'rgba(240,120,40,0.14)';
      c.fillRect(x + 10, 70, 10, 14); c.fillRect(x + 50, 110, 10, 14);
      c.fillStyle = '#2a0e12';
    }
    // gate
    c.fillStyle = '#1a070a';
    c.fillRect(bx + 120, 120, 120, 130);
    c.strokeStyle = '#3c1418'; c.lineWidth = 6;
    c.strokeRect(bx + 120, 120, 120, 130);
  },
  glowworms(c, camX, camY, t) {
    for (let i = 0; i < 26; i++) {
      const wx = (i * 137 + Math.sin(t * 0.4 + i) * 30);
      let x = (wx - camX * 0.4) % (VW + 60); if (x < 0) x += VW + 60;
      const y = 20 + hash2(i, 3) * 120 + Math.sin(t * 1.3 + i * 2) * 6 - camY * 0.3;
      const a = 0.35 + 0.35 * Math.sin(t * 2 + i);
      c.fillStyle = 'rgba(140,255,180,' + a.toFixed(2) + ')';
      c.fillRect(x | 0, y | 0, 2, 2);
    }
  },
  fireGlow(c, camX, camY, t, z) {
    const g = c.createLinearGradient(0, VH * 0.4, 0, VH);
    g.addColorStop(0, 'rgba(200,60,20,0)');
    g.addColorStop(1, 'rgba(220,90,30,0.35)');
    c.fillStyle = g; c.fillRect(0, VH * 0.4, VW, VH * 0.6);
    for (let i = 0; i < 6; i++) {
      const x = ((i * 160 - camX * 0.22) % (VW + 200) + VW + 200) % (VW + 200) - 100;
      const a = 0.10 + 0.06 * Math.sin(t * 3 + i);
      c.fillStyle = 'rgba(255,160,60,' + a.toFixed(2) + ')';
      c.fillRect(x, 190, 120, 40);
    }
  },
  groundBand(c, camX, camY, z) {
    // distant plateau just behind the playable ground, for depth
    const gy = Level.groundYAt(camX + VW / 2);
    const y = Math.max(gy - 30, 150) - camY * 0.72;
    c.fillStyle = mix(z.near, '#1a1018', 0.35);
    c.beginPath();
    c.moveTo(0, VH);
    for (let sx = 0; sx <= VW + 10; sx += 10) {
      const wx = (camX * 0.72 + sx) / 60;
      c.lineTo(sx, y - Math.sin(wx) * 5 - hash2(Math.floor(wx), 3) * 8);
    }
    c.lineTo(VW, VH); c.closePath(); c.fill();
  },
  /* foreground haze drawn after entities */
  fore(c, camX, camY, t) {
    const z = Level.zoneAtPx(camX + VW / 2);
    if (z.type === 'canyon') {
      // dark rock frame at the very front of the corridor
      c.save();
      c.fillStyle = '#100a18';
      for (const side of [0, 1]) {
        const x = side ? VW - 14 : -2;
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 16, 0);
        for (let i = 0; i <= 8; i++) {
          c.lineTo(x + (side ? 16 - hash2(i + Math.floor(camX * 0.4) * 3, 2) * 10 : hash2(i + Math.floor(camX * 0.4) * 3, 2) * 10), i / 8 * VH);
        }
        c.lineTo(x, VH); c.closePath(); c.fill();
      }
      c.restore();
      return;
    }
    const col = z.type === 'arena' ? '#140608' : '#2a1a12';
    const gy = Level.groundYAt(camX + VW / 2) - camY;
    // foreground silhouette band at the very bottom of the screen
    c.save();
    c.globalAlpha = 0.9;
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(0, VH);
    for (let sx = 0; sx <= VW + 8; sx += 8) {
      const wx = (camX * 1.3 + sx) / 46;
      const h = Math.sin(wx) * 3 + Math.sin(wx * 2.7) * 2 + hash2(Math.floor(wx), 21) * 5;
      c.lineTo(sx, Math.max(gy + 14, VH - 26) + h);
    }
    c.lineTo(VW, VH); c.closePath(); c.fill();
    // swaying grass / rubble tufts sitting on that band
    for (let sx = -10; sx <= VW + 10; sx += 11) {
      const wx = Math.floor((camX * 1.3 + sx) / 46);
      if (hash2(wx, 21) < 0.55) continue;
      const bx = sx, by = Math.max(gy + 14, VH - 26) + Math.sin(wx) * 3;
      const sway = Math.sin(t * 2.2 + wx) * 2;
      c.beginPath();
      c.moveTo(bx - 4, by + 4);
      c.quadraticCurveTo(bx - 2 + sway, by - 10, bx + sway, by - 15);
      c.quadraticCurveTo(bx + 1 + sway, by - 9, bx + 4, by + 4);
      c.closePath(); c.fill();
    }
    c.restore();
  },
};
