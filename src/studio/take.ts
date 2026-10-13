export type BeatsPerBar = 2 | 3 | 4;

/** A played note, in milliseconds from the first beat after the count-in. */
export interface RecordedNote {
  pitch: number;
  start: number;
  end: number;
  velocity: number;
}

export interface PedalChange {
  time: number;
  down: boolean;
}

/** How a take is turned into a score. Editable after recording. */
export interface TranscriptionSettings {
  /** Shortest binary value: 8 = eighth notes, 16 = sixteenth notes. */
  grid: 8 | 16;
  triplets: boolean;
  /** Lowest MIDI note written on the treble staff. */
  split: number;
  flats: boolean;
  chordNames: boolean;
}

export const DEFAULT_TRANSCRIPTION: TranscriptionSettings = {
  grid: 16,
  triplets: true,
  split: 60,
  flats: false,
  chordNames: true,
};

export interface Take {
  id: string;
  name: string;
  createdAt: number;
  tempo: number;
  beatsPerBar: BeatsPerBar;
  bars: number;
  notes: RecordedNote[];
  pedal: PedalChange[];
  settings: TranscriptionSettings;
}

export function beatMs(tempo: number): number {
  return 60_000 / tempo;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "Prise 3 · 13 oct. 14:05" */
export function defaultTakeName(n: number, date: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `Prise ${n} · ${date.getDate()} ${MONTHS[date.getMonth()]} ${time}`;
}
