/**
 * Tracks held keys and decides when a chord has been "played".
 *
 * Fingers never land at the exact same millisecond, so we wait until the set
 * of held notes has been stable for `settleMs` before reporting it. Time is
 * injected through `update(nowMs)` so the logic is deterministic and testable.
 */
export interface ChordDetectorOptions {
  /** How long the held-note set must stay unchanged before it counts. */
  settleMs?: number;
  /** Minimum number of distinct keys to report a chord. */
  minNotes?: number;
}

export class ChordDetector {
  private readonly held = new Set<number>();
  private lastChangeMs = 0;
  private dirty = false;
  private readonly settleMs: number;
  private readonly minNotes: number;

  /** Called once per stable chord (sorted MIDI notes). */
  onChord: ((notes: number[]) => void) | null = null;

  constructor(options: ChordDetectorOptions = {}) {
    this.settleMs = options.settleMs ?? 60;
    this.minNotes = options.minNotes ?? 3;
  }

  noteOn(note: number, nowMs: number): void {
    this.held.add(note);
    this.lastChangeMs = nowMs;
    this.dirty = true;
  }

  /**
   * Releasing keys alone never triggers a chord (lifting one finger of a
   * 4-note chord must not count as a new 3-note chord). A release only
   * restarts the settle timer if a press is still pending.
   */
  noteOff(note: number, nowMs: number): void {
    if (this.held.delete(note) && this.dirty) this.lastChangeMs = nowMs;
  }

  heldNotes(): number[] {
    return [...this.held].sort((a, b) => a - b);
  }

  /** Call every frame. Emits at most once per burst of key presses. */
  update(nowMs: number): void {
    if (!this.dirty || nowMs - this.lastChangeMs < this.settleMs) return;
    this.dirty = false;
    if (this.held.size >= this.minNotes) this.onChord?.(this.heldNotes());
  }
}
