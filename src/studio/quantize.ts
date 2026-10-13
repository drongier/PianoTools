import { TICKS_PER_BEAT as T } from './score';
import { beatMs, type Take } from './take';

export interface QuantizedNote {
  pitch: number;
  /** Ticks from the start of the take. */
  start: number;
  end: number;
}

export interface Quantized {
  notes: QuantizedNote[];
  /** Beats written as triplets. */
  tripletBeats: Set<number>;
  totalTicks: number;
}

/**
 * Whether triplets fit these onsets (positions within a beat, 0..1) clearly
 * better than the binary grid. Binary wins any doubt, to avoid stray triplets.
 */
export function prefersTriplet(positions: number[], binary: number): boolean {
  const error = (steps: number) => positions.reduce((sum, x) => sum + Math.abs(x - Math.round(x * steps) / steps), 0);
  const binaryError = error(binary);
  const tripletError = error(3);
  return tripletError < binaryError * 0.6 && binaryError - tripletError > 0.02 * positions.length;
}

/** Snaps note starts and ends to a grid chosen beat by beat. */
export function quantize(take: Pick<Take, 'tempo' | 'beatsPerBar' | 'bars' | 'notes'>, grid: 8 | 16, triplets: boolean): Quantized {
  const beatLength = beatMs(take.tempo);
  const binary = grid === 16 ? 4 : 2;
  const totalBeats = take.bars * take.beatsPerBar;
  const totalTicks = totalBeats * T;
  const clampBeat = (b: number) => Math.min(totalBeats - 1, Math.max(0, b));

  // An onset belongs to the beat whose grid it is closest to: one played a hair early counts for the next beat.
  const located = take.notes.map((note) => {
    const u = note.start / beatLength;
    const beat = clampBeat(Math.floor(u + 1 / (2 * binary)));
    return { note, beat, x: u - beat };
  });

  const tripletBeats = new Set<number>();
  if (triplets) {
    const byBeat = new Map<number, number[]>();
    for (const { beat, x } of located) byBeat.set(beat, [...(byBeat.get(beat) ?? []), x]);
    for (const [beat, xs] of byBeat) if (prefersTriplet(xs, binary)) tripletBeats.add(beat);
  }

  const steps = (beat: number) => (tripletBeats.has(beat) ? 3 : binary);
  // Never snap before the beat start: an early onset (x < 0) belongs to this beat's first grid point,
  // even when the triplet grid would round it back into the previous beat.
  const snap = (beat: number, x: number) => beat * T + Math.max(0, Math.round(x * steps(beat))) * (T / steps(beat));

  const notes = located.map(({ note, beat, x }) => {
    const step = T / steps(beat);
    const start = Math.min(snap(beat, x), totalTicks - step);
    const endBeats = note.end / beatLength;
    const endBeat = clampBeat(Math.floor(endBeats));
    let end = Math.min(snap(endBeat, endBeats - endBeat), totalTicks);
    if (end <= start) end = Math.min(start + T / steps(Math.floor(start / T)), totalTicks);
    return { pitch: note.pitch, start, end };
  });

  return { notes, tripletBeats, totalTicks };
}
