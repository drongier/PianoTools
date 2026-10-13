/** Ticks per quarter note: divisible by 4 (sixteenths) and 3 (triplet eighths). */
export const TICKS_PER_BEAT = 12;

export interface ScoreEvent {
  /** MIDI pitches, low to high; empty for a rest. */
  pitches: number[];
  /** Start in ticks from the beginning of the measure. */
  start: number;
  /** Real length in ticks: a sixteenth is 3, a triplet eighth 4. */
  ticks: number;
  triplet: boolean;
  /** Tied to the next event of the same staff. */
  tie: boolean;
  /** Chord symbol written above this event (treble staff only). */
  chordName?: string;
}

export interface ScoreMeasure {
  treble: ScoreEvent[];
  bass: ScoreEvent[];
}

/** Renderer-independent score, so it can later be exported to MusicXML too. */
export interface Score {
  title: string;
  tempo: number;
  beatsPerBar: number;
  flats: boolean;
  measures: ScoreMeasure[];
}
