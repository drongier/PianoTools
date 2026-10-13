import { describe, expect, it } from 'vitest';
import { noteValues, transcribe } from './transcribe';
import type { Score, ScoreEvent } from './score';
import { DEFAULT_TRANSCRIPTION, type RecordedNote, type Take, type TranscriptionSettings } from './take';

const n = (pitch: number, start: number, end: number): RecordedNote => ({ pitch, start, end, velocity: 80 });
const take = (notes: RecordedNote[], bars = 1, settings: Partial<TranscriptionSettings> = {}): Take => ({
  id: 't', name: 'Test', createdAt: 0, tempo: 60, beatsPerBar: 4, bars, notes, pedal: [],
  settings: { ...DEFAULT_TRANSCRIPTION, ...settings },
});
const brief = (events: ScoreEvent[]) => events.map((e) => `${e.pitches.join('+') || 'z'}:${e.ticks}${e.triplet ? 't' : ''}${e.tie ? '-' : ''}`);

/** Every staff of every measure must add up to a full bar. */
function expectFullMeasures(score: Score) {
  const bar = score.beatsPerBar * 12;
  for (const m of score.measures) {
    expect(m.treble.reduce((s, e) => s + e.ticks, 0)).toBe(bar);
    expect(m.bass.reduce((s, e) => s + e.ticks, 0)).toBe(bar);
  }
}

describe('noteValues', () => {
  it('splits durations into readable values', () => {
    expect(noteValues(0, 48, 48, true)).toEqual([48]);
    expect(noteValues(12, 36, 48, true)).toEqual([12, 24]); // beat 2 to the end: quarter + half
    expect(noteValues(12, 18, 48, true)).toEqual([18]); // syncopated dotted quarter
    expect(noteValues(3, 21, 48, true)).toEqual([9, 12]); // off-beat start resolves on the beat
    expect(noteValues(0, 36, 48, false)).toEqual([24, 12]); // rests are never dotted
    expect(noteValues(0, 36, 36, true)).toEqual([36]); // full 3/4 bar
  });
});

describe('transcribe', () => {
  it('writes a held chord as a whole note, with a whole-bar rest on the empty staff', () => {
    const s = transcribe(take([n(60, 0, 4000), n(64, 0, 4000), n(67, 0, 4000)]));
    expect(brief(s.measures[0].treble)).toEqual(['60+64+67:48']);
    expect(brief(s.measures[0].bass)).toEqual(['z:48']);
    expectFullMeasures(s);
  });

  it('writes quarter notes', () => {
    const s = transcribe(take([0, 1000, 2000, 3000].map((t) => n(72, t, t + 900))));
    expect(brief(s.measures[0].treble)).toEqual(['72:12', '72:12', '72:12', '72:12']);
  });

  it('ties a note across the barline', () => {
    const s = transcribe(take([n(72, 3000, 5000)], 2));
    expect(brief(s.measures[0].treble)).toEqual(['z:24', 'z:12', '72:12-']);
    expect(brief(s.measures[1].treble)).toEqual(['72:12', 'z:12', 'z:24']);
    expectFullMeasures(s);
  });

  it('writes played triplets as triplets', () => {
    const s = transcribe(take([n(72, 0, 330), n(74, 340, 660), n(76, 670, 1000)]));
    expect(brief(s.measures[0].treble)).toEqual(['72:4t', '74:4t', '76:4t', 'z:12', 'z:24']);
    expectFullMeasures(s);
  });

  it('splits hands at the split note, which goes on the treble staff', () => {
    const s = transcribe(take([n(59, 0, 4000), n(60, 0, 4000)]));
    expect(brief(s.measures[0].treble)).toEqual(['60:48']);
    expect(brief(s.measures[0].bass)).toEqual(['59:48']);
  });

  it('merges near-simultaneous notes into one chord, never zero length', () => {
    const s = transcribe(take([n(72, 0, 30), n(76, 40, 1000)]));
    expect(brief(s.measures[0].treble)[0]).toBe('72+76:12');
    expectFullMeasures(s);
  });

  it('shortens a held note when the next one starts on the same staff (one voice)', () => {
    const s = transcribe(take([n(72, 0, 4000), n(76, 2000, 3000)]));
    expect(brief(s.measures[0].treble)).toEqual(['72:24', '76:12', 'z:12']);
  });

  it('names chords above the treble staff when they change', () => {
    const notes = [n(50, 0, 4000), n(65, 0, 4000), n(69, 0, 4000), n(72, 0, 4000), n(43, 4000, 8000), n(65, 4000, 8000), n(71, 4000, 8000), n(74, 4000, 8000)];
    const s = transcribe(take(notes, 2));
    expect(s.measures[0].treble[0].chordName).toBe('Dm7');
    expect(s.measures[1].treble[0].chordName).toBe('G7');
    expect(s.measures[0].treble.filter((e) => e.chordName)).toHaveLength(1);
    expect(transcribe(take(notes, 2, { chordNames: false })).measures[0].treble[0].chordName).toBeUndefined();
  });

  it('cuts a long note where a new chord name starts, so the name has a note to sit on', () => {
    const notes = [n(72, 0, 4000), n(48, 0, 2000), n(52, 0, 2000), n(55, 0, 2000), n(48, 2000, 4000), n(53, 2000, 4000), n(57, 2000, 4000)];
    const s = transcribe(take(notes));
    expect(brief(s.measures[0].treble)).toEqual(['72:24-', '72:24']);
    expect(s.measures[0].treble.map((e) => e.chordName)).toEqual(['C', 'F/C']);
  });

  it('follows the flats setting in chord names', () => {
    const s = transcribe(take([n(46, 0, 4000), n(62, 0, 4000), n(65, 0, 4000)], 1, { flats: true }));
    expect(s.flats).toBe(true);
    expect(s.measures[0].treble[0].chordName).toBe('Bb');
  });

  it('never writes past the last barline', () => {
    const s = transcribe(take([n(72, 3990, 9000)]));
    expect(s.measures).toHaveLength(1);
    expectFullMeasures(s);
  });
});

describe('transcribe invariants', () => {
  /** Deterministic pseudo-random generator so the test is reproducible. */
  function rng(seed: number) {
    let s = seed;
    return () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  }

  it('always fills every bar exactly, for every grid and triplet setting', () => {
    const random = rng(42);
    for (const grid of [8, 16] as const) {
      for (const triplets of [false, true]) {
        for (let i = 0; i < 150; i++) {
          const bars = 1 + Math.floor(random() * 3);
          const notes = Array.from({ length: Math.floor(random() * 14) }, () => {
            const start = random() * bars * 4000;
            return n(36 + Math.floor(random() * 48), start, start + 20 + random() * 2000);
          });
          const s = transcribe(take(notes, bars, { grid, triplets }));
          for (const m of s.measures) {
            for (const staff of [m.treble, m.bass]) {
              expect(staff.every((e) => Number.isFinite(e.ticks) && e.ticks > 0)).toBe(true);
              expect(staff.reduce((sum, e) => sum + e.ticks, 0)).toBe(48);
            }
          }
        }
      }
    }
  });
});
