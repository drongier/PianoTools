import { CHORD_QUALITIES, findQuality, type Chord, type ChordQuality } from './chords';
import { pitchClassName, type PitchClass } from './notes';
import { scalePitchClasses, type Scale } from './scales';
import type { ChordGroup } from './twoFiveOne';

export interface DegreeChords {
  /** 1 to 7. */
  degree: number;
  /** Roman numeral with accidental relative to the major scale: "♭III", "ii°". */
  triadNumeral: string;
  seventhNumeral: string;
  triad: Chord | null;
  seventh: Chord | null;
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
/** Keys written with flats: F, Bb, Eb, Ab, Db, Gb (major tonic). */
const FLAT_MAJOR_KEYS = new Set<PitchClass>([5, 10, 3, 8, 1, 6]);
/** Distance from a mode's tonic to its relative major tonic. */
const RELATIVE_MAJOR: Record<string, number> = {
  major: 0, naturalMinor: 3, harmonicMinor: 3, melodicMinor: 3,
  dorian: 10, phrygian: 8, lydian: 7, mixolydian: 5, locrian: 1,
};

/** Numeral suffix per chord quality; lowercase numerals for chords with a minor third. */
const NUMERAL_SUFFIX: Record<string, string> = {
  maj: '', min: '', dim: '°', aug: '+',
  dom7: '7', maj7: 'maj7', min7: '7', m7b5: 'ø7', dim7: '°7', mMaj7: '(maj7)', maj7aug5: '+maj7',
};

/** True if the scale's notes are written with flats, judged from its key signature. */
export function scaleUsesFlats(scale: Scale): boolean {
  const offset = RELATIVE_MAJOR[scale.type.id];
  if (offset === undefined) return FLAT_MAJOR_KEYS.has(scale.root);
  return FLAT_MAJOR_KEYS.has((scale.root + offset) % 12);
}

/** Quality whose intervals are exactly these (triads and sevenths only). */
function qualityOf(intervals: number[]): ChordQuality | null {
  const key = intervals.join(',');
  return CHORD_QUALITIES.find((q) => NUMERAL_SUFFIX[q.id] !== undefined && q.intervals.join(',') === key) ?? null;
}

function numeral(degree: number, interval: number, quality: ChordQuality | null): string {
  const diff = interval - MAJOR[degree];
  const accidental = diff < 0 ? '♭'.repeat(-diff) : '♯'.repeat(diff);
  if (!quality) return accidental + ROMAN[degree];
  const minorThird = quality.intervals[1] === 3;
  return accidental + (minorThird ? ROMAN[degree].toLowerCase() : ROMAN[degree]) + NUMERAL_SUFFIX[quality.id];
}

/**
 * Chords built on each degree of a 7-note scale by stacking its thirds.
 * Returns an empty list for other scales (pentatonic, blues…).
 */
export function degreeChords(scale: Scale): DegreeChords[] {
  const pcs = scalePitchClasses(scale);
  if (pcs.length !== 7) return [];
  return pcs.map((root, d) => {
    const stack = [0, 2, 4, 6].map((step) => (pcs[(d + step) % 7] - root + 12) % 12);
    const triadQ = qualityOf(stack.slice(0, 3));
    const seventhQ = qualityOf(stack);
    const interval = scale.type.intervals[d];
    return {
      degree: d + 1,
      triadNumeral: numeral(d, interval, triadQ),
      seventhNumeral: numeral(d, interval, seventhQ),
      triad: triadQ && { root, quality: triadQ },
      seventh: seventhQ && { root, quality: seventhQ },
    };
  });
}

const quality = (id: string) => findQuality(id)!;

/**
 * The jazz ii-V-I of the scale's key: ii-V-I major for scales with a major third,
 * iiø7-V7-i for those with a minor third (tonic m7, or the scale's own minor tonic chord such as mMaj7).
 * Null when the scale has no perfect fifth.
 */
export function scaleTwoFiveOne(scale: Scale): ChordGroup | null {
  const { intervals } = scale.type;
  if (!intervals.includes(7)) return null;
  const minor = intervals.includes(3) && !intervals.includes(4);
  const own = degreeChords(scale)[0]?.seventh?.quality;
  const tonic = minor ? (own?.intervals[1] === 3 ? own : quality('min7')) : quality('maj7');
  const flats = scaleUsesFlats(scale);
  return {
    id: `scale-ii-V-I:${scale.root}:${scale.type.id}`,
    keyName: pitchClassName(scale.root, flats),
    flats,
    mode: minor ? 'minor' : 'major',
    chords: [
      { root: (scale.root + 2) % 12, quality: quality(minor ? 'm7b5' : 'min7') },
      { root: (scale.root + 7) % 12, quality: quality('dom7') },
      { root: scale.root, quality: tonic },
    ],
  };
}
