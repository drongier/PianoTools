import { identifiedChordName, identifyChord } from '../music/chords';
import { quantize, type QuantizedNote } from './quantize';
import { TICKS_PER_BEAT as T, type Score, type ScoreEvent, type ScoreMeasure } from './score';
import type { Take } from './take';

export interface Segment {
  start: number;
  end: number;
  /** Empty for a rest. */
  pitches: number[];
}

/**
 * One staff as a gapless run of chords and rests. Notes starting together form
 * a chord lasting until its longest note; a chord stops where the next one
 * starts (one voice per staff).
 */
export function staffSegments(notes: QuantizedNote[], total: number): Segment[] {
  const byStart = new Map<number, { pitches: Set<number>; end: number }>();
  for (const note of notes) {
    const group = byStart.get(note.start);
    if (group) {
      group.pitches.add(note.pitch);
      group.end = Math.max(group.end, note.end);
    } else {
      byStart.set(note.start, { pitches: new Set([note.pitch]), end: note.end });
    }
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  const segments: Segment[] = [];
  let pos = 0;
  starts.forEach((start, i) => {
    const group = byStart.get(start)!;
    const end = Math.min(group.end, starts[i + 1] ?? total, total);
    if (start > pos) segments.push({ start: pos, end: start, pitches: [] });
    segments.push({ start, end, pitches: [...group.pitches].sort((a, b) => a - b) });
    pos = end;
  });
  if (pos < total) segments.push({ start: pos, end: total, pitches: [] });
  return segments;
}

const PLAIN = [48, 24, 12, 6, 3];
const DOTTED = new Set([36, 18, 9]);
const ALL = [48, 36, 24, 18, 12, 9, 6, 3];

/**
 * Splits a binary-grid duration (inside one bar) into writable values.
 * Off-beat notes resolve on the next beat; halves start on beat 1 or 3; whole
 * and dotted-half values start the bar; dotted values must end on a beat or
 * finish the duration. Rests are never dotted.
 */
export function noteValues(start: number, length: number, barTicks: number, allowDotted: boolean): number[] {
  const values: number[] = [];
  let pos = start;
  let left = length;
  while (left > 0) {
    const inBar = pos % barTicks;
    const inBeat = pos % T;
    const limit = inBeat === 0 ? left : Math.min(left, T - inBeat);
    const value = (allowDotted ? ALL : PLAIN).find((v) => {
      if (v > limit) return false;
      if (v >= 36 && inBar !== 0) return false;
      if (v >= 24 && inBar % 24 !== 0) return false;
      if (DOTTED.has(v) && (pos + v) % T !== 0 && v !== left) return false;
      return true;
    })!;
    values.push(value);
    pos += value;
    left -= value;
  }
  return values;
}

/** Chord symbol per beat, kept only when it changes from the last one shown. */
export function chordNamesByTick(notes: QuantizedNote[], totalBeats: number, flats: boolean): Map<number, string> {
  const names = new Map<number, string>();
  let last: string | null = null;
  for (let beat = 0; beat < totalBeats; beat++) {
    const from = beat * T;
    const to = from + T;
    const chord = identifyChord(notes.filter((n) => n.start < to && n.end > from).map((n) => n.pitch));
    const name = chord ? identifiedChordName(chord, flats) : null;
    if (name && name !== last) {
      names.set(from, name);
      last = name;
    }
  }
  return names;
}

/** Turns a take and its settings into a renderer-independent score. */
export function transcribe(take: Take): Score {
  const { settings } = take;
  const q = quantize(take, settings.grid, settings.triplets);
  const barTicks = take.beatsPerBar * T;
  const totalBeats = take.bars * take.beatsPerBar;
  const names = settings.chordNames ? chordNamesByTick(q.notes, totalBeats, settings.flats) : new Map<number, string>();

  const baseCuts = new Set<number>();
  for (let t = barTicks; t < q.totalTicks; t += barTicks) baseCuts.add(t);
  for (const beat of q.tripletBeats) {
    baseCuts.add(beat * T);
    baseCuts.add((beat + 1) * T);
  }

  const measures: ScoreMeasure[] = Array.from({ length: take.bars }, () => ({ treble: [], bass: [] }));

  const writeStaff = (staff: 'treble' | 'bass', notes: QuantizedNote[]) => {
    const cuts = new Set(baseCuts);
    if (staff === 'treble') for (const tick of names.keys()) cuts.add(tick);
    const sortedCuts = [...cuts].sort((a, b) => a - b);

    for (const segment of staffSegments(notes, q.totalTicks)) {
      const bounds = [segment.start, ...sortedCuts.filter((c) => c > segment.start && c < segment.end), segment.end];
      const lengths: { start: number; ticks: number; triplet: boolean }[] = [];
      for (let i = 0; i < bounds.length - 1; i++) {
        const [from, to] = [bounds[i], bounds[i + 1]];
        const beat = Math.floor(from / T);
        const wholeBeat = from % T === 0 && to - from === T;
        if (q.tripletBeats.has(beat) && !wholeBeat) {
          let pos = from;
          while (pos < to) {
            const ticks = to - pos >= 8 ? 8 : 4;
            lengths.push({ start: pos, ticks, triplet: true });
            pos += ticks;
          }
        } else {
          let pos = from;
          for (const ticks of noteValues(from, to - from, barTicks, segment.pitches.length > 0)) {
            lengths.push({ start: pos, ticks, triplet: false });
            pos += ticks;
          }
        }
      }
      lengths.forEach((piece, i) => {
        const measure = Math.floor(piece.start / barTicks);
        const event: ScoreEvent = {
          pitches: segment.pitches,
          start: piece.start - measure * barTicks,
          ticks: piece.ticks,
          triplet: piece.triplet,
          tie: segment.pitches.length > 0 && i < lengths.length - 1,
        };
        const name = staff === 'treble' ? names.get(piece.start) : undefined;
        if (name) event.chordName = name;
        measures[measure][staff].push(event);
      });
    }
  };

  writeStaff('treble', q.notes.filter((n) => n.pitch >= settings.split));
  writeStaff('bass', q.notes.filter((n) => n.pitch < settings.split));

  return { title: take.name, tempo: take.tempo, beatsPerBar: take.beatsPerBar, flats: settings.flats, measures };
}
