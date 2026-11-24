class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlock() {
    this.ensureContext();
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  public slash() {
    this.playTone(320, 110, 0.09, 'sawtooth', 0.08);
    this.playTone(180, 70, 0.07, 'triangle', 0.06, 0.02);
  }

  public plok() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // 1. Crisp loud rubber slap noise snap
    const dur = 0.055;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.28));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1250, now);
    filter.Q.setValueAtTime(2.2, now);

    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.45, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start(now);

    // 2. Hollow rubber "PLOK!" pop transient
    this.playTone(620, 145, 0.075, 'triangle', 0.34);
    this.playTone(210, 68, 0.065, 'sine', 0.28);
  }

  public bow() {
    this.playTone(520, 220, 0.08, 'triangle', 0.08);
  }

  public magic() {
    this.playTone(620, 920, 0.12, 'sine', 0.07);
    this.playTone(440, 260, 0.14, 'triangle', 0.05, 0.03);
  }

  public chop() {
    this.playTone(170, 65, 0.08, 'square', 0.09);
  }

  public treeFall() {
    this.playTone(140, 42, 0.25, 'sawtooth', 0.11);
    this.playTone(95, 36, 0.3, 'triangle', 0.1, 0.08);
  }

  public hitEnemy() {
    this.playTone(250, 120, 0.06, 'square', 0.07);
  }

  public critHit() {
    this.playTone(540, 780, 0.08, 'square', 0.09);
    this.playTone(300, 130, 0.09, 'sawtooth', 0.07, 0.02);
  }

  public playerHurt() {
    this.playTone(160, 60, 0.16, 'sawtooth', 0.12);
  }

  public pickup(rare = false) {
    if (rare) {
      this.playTone(523, 659, 0.08, 'sine', 0.09);
      this.playTone(659, 987, 0.14, 'sine', 0.09, 0.07);
    } else {
      this.playTone(480, 720, 0.07, 'sine', 0.07);
    }
  }

  public craft() {
    this.playTone(330, 440, 0.08, 'triangle', 0.09);
    this.playTone(440, 660, 0.12, 'triangle', 0.09, 0.07);
    this.playTone(660, 880, 0.16, 'sine', 0.08, 0.15);
  }

  public levelUp() {
    this.playTone(440, 554, 0.1, 'square', 0.08, 0);
    this.playTone(554, 659, 0.1, 'square', 0.08, 0.09);
    this.playTone(659, 880, 0.22, 'square', 0.09, 0.18);
  }

  public bossRoar() {
    this.playTone(110, 45, 0.42, 'sawtooth', 0.14);
    this.playTone(85, 38, 0.45, 'square', 0.09, 0.05);
  }

  public victory() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((n, idx) => {
      this.playTone(n, n * 1.02, 0.18, 'triangle', 0.09, idx * 0.1);
    });
  }

  public synergyEpic() {
    const chord = [440, 554.37, 659.25, 880, 1108.73];
    chord.forEach((freq, i) => {
      this.playTone(freq * 0.96, freq, 0.24, 'triangle', 0.09, i * 0.055);
    });
    this.playTone(880, 1318.5, 0.38, 'sine', 0.11, 0.22);
  }

  public whistle() {
    this.playTone(1180, 1480, 0.11, 'sine', 0.12, 0);
    this.playTone(1480, 1220, 0.14, 'sine', 0.11, 0.09);
  }

  public thunder() {
    this.playTone(960, 220, 0.14, 'sawtooth', 0.12, 0);
    this.playTone(130, 48, 0.28, 'triangle', 0.13, 0.04);
  }

  public blackHole() {
    this.playTone(260, 55, 0.45, 'sine', 0.13, 0);
    this.playTone(180, 42, 0.48, 'triangle', 0.1, 0.05);
  }

  public ultimateRoar() {
    this.playTone(95, 36, 0.65, 'sawtooth', 0.16, 0);
    this.playTone(220, 440, 0.45, 'triangle', 0.11, 0.08);
    this.playTone(440, 880, 0.52, 'sine', 0.11, 0.22);
  }

  public woodClick() {
    this.playTone(540, 210, 0.028, 'triangle', 0.14, 0);
    this.playTone(190, 95, 0.032, 'sine', 0.12, 0.004);
  }

  public dash() {
    this.playTone(360, 140, 0.085, 'triangle', 0.11, 0);
    this.playTone(620, 280, 0.065, 'sine', 0.07, 0.015);
  }

  public gachaRoll() {
    const ticks = [320, 380, 460, 540, 640];
    ticks.forEach((f, idx) => {
      this.playTone(f, f * 1.08, 0.07, 'triangle', 0.08, idx * 0.07);
    });
  }

  public gachaReveal(
    rarity: 'common' | 'gold' | 'mythic' | 's1',
    style: 'wood' | 'swift' | 'sizzle' | 'whistle' | 'mystic' | 'durian' | 'divine',
    pitch = 1
  ) {
    const p = Math.max(0.65, Math.min(1.5, pitch));
    // Character voice signature
    if (style === 'wood') {
      this.playTone(220 * p, 140 * p, 0.11, 'square', 0.1, 0);
      this.playTone(340 * p, 480 * p, 0.14, 'triangle', 0.1, 0.09);
    } else if (style === 'swift') {
      this.playTone(420 * p, 840 * p, 0.12, 'triangle', 0.09, 0);
      this.playTone(620 * p, 980 * p, 0.14, 'sine', 0.09, 0.07);
    } else if (style === 'sizzle') {
      this.playTone(290 * p, 620 * p, 0.1, 'sawtooth', 0.08, 0);
      this.playTone(540 * p, 720 * p, 0.16, 'triangle', 0.1, 0.08);
    } else if (style === 'whistle') {
      this.playTone(920 * p, 1260 * p, 0.12, 'sine', 0.11, 0);
      this.playTone(1140 * p, 940 * p, 0.14, 'sine', 0.09, 0.1);
    } else if (style === 'mystic') {
      this.playTone(440 * p, 660 * p, 0.18, 'sine', 0.1, 0);
      this.playTone(660 * p, 990 * p, 0.22, 'triangle', 0.09, 0.08);
    } else if (style === 'durian') {
      this.playTone(165 * p, 75 * p, 0.18, 'sawtooth', 0.12, 0);
      this.playTone(480 * p, 760 * p, 0.16, 'triangle', 0.1, 0.11);
    } else {
      // Divine S1
      this.playTone(261.6 * p, 523.2 * p, 0.28, 'sawtooth', 0.11, 0);
      this.playTone(523.2 * p, 783.9 * p, 0.32, 'triangle', 0.12, 0.09);
      this.playTone(783.9 * p, 1046.5 * p, 0.42, 'sine', 0.13, 0.18);
    }

    // Rarity flourish overlay
    if (rarity === 'gold') {
      this.playTone(587, 880, 0.22, 'triangle', 0.09, 0.16);
    } else if (rarity === 'mythic') {
      this.playTone(523, 784, 0.22, 'sine', 0.1, 0.14);
      this.playTone(784, 1175, 0.28, 'triangle', 0.1, 0.22);
    } else if (rarity === 's1') {
      this.playTone(440, 880, 0.3, 'sawtooth', 0.1, 0.24);
      this.playTone(880, 1760, 0.4, 'sine', 0.12, 0.32);
    }
  }
}

export const sfx = new SoundEngine();
