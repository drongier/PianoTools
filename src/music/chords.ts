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
  { id: 'mMaj7', symbol: 'mMaj7', label: 'mineur septième majeure', intervals: [0, 3, 7, 11] },
  { id: '7sus4', symbol: '7sus4', label: 'septième sus4', intervals: [0, 5, 7, 10] },
  // Listed after the 7ths: same notes as m7 / m7b5 of another root (C6 = Am7),
  // so the bass decides and a 7th wins when the bass is neither root.
  { id: '6', symbol: '6', label: 'sixte', intervals: [0, 4, 7, 9] },
  { id: 'm6', symbol: 'm6', label: 'mineur sixte', intervals: [0, 3, 7, 9] },
  { id: 'add9', symbol: 'add9', label: 'add9', intervals: [0, 2, 4, 7] },
  { id: 'madd9', symbol: 'madd9', label: 'mineur add9', intervals: [0, 2, 3, 7] },
  { id: 'dom9', symbol: '9', label: 'neuvième de dominante', intervals: [0, 2, 4, 7, 10] },
  { id: 'maj9', symbol: 'maj9', label: 'neuvième majeure', intervals: [0, 2, 4, 7, 11] },
  { id: 'min9', symbol: 'm9', label: 'mineur neuvième', intervals: [0, 2, 3, 7, 10] },
  // Pianists often drop the fifth of 7th and 9th chords.
  { id: 'dom7no5', symbol: '7', label: 'septième de dominante (sans quinte)', intervals: [0, 4, 10] },
  { id: 'maj7no5', symbol: 'maj7', label: 'septième majeure (sans quinte)', intervals: [0, 4, 11] },
  { id: 'min7no5', symbol: 'm7', label: 'mineur septième (sans quinte)', intervals: [0, 3, 10] },
  { id: 'dom9no5', symbol: '9', label: 'neuvième de dominante (sans quinte)', intervals: [0, 2, 4, 10] },
];

export interface Chord {
  root: PitchClass;
  quality: ChordQuality;
}

export interface IdentifiedChord extends Chord {
  /** Lowest note actually played. */
  bass: PitchClass;
  /** 0 = root position, 1 = third in bass, 2 = fifth, 3 = seventh/sixth, 4 = ninth. */
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
  return { ...best, bass, inversion: inversionOf(best, bass) };
}

/** Inversion from the role of the bass note in the chord. */
function inversionOf(chord: Chord, bass: PitchClass): number {
  const interval = (bass - chord.root + 12) % 12;
  const hasThird = chord.quality.intervals.some((i) => i === 3 || i === 4);
  if (interval === 0) return 0;
  if (interval === 3 || interval === 4) return 1;
  if (interval === 2) return hasThird ? 4 : 1; // ninth, or the 2 of a sus2
  if (interval === 5) return 1; // the 4 of a sus4
  if (interval >= 6 && interval <= 8) return 2;
  return 3;
}

/** True if the played notes contain exactly the chord's pitch classes (any voicing). */
export function matchesChord(midiNotes: readonly number[], chord: Chord): boolean {
  return sameSet(pitchClassSet(midiNotes), new Set(chordPitchClasses(chord)));
}

export function findQuality(id: string): ChordQuality | undefined {
  return CHORD_QUALITIES.find((q) => q.id === id);
}

/** Every chord offered in the picker: all roots × qualities, minus the no-fifth variants. */
export function chordCatalog(): Chord[] {
  const qualities = CHORD_QUALITIES.filter((q) => !q.id.endsWith('no5'));
  return NOTE_NAMES.flatMap((_, root) => qualities.map((quality) => ({ root, quality })));
}

/** MIDI notes of a close root-position voicing, the ninth placed above the octave. */
export function chordVoicing(chord: Chord, rootOctaveMidi = 60): number[] {
  const hasThird = chord.quality.intervals.some((i) => i === 3 || i === 4);
  return chord.quality.intervals
    .map((i) => (i === 2 && hasThird ? 14 : i))
    .sort((a, b) => a - b)
    .map((i) => rootOctaveMidi + chord.root + i);
}

/**
 * True if the played notes are the chord, accepting 7th and 9th chords played
 * without their fifth, as pianists often do.
 */
export function satisfiesChord(midiNotes: readonly number[], chord: Chord): boolean {
  if (matchesChord(midiNotes, chord)) return true;
  const { intervals } = chord.quality;
  const hasSeventh = intervals.includes(10) || intervals.includes(11);
  if (!hasSeventh || !intervals.includes(7)) return false;
  const withoutFifth = chordPitchClasses(chord).filter((pc) => pc !== (chord.root + 7) % 12);
  return sameSet(pitchClassSet(midiNotes), new Set(withoutFifth));
}
