/**
 * Web Audio & Audio Asset Ringtone Engine for Scam Dojo.
 * Plays the official ringtone.mp3 repeatedly on incoming redial,
 * with automatic Web Audio API synthesizer fallback, vibration API,
 * disconnect tones, and mobile power-down sounds.
 */

class RingtoneEngine {
  private ctx: AudioContext | null = null;
  private isPlaying = false;
  private ringInterval: any = null;
  private activeOscillators: OscillatorNode[] = [];
  private isMuted = false;
  private audioElement: HTMLAudioElement | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audioElement) {
      this.audioElement.muted = muted;
    }
    if (muted) {
      this.stopTone();
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Play realistic incoming phone ringtone repeatedly.
   * Plays /assets/audio/ringtone.mp3 in loop, with Web Audio synthesizer fallback.
   * Speed multiplier increases urgency as redial attempts rise!
   */
  public startIncomingRingtone(speedMultiplier: number = 1.0) {
    this.stop();
    this.isPlaying = true;

    // Trigger haptic vibration pulse if supported on mobile
    this.pulseVibration();

    // 1. Attempt to play ringtone.mp3 file
    if (typeof window !== "undefined" && typeof Audio !== "undefined") {
      try {
        if (!this.audioElement) {
          this.audioElement = new Audio("/assets/audio/ringtone.mp3");
        }
        this.audioElement.loop = true;
        this.audioElement.playbackRate = Math.min(2.0, Math.max(0.8, speedMultiplier));
        this.audioElement.muted = this.isMuted;
        this.audioElement.currentTime = 0;

        const playPromise = this.audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // mp3 is playing successfully!
            })
            .catch(() => {
              // Autoplay policy or asset issue: fallback to synthesized Web Audio
              this.startSynthesizedRingtone(speedMultiplier);
            });
          return;
        }
      } catch {
        // Fallback to Web Audio synthesis
      }
    }

    // 2. Synthesizer fallback
    this.startSynthesizedRingtone(speedMultiplier);
  }

  private pulseVibration() {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 600, 1000]);
      } catch {}
    }
  }

  private startSynthesizedRingtone(speedMultiplier: number = 1.0) {
    const playCycle = () => {
      if (!this.isPlaying || this.isMuted) return;

      const ctx = this.getAudioContext();
      if (!ctx) return;

      this.pulseVibration();

      const now = ctx.currentTime;
      const baseFreq1 = 853;
      const baseFreq2 = 960;

      // Pulse 1
      this.createBeep(now, 0.45 / speedMultiplier, baseFreq1, baseFreq2, 0.25);
      // Pulse 2
      this.createBeep(now + 0.55 / speedMultiplier, 0.45 / speedMultiplier, baseFreq1 * 1.15, baseFreq2 * 1.15, 0.28);
      // Pulse 3
      this.createBeep(now + 1.1 / speedMultiplier, 0.6 / speedMultiplier, baseFreq1, baseFreq2, 0.3);
    };

    playCycle();
    const intervalMs = Math.max(1800, 3000 / speedMultiplier);
    this.ringInterval = setInterval(playCycle, intervalMs);
  }

  private createBeep(
    startTime: number,
    duration: number,
    freq1: number,
    freq2: number,
    gainLevel: number
  ) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(freq1, startTime);
      osc2.frequency.setValueAtTime(freq2, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(gainLevel, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(startTime);
      osc2.start(startTime);

      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);

      this.activeOscillators.push(osc1, osc2);

      osc1.onended = () => {
        this.activeOscillators = this.activeOscillators.filter((o) => o !== osc1 && o !== osc2);
      };
    } catch {}
  }

  private stopTone() {
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
  }

  /**
   * Stop ringtone and vibration immediately
   */
  public stop() {
    this.isPlaying = false;
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {}
    }
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
    this.stopTone();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }

  /**
   * Play mobile device shutdown chime (fading pitch down)
   */
  public playPowerDownSound() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.8);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.9);
    } catch {}
  }

  /**
   * Play radio static / network cutoff sound for Airplane Mode
   */
  public playAirplaneModeSound() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const bufferSize = ctx.sampleRate * 0.3;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      whiteNoise.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start(now);
      whiteNoise.stop(now + 0.35);
    } catch {}
  }

  /**
   * Play busy / disconnected tone (standard telecom 425Hz beeps)
   */
  public playDisconnectTone() {
    this.stop();
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.4, 0.8].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(425, now + offset);

        gain.gain.setValueAtTime(0.18, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.26);
      });
    } catch {}
  }
}

export const ringtoneEngine = new RingtoneEngine();
