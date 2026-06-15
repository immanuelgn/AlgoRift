export class GameSound {
  enabled: boolean;
  private context: AudioContext | null = null;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  jump() {
    this.tone(250, 420, 0.1, "square", 0.035);
  }

  chip() {
    this.tone(650, 880, 0.08, "square", 0.028);
  }

  terminal() {
    this.tone(180, 520, 0.16, "sawtooth", 0.025);
  }

  hit() {
    this.tone(150, 70, 0.18, "square", 0.04);
  }

  stomp() {
    this.tone(190, 280, 0.08, "square", 0.04);
  }

  transition() {
    this.tone(330, 740, 0.25, "triangle", 0.035);
  }

  laser() {
    if (!this.enabled) return;
    const context = this.getContext();
    if (!context) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const filter = context.createBiquadFilter();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(125, now);
    oscillator.frequency.exponentialRampToValueAtTime(62, now + 0.24);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1_900, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.24);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.29);
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    type: OscillatorType,
    volume: number,
  ) {
    if (!this.enabled) return;
    const context = this.getContext();
    if (!context) return;

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  private getContext() {
    if (!this.context) {
      const Context =
        window.AudioContext ||
        (
          window as typeof window & {
            webkitAudioContext?: typeof AudioContext;
          }
        ).webkitAudioContext;
      if (!Context) return null;
      this.context = new Context();
    }
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
    return this.context;
  }
}
