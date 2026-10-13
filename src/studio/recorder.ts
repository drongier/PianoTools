import { beatMs, type PedalChange, type RecordedNote } from './take';

export interface RecorderOptions {
  tempo: number;
  beatsPerBar: number;
  /** performance.now() time of the first beat after the count-in. */
  zeroTime: number;
}

export interface Recording {
  notes: RecordedNote[];
  pedal: PedalChange[];
  bars: number;
}

/**
 * Collects timestamped notes into a take. Pure: times are passed in, so the
 * count-in, anticipation and stop rules are testable.
 */
export class Recorder {
  private readonly open = new Map<number, { start: number; velocity: number }>();
  private readonly notes: RecordedNote[] = [];
  private readonly pedal: PedalChange[] = [];
  private readonly options: RecorderOptions;

  constructor(options: RecorderOptions) {
    this.options = options;
  }

  noteOn(pitch: number, velocity: number, time: number): void {
    let start = time - this.options.zeroTime;
    // A note in the last half beat of the count-in is an anticipation of beat 1.
    if (start < -beatMs(this.options.tempo) / 2) return;
    start = Math.max(0, start);
    this.close(pitch, start);
    this.open.set(pitch, { start, velocity });
  }

  noteOff(pitch: number, time: number): void {
    this.close(pitch, Math.max(0, time - this.options.zeroTime));
  }

  sustain(down: boolean, time: number): void {
    const t = time - this.options.zeroTime;
    if (t >= 0) this.pedal.push({ time: t, down });
  }

  /** Ends the take. Null when nothing was played, or when stopped before beat 1. */
  stop(time: number): Recording | null {
    const end = time - this.options.zeroTime;
    if (end <= 0) return null;
    for (const pitch of [...this.open.keys()]) this.close(pitch, end);
    if (this.notes.length === 0) return null;
    const barMs = beatMs(this.options.tempo) * this.options.beatsPerBar;
    const last = Math.max(end, ...this.notes.map((n) => n.end));
    return {
      notes: [...this.notes].sort((a, b) => a.start - b.start || a.pitch - b.pitch),
      pedal: [...this.pedal],
      bars: Math.max(1, Math.ceil(last / barMs)),
    };
  }

  private close(pitch: number, end: number): void {
    const note = this.open.get(pitch);
    if (!note) return;
    this.open.delete(pitch);
    this.notes.push({ pitch, start: note.start, end: Math.max(end, note.start), velocity: note.velocity });
  }
}
