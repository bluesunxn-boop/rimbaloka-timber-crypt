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
}

export const sfx = new SoundEngine();
