/* ============================================================
   05 - AUDIO: 100% synthesized SFX + music
   ============================================================ */
const Audio_ = {
  ctx: null, master: null, sfxBus: null, musBus: null, noise: null,
  muted: false, ready: false, track: null, nextStep: 0, step: 0, bpm: 148,
  playing: false,

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 20; comp.ratio.value = 8;
    comp.attack.value = 0.003; comp.release.value = 0.22;
    this.master = ctx.createGain(); this.master.gain.value = 0.85;
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9;
    this.musBus = ctx.createGain(); this.musBus.gain.value = 0.42;
    this.sfxBus.connect(comp); this.musBus.connect(comp);
    comp.connect(this.master); this.master.connect(ctx.destination);
    // noise buffer
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.ready = true;
  },
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.02);
  },
  now() { return this.ctx ? this.ctx.currentTime : 0; },

  /* --- low level helpers --- */
  env(node, t, a, d, peak, sus, rel) {
    const g = node.gain;
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + a);
    if (sus !== undefined) {
      g.exponentialRampToValueAtTime(Math.max(0.0001, sus), t + a + d);
      g.exponentialRampToValueAtTime(0.0001, t + a + d + rel);
    } else {
      g.exponentialRampToValueAtTime(0.0001, t + a + d);
    }
  },
  osc(type, f0, f1, t, dur, vol, bus, detune) {
    if (!this.ready) return;
    if (!isFinite(t) || !isFinite(f0) || !isFinite(vol)) return;
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    if (detune) o.detune.value = detune;
    this.env(g, t, 0.004, dur, vol);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t); o.stop(t + dur + 0.05);
    return { o, g };
  },
  nz(t, dur, vol, type, f0, f1, q, bus) {
    if (bus === undefined && q && typeof q !== 'number') { bus = q; q = 1; }
    if (!this.ready) return;
    if (!isFinite(t) || !isFinite(f0) || !isFinite(vol) || !isFinite(dur)) return;
    if (!this.ready) return;
    const ctx = this.ctx, s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = this.noise; s.loop = true;
    s.playbackRate.value = 0.8 + Math.random() * 0.5;
    f.type = type || 'lowpass';
    f.frequency.setValueAtTime(f0, t);
    if (f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    f.Q.value = q || 1;
    this.env(g, t, 0.003, dur, vol);
    s.connect(f); f.connect(g); g.connect(bus || this.sfxBus);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return { s, g, f };
  },

  /* --- game sound effects --- */
  play(name, opt) {
    if (!this.ready || this.muted) return;
    const t = this.now() + 0.001;
    const v = (opt && opt.v !== undefined) ? opt.v : 1;
    const p = (opt && opt.pitch !== undefined) ? opt.pitch : 1;
    switch (name) {
      case 'pistol':
        this.osc('square', 900 * p, 180 * p, t, 0.09, 0.30 * v);
        this.osc('sine', 300 * p, 90 * p, t, 0.10, 0.22 * v);
        this.nz(t, 0.05, 0.28 * v, 'highpass', 2600, 900);
        break;
      case 'mg':
        this.osc('square', 1300 * p, 320 * p, t, 0.05, 0.20 * v);
        this.nz(t, 0.035, 0.22 * v, 'highpass', 3400, 1400);
        break;
      case 'shotgun':
        this.nz(t, 0.26, 0.42 * v, 'lowpass', 3600, 260, 1.2);
        this.osc('triangle', 260 * p, 60 * p, t, 0.22, 0.30 * v);
        break;
      case 'rocket':
        this.nz(t, 0.5, 0.24 * v, 'bandpass', 900, 200, 1.4);
        this.osc('sawtooth', 320 * p, 70 * p, t, 0.45, 0.24 * v);
        this.osc('sine', 140, 40, t, 0.5, 0.20 * v);
        break;
      case 'laser':
        this.osc('sawtooth', 420 * p, 2400 * p, t, 0.16, 0.16 * v);
        this.osc('sine', 900 * p, 3600 * p, t + 0.02, 0.14, 0.12 * v);
        this.osc('sine', 1800, 600, t + 0.05, 0.12, 0.10 * v);
        break;
      case 'flame':
        this.nz(t, 0.16, 0.18 * v, 'bandpass', 700 + Math.random() * 500, 400, 0.8);
        break;
      case 'ebolt':
        this.osc('square', 1800 * p, 300 * p, t, 0.12, 0.20 * v);
        this.nz(t, 0.10, 0.14 * v, 'highpass', 4200, 1800);
        break;
      case 'cannon':
        this.osc('sawtooth', 200, 40, t, 0.42, 0.34 * v);
        this.nz(t, 0.4, 0.36 * v, 'lowpass', 2200, 180, 1.1);
        this.osc('sine', 90, 32, t, 0.5, 0.28 * v);
        break;
      case 'mgheavy':
        this.osc('square', 620 * p, 200 * p, t, 0.07, 0.24 * v);
        this.nz(t, 0.05, 0.24 * v, 'bandpass', 1800, 700, 1.2);
        break;
      case 'explode': {
        const s = 0.7 + Math.random() * 0.5;
        this.nz(t, 0.55 * s, 0.5 * v, 'lowpass', 2800, 120, 0.9);
        this.osc('sine', 130 * p, 28, t, 0.5 * s, 0.42 * v);
        this.osc('triangle', 320, 60, t, 0.22, 0.2 * v);
        this.nz(t + 0.05, 0.7 * s, 0.16 * v, 'lowpass', 900, 200);
        break;
      }
      case 'explodeBig':
        this.nz(t, 1.1, 0.55 * v, 'lowpass', 3400, 80, 0.8);
        this.osc('sine', 110, 22, t, 1.0, 0.5 * v);
        this.osc('sawtooth', 240, 40, t, 0.5, 0.2 * v);
        this.nz(t + 0.12, 1.2, 0.2 * v, 'lowpass', 1200, 150);
        break;
      case 'hit':
        this.nz(t, 0.10, 0.3 * v, 'lowpass', 2200, 300);
        this.osc('square', 420 * p, 120, t, 0.09, 0.18 * v);
        break;
      case 'hitArmor':
        this.osc('square', 900 * p, 500 * p, t, 0.07, 0.16 * v);
        this.nz(t, 0.07, 0.2 * v, 'bandpass', 3000, 1500, 3);
        break;
      case 'clank':
        this.osc('square', 1500 * p, 400, t, 0.16, 0.14 * v);
        this.nz(t, 0.2, 0.18 * v, 'highpass', 2200, 900);
        break;
      case 'hurt':
        this.osc('sawtooth', 340, 120, t, 0.26, 0.24 * v);
        this.osc('square', 200, 90, t, 0.2, 0.12 * v);
        this.nz(t, 0.14, 0.14 * v, 'lowpass', 1400, 400);
        break;
      case 'playerDie':
        for (let i = 0; i < 5; i++) {
          const tt = t + i * 0.11;
          this.osc('sawtooth', 500 - i * 60, 140 - i * 20, tt, 0.16, 0.22);
          this.osc('square', 240 - i * 30, 70, tt, 0.14, 0.12);
        }
        this.nz(t, 0.8, 0.16, 'lowpass', 1200, 200);
        break;
      case 'grunt': {
        const f = 190 + Math.random() * 130;
        this.osc('sawtooth', f, f * 0.6, t, 0.13, 0.16 * v);
        this.osc('square', f * 1.5, f, t, 0.1, 0.07 * v);
        this.nz(t, 0.1, 0.08 * v, 'bandpass', 900, 500, 2);
        break;
      }
      case 'enemyDie': {
        this.osc('sawtooth', 420, 90, t, 0.34, 0.2 * v);
        this.osc('square', 260, 60, t + 0.03, 0.3, 0.12 * v);
        this.nz(t, 0.2, 0.12 * v, 'lowpass', 1800, 400);
        break;
      }
      case 'scream':
        this.osc('sawtooth', 300, 1400, t, 0.45, 0.16 * v);
        this.osc('square', 450, 1800, t, 0.4, 0.08 * v);
        this.nz(t, 0.45, 0.1 * v, 'bandpass', 1800, 3000, 2);
        break;
      case 'bossRoar':
        this.osc('sawtooth', 70, 40, t, 1.6, 0.4 * v);
        this.osc('square', 45, 30, t, 1.7, 0.26 * v);
        this.osc('sawtooth', 140, 80, t, 1.4, 0.2 * v);
        this.nz(t, 1.6, 0.3 * v, 'lowpass', 700, 160, 1.2);
        break;
      case 'jump': this.osc('square', 300 * p, 780 * p, t, 0.12, 0.16 * v); break;
      case 'land': this.nz(t, 0.1, 0.16 * v, 'lowpass', 900, 200); this.osc('sine', 160, 60, t, 0.1, 0.14 * v); break;
      case 'step': this.nz(t, 0.045, 0.09 * v, 'bandpass', 700 + Math.random() * 400, 300, 1.4); break;
      case 'pickup':
        this.osc('square', 660, 660, t, 0.07, 0.2);
        this.osc('square', 990, 990, t + 0.06, 0.09, 0.2);
        this.osc('square', 1320, 1320, t + 0.12, 0.12, 0.18);
        break;
      case 'coin':
        this.osc('square', 1180, 1180, t, 0.05, 0.14);
        this.osc('square', 1760, 1760, t + 0.045, 0.1, 0.12);
        break;
      case 'weaponGet':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.osc('square', f, f, t + i * 0.05, 0.1, 0.18));
        this.nz(t, 0.3, 0.08, 'highpass', 3000, 2000);
        break;
      case 'heal':
        [440, 550, 660, 880].forEach((f, i) => this.osc('triangle', f, f, t + i * 0.06, 0.16, 0.16));
        break;
      case 'shield':
        this.osc('sine', 300, 1200, t, 0.4, 0.16);
        this.osc('triangle', 600, 2400, t, 0.4, 0.1);
        break;
      case 'knife':
        this.nz(t, 0.1, 0.2 * v, 'highpass', 4200, 2200, 1.5);
        this.osc('square', 1200, 2600, t, 0.07, 0.1 * v);
        break;
      case 'thrown': this.osc('square', 600, 300, t, 0.09, 0.12); break;
      case 'bounce': this.osc('square', 500 * p, 240 * p, t, 0.05, 0.12); break;
      case 'beep': this.osc('square', 880, 880, t, 0.06, 0.16); break;
      case 'blip': this.osc('square', 620, 900, t, 0.05, 0.14); break;
      case 'confirm':
        this.osc('square', 660, 660, t, 0.07, 0.18);
        this.osc('square', 990, 990, t + 0.07, 0.14, 0.18);
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) { this.osc('square', 740, 740, t + i * 0.18, 0.1, 0.16); this.osc('square', 560, 560, t + i * 0.18 + 0.09, 0.1, 0.16); }
        break;
      case 'lock':
        this.osc('square', 1200, 300, t, 0.3, 0.18);
        this.nz(t, 0.3, 0.1, 'bandpass', 2000, 400, 2);
        break;
      case 'unlock':
        this.osc('square', 300, 1400, t, 0.3, 0.18);
        break;
      case 'tied':
        this.osc('sawtooth', 200, 400, t, 0.3, 0.14);
        this.osc('square', 300, 500, t, 0.26, 0.08);
        break;
      case 'rescue':
        [523, 659, 784, 1046].forEach((f, i) => this.osc('square', f, f, t + i * 0.07, 0.14, 0.18));
        break;
      case 'siren':
        this.osc('sawtooth', 700, 1400, t, 0.5, 0.12);
        this.osc('sawtooth', 1400, 700, t + 0.5, 0.5, 0.12);
        break;
      case 'engine':
        this.osc('sawtooth', 90, 70, t, 0.6, 0.12);
        this.nz(t, 0.6, 0.1, 'lowpass', 600, 200);
        break;
      case 'victory':
        [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.osc('square', f, f, t + i * 0.11, 0.22, 0.2));
        break;
      case 'gameOver':
        [440, 415, 392, 349, 262].forEach((f, i) => this.osc('sawtooth', f, f, t + i * 0.22, 0.3, 0.2));
        break;
      case 'levelClear':
        [523, 659, 784, 1046, 1318, 1046, 1318, 1568].forEach((f, i) => { this.osc('square', f, f, t + i * 0.13, 0.26, 0.2); this.osc('triangle', f / 2, f / 2, t + i * 0.13, 0.26, 0.12); });
        break;
    }
  },

  /* --- music sequencer --- */
  TRACKS: {
    action: {
      bpm: 150, swing: 0.06,
      bass: [57, 0, 57, 0, 57, 0, 0, 57, 53, 0, 53, 0, 53, 0, 0, 53, 48, 0, 48, 0, 48, 0, 0, 48, 55, 0, 55, 0, 55, 0, 0, 55],
      lead: [69, 72, 76, 72, 69, -1, 72, 76, 81, 76, 72, -1, 69, 72, 76, 79, 76, 72, 69, 67, 69, -1, 64, 67, 71, 74, 71, 67, 64, -1, 61, 64],
      kick: [1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0],
      leadWave: 'square', bassWave: 'sawtooth', bassVol: 0.16, leadVol: 0.10, drumVol: 0.3,
    },
    boss: {
      bpm: 172, swing: 0,
      bass: [45, 45, 45, 45, 45, 45, 45, 45, 43, 43, 43, 43, 43, 43, 43, 43, 41, 41, 41, 41, 41, 41, 41, 41, 40, 40, 40, 40, 40, 40, 40, 40],
      lead: [81, 84, 88, 84, 81, 88, 84, 81, 79, 83, 86, 83, 79, 86, 83, 79, 77, 81, 84, 81, 77, 84, 81, 77, 76, 79, 83, 79, 76, 83, 79, 76],
      kick: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0],
      hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      leadWave: 'sawtooth', bassWave: 'sawtooth', bassVol: 0.18, leadVol: 0.09, drumVol: 0.34,
    },
    title: {
      bpm: 128, swing: 0.1,
      bass: [40, 0, 0, 0, 47, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0, 40, 0, 0, 0, 47, 0, 0, 0, 43, 0, 0, 0, 45, 0, 0, 0],
      lead: [76, 0, 79, 0, 83, 0, 79, 0, 76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 74, 0, 76, 0, 79, 0, 83, 0, 88, 0, 86, 0, 83, 0],
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
      leadWave: 'triangle', bassWave: 'sine', bassVol: 0.16, leadVol: 0.11, drumVol: 0.2,
    },
  },
  noteFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); },
  playMusic(name) {
    if (this.track === name) return;
    this.track = name;
    this.step = 0;
    this.nextStep = this.ready ? this.now() + 0.06 : 0;
    this.bpm = this.TRACKS[name] ? this.TRACKS[name].bpm : 150;
    this.playing = !!name;
  },
  stopMusic() { this.playing = false; this.track = null; },
  update() {
    if (!this.ready || !this.playing || this.muted) return;
    const T = this.TRACKS[this.track];
    if (!T) return;
    const ctx = this.ctx;
    const spb = 60 / this.bpm / 4;      // 16th notes
    const horizon = ctx.currentTime + 0.25;
    if (this.nextStep < ctx.currentTime) this.nextStep = ctx.currentTime + 0.02;
    let guard = 0;
    while (this.nextStep < horizon && guard++ < 40) {
      this.scheduleStep(T, this.step, this.nextStep, spb);
      this.step = (this.step + 1) % 32;
      const sw = (this.step % 2 === 1) ? spb * (T.swing || 0) : -spb * (T.swing || 0);
      this.nextStep += spb + sw;
    }
  },
  scheduleStep(T, s, t, spb) {
    const i = s % 16;
    const bus = this.musBus;
    // kick
    if (T.kick[i]) {
      this.osc('sine', 150, 42, t, 0.14, T.drumVol, bus);
      this.nz(t, 0.03, T.drumVol * 0.5, 'lowpass', 1200, 300, bus);
    }
    if (T.snare[i]) {
      this.nz(t, 0.13, T.drumVol * 0.75, 'highpass', 1400, 900, bus);
      this.osc('triangle', 220, 160, t, 0.09, T.drumVol * 0.35, bus);
    }
    if (T.hat[i]) {
      this.nz(t, 0.035, T.drumVol * 0.28, 'highpass', 8000, 6000, bus);
    }
    const b = T.bass[i];
    if (b) {
      const f = this.noteFreq(b);
      const o = this.osc(T.bassWave, f, f, t, spb * 1.7, T.bassVol, bus);
      if (o) { const fl = this.ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 900; fl.Q.value = 4; o.g.disconnect(); o.g.connect(fl); fl.connect(bus); }
    }
    const l = T.lead[i];
    if (l) {
      const f = this.noteFreq(l);
      this.osc(T.leadWave, f, f, t, spb * 1.4, T.leadVol, bus, 4);
      this.osc(T.leadWave, f * 1.005, f * 1.005, t, spb * 1.4, T.leadVol * 0.5, bus, -6);
    }
  },
};
const SFX = (n, o) => Audio_.play(n, o);
