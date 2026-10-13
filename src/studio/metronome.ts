import { audioToPerformanceMs } from './clock';

export interface MetronomeStart {
  tempo: number;
  beatsPerBar: number;
  countInBars: number;
  /** Keep clicking after the count-in. */
  clickAfterCountIn: boolean;
}

const LOOKAHEAD_SEC = 0.12;
const TICK_MS = 25;

/** Click track on the Web Audio clock, scheduled slightly ahead so it never drifts. */
export class Metronome {
  private ctx: AudioContext | null = null;
  private timer = 0;

  /** Starts clicking; resolves with the performance.now() time of the first beat after the count-in. */
  async start(o: MetronomeStart): Promise<number> {
    this.stop();
    const ctx = (this.ctx ??= new AudioContext());
    await ctx.resume();
    const beat = 60 / o.tempo;
    const countInBeats = o.countInBars * o.beatsPerBar;
    const startAt = ctx.currentTime + 0.1;
    let index = 0;
    let next = startAt;
    const schedule = () => {
      while (next < ctx.currentTime + LOOKAHEAD_SEC) {
        if (index < countInBeats || o.clickAfterCountIn) this.click(ctx, next, index % o.beatsPerBar === 0);
        index++;
        next += beat;
      }
    };
    schedule();
    this.timer = window.setInterval(schedule, TICK_MS);
    return audioToPerformanceMs(outputStamp(ctx), startAt + countInBeats * beat, ctx.outputLatency || 0);
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  private click(ctx: AudioContext, time: number, accent: boolean): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}

/** A matching (audio time, performance time) pair; falls back to "now" before audio output starts. */
function outputStamp(ctx: AudioContext): { contextTime: number; performanceTime: number } {
  const stamp = ctx.getOutputTimestamp();
  if (stamp.contextTime && stamp.performanceTime) return { contextTime: stamp.contextTime, performanceTime: stamp.performanceTime };
  return { contextTime: ctx.currentTime, performanceTime: performance.now() };
}
