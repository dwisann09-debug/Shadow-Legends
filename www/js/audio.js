window.MoopyGame = window.MoopyGame || {};

window.MoopyGame.Sound = {
  ctx: null,
  muted: false,

  // BGM state
  _bgmNodes: [],
  _bgmRunning: false,
  _bgmScheduledUntil: 0,
  _bgmTick: 0,

  init: function () {
    if (!this.ctx) {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  },

  // ── BGM: 16-bit gothic battle loop ──────────────────────────────────────
  // Synthesized entirely with Web Audio API oscillators -- no external file.
  startBGM: function () {
    if (this._bgmRunning) return;
    this.init();
    if (!this.ctx) return;
    this._bgmRunning = true;
    this._bgmScheduledUntil = this.ctx.currentTime;
    this._scheduleBGM();
  },

  stopBGM: function () {
    this._bgmRunning = false;
    for (var i = 0; i < this._bgmNodes.length; i++) {
      try { this._bgmNodes[i].stop(); } catch(e) {}
    }
    this._bgmNodes = [];
  },

  _playNote: function (freq, startTime, duration, type, vol, masterGain) {
    if (!this.ctx) return;
    var osc  = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
    gain.gain.setValueAtTime(vol, startTime + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.02);
    this._bgmNodes.push(osc);
  },

  _scheduleBar: function (barStart, masterGain) {
    var B  = 0.22; // beat length in seconds
    // 16-bit gothic battle melody (8 notes per bar)
    var melody = [
      // [freq, beat offset, duration, type, vol]
      [220, 0,    B*0.9, "square",   0.08],
      [261, 1,    B*0.9, "square",   0.07],
      [293, 2,    B*0.9, "square",   0.08],
      [261, 3,    B*0.4, "square",   0.06],
      [220, 3.5,  B*0.4, "square",   0.07],
      [196, 4,    B*1.8, "square",   0.09],
      [220, 6,    B*0.9, "square",   0.07],
      [246, 7,    B*0.9, "square",   0.08]
    ];
    // Bass line
    var bass = [
      [55,  0,    B*1.8, "sawtooth", 0.06],
      [65,  2,    B*1.8, "sawtooth", 0.06],
      [49,  4,    B*1.8, "sawtooth", 0.06],
      [55,  6,    B*1.8, "sawtooth", 0.06]
    ];
    // High arp (attack pulse)
    var arp = [
      [440, 0,   B*0.35, "square",  0.04],
      [523, 1,   B*0.35, "square",  0.04],
      [587, 2,   B*0.35, "square",  0.04],
      [440, 4,   B*0.35, "square",  0.04],
      [392, 6,   B*0.35, "square",  0.04],
      [440, 7,   B*0.35, "square",  0.04]
    ];
    var all = melody.concat(bass).concat(arp);
    for (var i = 0; i < all.length; i++) {
      var n = all[i];
      this._playNote(n[0], barStart + n[1] * B, n[2], n[3], n[4], masterGain);
    }
    return barStart + 8 * B; // bar duration
  },

  _scheduleBGM: function () {
    var self = this;
    if (!this._bgmRunning) return;
    this.init();
    if (!this.ctx) return;

    var now = this.ctx.currentTime;
    // Schedule 2 bars ahead, loop
    while (this._bgmScheduledUntil < now + 2.0) {
      var master = this.ctx.createGain();
      master.gain.setValueAtTime(this.muted ? 0 : 0.35, this._bgmScheduledUntil);
      master.connect(this.ctx.destination);
      this._bgmScheduledUntil = this._scheduleBar(this._bgmScheduledUntil, master);
    }

    setTimeout(function () { self._scheduleBGM(); }, 800);
  },

  updateBGMVolume: function () {
    // Volume is read live via muted flag in each new bar
  },

  play: function (type) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    var now = this.ctx.currentTime;
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    if (type === "jump") {
      osc.type = "square";
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.11);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === "doublejump") {
      osc.type = "square";
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "punch") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(58, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "kick") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(175, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.11);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.11);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === "claw") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(720, now);
      osc.frequency.exponentialRampToValueAtTime(115, now + 0.15);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "zap") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(980, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);
      gain.gain.setValueAtTime(0.13, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === "thunder") {
      osc.type = "square";
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.42);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.42);
      osc.start(now);
      osc.stop(now + 0.42);
    } else if (type === "dash") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.09);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (type === "transform") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.linearRampToValueAtTime(560, now + 0.22);
      osc.frequency.linearRampToValueAtTime(340, now + 0.45);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === "roar") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.linearRampToValueAtTime(85, now + 0.38);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.38);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === "laser") {
      osc.type = "square";
      osc.frequency.setValueAtTime(920, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.55);
      gain.gain.setValueAtTime(0.17, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.55);
      osc.start(now);
      osc.stop(now + 0.55);
    } else if (type === "cooldown") {
      osc.type = "square";
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.setValueAtTime(95, now + 0.04);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === "gameover") {
      // Descending dramatic chord
      var freqs = [440, 370, 311, 261];
      for (var fi = 0; fi < freqs.length; fi++) {
        var o2 = this.ctx.createOscillator();
        var g2 = this.ctx.createGain();
        o2.type = "square";
        o2.frequency.setValueAtTime(freqs[fi], now + fi * 0.18);
        g2.gain.setValueAtTime(0.12, now + fi * 0.18);
        g2.gain.linearRampToValueAtTime(0.001, now + fi * 0.18 + 0.55);
        o2.connect(g2); g2.connect(this.ctx.destination);
        o2.start(now + fi * 0.18);
        o2.stop(now + fi * 0.18 + 0.6);
      }
      // Return early since we used separate oscs above
      osc.start(now); osc.stop(now + 0.001);
      return;
    } else if (type === "win") {
      // Ascending victory fanfare
      var wfreqs = [261, 329, 392, 523, 440, 523];
      var wdurs  = [0.12, 0.12, 0.12, 0.25, 0.12, 0.35];
      var wt = now;
      for (var wi = 0; wi < wfreqs.length; wi++) {
        var wo = this.ctx.createOscillator();
        var wg = this.ctx.createGain();
        wo.type = "square";
        wo.frequency.setValueAtTime(wfreqs[wi], wt);
        wg.gain.setValueAtTime(0.13, wt);
        wg.gain.linearRampToValueAtTime(0.001, wt + wdurs[wi]);
        wo.connect(wg); wg.connect(this.ctx.destination);
        wo.start(wt);
        wo.stop(wt + wdurs[wi] + 0.02);
        wt += wdurs[wi] * 0.85;
      }
      osc.start(now); osc.stop(now + 0.001);
      return;
    }

    osc.start(now);
  }
};
