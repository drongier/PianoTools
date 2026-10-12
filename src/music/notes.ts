/** Note names using sharps. Index = pitch class (0 = C). */
export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Same pitch classes spelled with flats, for flat keys (Bb, Eb, Ab…). */
export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export function pitchClassName(pc: number, flats = false): string {
  return (flats ? NOTE_NAMES_FLAT : NOTE_NAMES)[pc];
}

/** Range of the on-screen keyboard: C2 to C7. */
export const PIANO_LOW = 36;
export const PIANO_HIGH = 96;

/** Where chords are drawn on the piano by default: around C3, an octave below middle C. */
export const CHORD_DISPLAY_MIDI = 48;

export type PitchClass = number; // 0..11

export function pitchClass(midiNote: number): PitchClass {
  return ((midiNote % 12) + 12) % 12;
}

export function noteName(midiNote: number): string {
  return NOTE_NAMES[pitchClass(midiNote)];
}

/** Scientific pitch notation: MIDI 60 = C4. */
export function noteNameWithOctave(midiNote: number): string {
  return `${noteName(midiNote)}${Math.floor(midiNote / 12) - 1}`;
}

export function isBlackKey(midiNote: number): boolean {
  return [1, 3, 6, 8, 10].includes(pitchClass(midiNote));
}
