import { NOTE_NAMES, pitchClass, type PitchClass } from './notes';

export interface ChordQuality {
  id: string;
  /** Suffix appended to the root name, e.g. "m7" → "Am7". */
  symbol: string;
  /** Human-readable French label, for teaching. */
  label: string;
  /** Intervals in semitones from the root, root (0) included. */
  intervals: readonly number[];
}

/** Chord library as data: adding a chord type is a one-line change. */
export const CHORD_QUALITIES: readonly ChordQuality[] = [
  { id: 'maj', symbol: '', label: 'majeur', intervals: [0, 4, 7] },
  { id: 'min', symbol: 'm', label: 'mineur', intervals: [0, 3, 7] },
  { id: 'dim', symbol: 'dim', label: 'diminué', intervals: [0, 3, 6] },
  { id: 'aug', symbol: 'aug', label: 'augmenté', intervals: [0, 4, 8] },
  { id: 'sus2', symbol: 'sus2', label: 'sus2', intervals: [0, 2, 7] },
  { id: 'sus4', symbol: 'sus4', label: 'sus4', intervals: [0, 5, 7] },
  { id: 'dom7', symbol: '7', label: 'septième de dominante', intervals: [0, 4, 7, 10] },
  { id: 'maj7', symbol: 'maj7', label: 'septième majeure', intervals: [0, 4, 7, 11] },
  { id: 'min7', symbol: 'm7', label: 'mineur septième', intervals: [0, 3, 7, 10] },
  { id: 'm7b5', symbol: 'm7b5', label: 'demi-diminué', intervals: [0, 3, 6, 10] },
  { id: 'dim7', symbol: 'dim7', label: 'septième diminuée', intervals: [0, 3, 6, 9] },
];

export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
}

export interface IdentifiedChord extends Chord {
  /** Lowest note actually played. */
  bass: PitchClass;
  /** 0 = root position, 1 = first inversion, ... ; -1 if bass not in chord. */
  inversion: number;
}

export function chordName(chord: Chord): string {
  return NOTE_NAMES[chord.root] + chord.quality.symbol;
}

/** Name including slash bass for inversions, e.g. "C/E". */
export function identifiedChordName(chord: IdentifiedChord): string {
  const base = chordName(chord);
  return chord.bass === chord.root ? base : `${base}/${NOTE_NAMES[chord.bass]}`;
}

export function chordPitchClasses(chord: Chord): PitchClass[] {
  return chord.quality.intervals.map((i) => (chord.root + i) % 12);
}

function pitchClassSet(notes: Iterable<number>): Set<PitchClass> {
  const set = new Set<PitchClass>();
  for (const n of notes) set.add(pitchClass(n));
  return set;
}

function sameSet(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/**
 * Identify a chord from MIDI notes. Octaves and doublings are ignored.
 * When several roots fit (symmetric chords like aug or dim7), the bass note
 * is preferred as root so the result reads as root position.
 */
export function identifyChord(midiNotes: readonly number[]): IdentifiedChord | null {
  if (midiNotes.length === 0) return null;
  const played = pitchClassSet(midiNotes);
  if (played.size < 3) return null;
  const bass = pitchClass(Math.min(...midiNotes));

  const candidates: Chord[] = [];
  for (const quality of CHORD_QUALITIES) {
    if (quality.intervals.length !== played.size) continue;
    for (const root of played) {
      const target = new Set(chordPitchClasses({ root, quality }));
      if (sameSet(target, played)) candidates.push({ root, quality });
    }
  }
  if (candidates.length === 0) return null;

  const best = candidates.find((c) => c.root === bass) ?? candidates[0];
  const pcs = chordPitchClasses(best);
  return { ...best, bass, inversion: pcs.indexOf(bass) };
}

/** True if the played notes contain exactly the chord's pitch classes (any voicing). */
export function matchesChord(midiNotes: readonly number[], chord: Chord): boolean {
  return sameSet(pitchClassSet(midiNotes), new Set(chordPitchClasses(chord)));
}
