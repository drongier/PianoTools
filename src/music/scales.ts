import type { Chord } from './chords';
import { pitchClassName, type PitchClass } from './notes';

export interface ScaleType {
  id: string;
  /** French name, shown after the root: "C majeur". */
  label: string;
  /** Semitones from the root, root (0) first, ascending within one octave. */
  intervals: readonly number[];
}

/** Scale library as data, in menu order. */
export const SCALE_TYPES: readonly ScaleType[] = [
  { id: 'major', label: 'majeur', intervals: [0, 2, 4, 5, 7, 9, 11] },
  { id: 'naturalMinor', label: 'mineur naturel', intervals: [0, 2, 3, 5, 7, 8, 10] },
  { id: 'harmonicMinor', label: 'mineur harmonique', intervals: [0, 2, 3, 5, 7, 8, 11] },
  { id: 'melodicMinor', label: 'mineur mélodique', intervals: [0, 2, 3, 5, 7, 9, 11] },
  { id: 'dorian', label: 'dorien', intervals: [0, 2, 3, 5, 7, 9, 10] },
  { id: 'phrygian', label: 'phrygien', intervals: [0, 1, 3, 5, 7, 8, 10] },
  { id: 'lydian', label: 'lydien', intervals: [0, 2, 4, 6, 7, 9, 11] },
  { id: 'mixolydian', label: 'mixolydien', intervals: [0, 2, 4, 5, 7, 9, 10] },
  { id: 'locrian', label: 'locrien', intervals: [0, 1, 3, 5, 6, 8, 10] },
  { id: 'pentaMajor', label: 'pentatonique majeure', intervals: [0, 2, 4, 7, 9] },
  { id: 'pentaMinor', label: 'pentatonique mineure', intervals: [0, 3, 5, 7, 10] },
  { id: 'blues', label: 'blues', intervals: [0, 3, 5, 6, 7, 10] },
  { id: 'wholeTone', label: 'par tons', intervals: [0, 2, 4, 6, 8, 10] },
  { id: 'dimWholeHalf', label: 'diminuée ton / demi-ton', intervals: [0, 2, 3, 5, 6, 8, 9, 11] },
  { id: 'dimHalfWhole', label: 'diminuée demi-ton / ton', intervals: [0, 1, 3, 4, 6, 7, 9, 10] },
];

export interface Scale {
  root: PitchClass;
  type: ScaleType;
}

export function findScaleType(id: string): ScaleType | undefined {
  return SCALE_TYPES.find((t) => t.id === id);
}

/** Pitch classes of the scale, root first. */
export function scalePitchClasses(scale: Scale): PitchClass[] {
  return scale.type.intervals.map((i) => (scale.root + i) % 12);
}

export function scaleName(scale: Scale, flats = false): string {
  return `${pitchClassName(scale.root, flats)} ${scale.type.label}`;
}

/** Scale suggested by a chord: natural minor if it has a minor third, major otherwise. */
export function defaultScaleFor(chord: Chord): Scale {
  const minor = chord.quality.intervals.includes(3);
  return { root: chord.root, type: findScaleType(minor ? 'naturalMinor' : 'major')! };
}
