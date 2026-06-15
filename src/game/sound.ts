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
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.13, now + 0.035);
    master.gain.exponentialRampToValueAtTime(0.085, now + 0.16);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    compressor.threshold.setValueAtTime(-22, now);
    compressor.knee.setValueAtTime(18, now);
    compressor.ratio.setValueAtTime(7, now);
    compressor.attack.setValueAtTime(0.003, now);
    compressor.release.setValueAtTime(0.08, now);
    master.connect(compressor);
    compressor.connect(context.destination);

    const sub = context.createOscillator();
    const subGain = context.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(72, now);
    sub.frequency.exponentialRampToValueAtTime(49, now + 0.31);
    subGain.gain.setValueAtTime(0.42, now);
    sub.connect(subGain);
    subGain.connect(master);

    const burn = context.createOscillator();
    const burnFilter = context.createBiquadFilter();
    burn.type = "sawtooth";
    burn.frequency.setValueAtTime(188, now);
    burn.frequency.linearRampToValueAtTime(214, now + 0.08);
    burn.frequency.exponentialRampToValueAtTime(118, now + 0.32);
    burn.detune.setValueAtTime(-9, now);
    burnFilter.type = "bandpass";
    burnFilter.frequency.setValueAtTime(1_250, now);
    burnFilter.frequency.exponentialRampToValueAtTime(520, now + 0.32);
    burnFilter.Q.setValueAtTime(4.2, now);
    burn.connect(burnFilter);
    burnFilter.connect(master);

    const noiseSource = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noiseSource.buffer = this.createNoiseBuffer(context, 0.34);
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(2_900, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(860, now + 0.3);
    noiseFilter.Q.setValueAtTime(7.5, now);
    noiseGain.gain.setValueAtTime(0.0001, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.34, now + 0.026);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);

    const charge = context.createOscillator();
    const chargeGain = context.createGain();
    charge.type = "triangle";
    charge.frequency.setValueAtTime(660, now);
    charge.frequency.exponentialRampToValueAtTime(1_380, now + 0.055);
    chargeGain.gain.setValueAtTime(0.0001, now);
    chargeGain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    chargeGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    charge.connect(chargeGain);
    chargeGain.connect(master);

    sub.start(now);
    burn.start(now);
    noiseSource.start(now);
    charge.start(now);
    sub.stop(now + 0.35);
    burn.stop(now + 0.35);
    noiseSource.stop(now + 0.35);
    charge.stop(now + 0.09);
  }

  private createNoiseBuffer(context: AudioContext, duration: number) {
    const frameCount = Math.ceil(context.sampleRate * duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      const fade = 1 - index / frameCount;
      data[index] = (Math.random() * 2 - 1) * fade;
    }
    return buffer;
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
