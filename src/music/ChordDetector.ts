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
  /**
   * Legato window: lifting a key held from the previous chord within this
   * delay after the last press counts as part of the chord change.
   */
  legatoMs?: number;
}

export class ChordDetector {
  /** Held note → time it was pressed. */
  private readonly held = new Map<number, number>();
  private lastChangeMs = 0;
  private lastPressMs = -Infinity;
  /** Time of the first press since the last emitted chord. */
  private burstStartMs = -Infinity;
  private dirty = false;
  private readonly settleMs: number;
  private readonly minNotes: number;
  private readonly legatoMs: number;

  /** Called once per stable chord (sorted MIDI notes). */
  onChord: ((notes: number[]) => void) | null = null;

  constructor(options: ChordDetectorOptions = {}) {
    this.settleMs = options.settleMs ?? 60;
    this.minNotes = options.minNotes ?? 3;
    this.legatoMs = options.legatoMs ?? 300;
  }

  noteOn(note: number, nowMs: number): void {
    if (!this.dirty) this.burstStartMs = nowMs;
    this.held.set(note, nowMs);
    this.lastChangeMs = nowMs;
    this.lastPressMs = nowMs;
    this.dirty = true;
  }

  /**
   * Releasing keys alone never triggers a chord (lifting one finger of a
   * 4-note chord must not count as a new 3-note chord). A release counts
   * only while a press is pending, or when it lifts a key left over from the
   * previous chord right after new keys went down (legato chord change).
   */
  noteOff(note: number, nowMs: number): void {
    const pressedAt = this.held.get(note);
    if (pressedAt === undefined) return;
    this.held.delete(note);
    const legatoRelease = pressedAt < this.burstStartMs && nowMs - this.lastPressMs <= this.legatoMs;
    if (this.dirty || legatoRelease) {
      this.lastChangeMs = nowMs;
      this.dirty = true;
    }
  }

  heldNotes(): number[] {
    return [...this.held.keys()].sort((a, b) => a - b);
  }

  /** Call every frame. Emits at most once per burst of key presses. */
  update(nowMs: number): void {
    if (!this.dirty || nowMs - this.lastChangeMs < this.settleMs) return;
    this.dirty = false;
    if (this.held.size >= this.minNotes) this.onChord?.(this.heldNotes());
  }
}
