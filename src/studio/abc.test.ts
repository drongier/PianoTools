import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { abcPitch, toAbc } from './abc';
import type { Score } from './score';
import { transcribe } from './transcribe';
import { DEFAULT_TRANSCRIPTION, type Take } from './take';

const ev = (pitches: number[], start: number, ticks: number, extra: object = {}) => ({ pitches, start, ticks, triplet: false, tie: false, ...extra });

describe('abcPitch', () => {
  it('writes octaves the ABC way', () => {
    const s = new Map<string, string>();
    expect([36, 48, 60, 72, 84].map((m) => abcPitch(m, false, s))).toEqual(['C,,', 'C,', 'C', 'c', "c'"]);
  });
  it('writes accidentals once per bar, and naturals to cancel them', () => {
    const s = new Map<string, string>();
    expect([61, 61, 60].map((m) => abcPitch(m, false, s))).toEqual(['^C', 'C', '=C']);
    expect(abcPitch(70, true, new Map())).toBe('_B');
    expect(abcPitch(70, false, new Map())).toBe('^A');
  });
});

describe('toAbc', () => {
  it('writes a grand staff with chords, triplets, rests and ties', () => {
    const score: Score = {
      title: 'Test', tempo: 90, beatsPerBar: 4, flats: false,
      measures: [{
        treble: [
          ev([62, 65, 69, 72], 0, 12, { chordName: 'Dm7' }),
          ev([73], 12, 4, { triplet: true }), ev([74], 16, 4, { triplet: true }), ev([76], 20, 4, { triplet: true }),
          ev([], 24, 12),
          ev([70], 36, 12, { tie: true }),
        ],
        bass: [ev([50], 0, 48)],
      }],
    };
    expect(toAbc(score)).toBe([
      'X:1',
      'T:Test',
      'M:4/4',
      'L:1/16',
      'Q:1/4=90',
      '%%staves {RH LH}',
      'V:RH clef=treble',
      'V:LH clef=bass',
      '[V:RH] "Dm7"[DFAc]4 (3:2:3^c2d2e2 z4 ^A4- |]',
      '[V:LH] D,16 |]',
      '',
    ].join('\n'));
  });

  it('puts four bars per line', () => {
    const bar = { treble: [ev([], 0, 48)], bass: [ev([], 0, 48)] };
    const abc = toAbc({ title: 'T', tempo: 60, beatsPerBar: 4, flats: false, measures: Array.from({ length: 5 }, () => bar) });
    expect(abc).toContain('[V:RH] z16 | z16 | z16 | z16 |\n[V:LH] z16 | z16 | z16 | z16 |\n[V:RH] z16 |]\n[V:LH] z16 |]');
  });

  it('produces ABC that abcjs reads without warnings', () => {
    const take: Take = {
      id: 't', name: 'Impro', createdAt: 0, tempo: 60, beatsPerBar: 3, bars: 2, pedal: [],
      settings: { ...DEFAULT_TRANSCRIPTION, flats: true },
      notes: [
        { pitch: 46, start: 0, end: 3000, velocity: 80 },
        { pitch: 70, start: 0, end: 330, velocity: 80 },
        { pitch: 72, start: 340, end: 660, velocity: 80 },
        { pitch: 74, start: 670, end: 2500, velocity: 80 },
        { pitch: 75, start: 2600, end: 6000, velocity: 80 },
      ],
    };
    const [tune] = abcjs.parseOnly(toAbc(transcribe(take)));
    expect(tune.warnings ?? []).toEqual([]);
    expect(tune.lines[0].staff).toHaveLength(2);
  });
});
