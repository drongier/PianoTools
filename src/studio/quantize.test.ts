import { describe, expect, it } from 'vitest';
import { prefersTriplet, quantize } from './quantize';
import type { RecordedNote } from './take';

const n = (pitch: number, start: number, end: number): RecordedNote => ({ pitch, start, end, velocity: 80 });
const take = (notes: RecordedNote[], bars = 1) => ({ tempo: 60, beatsPerBar: 4 as const, bars, notes });
const starts = (q: ReturnType<typeof quantize>) => q.notes.map((x) => x.start);

describe('prefersTriplet', () => {
  it('keeps binary when it fits, picks triplets when clearly better', () => {
    expect(prefersTriplet([0, 0.25, 0.5, 0.75], 4)).toBe(false);
    expect(prefersTriplet([0, 1 / 3, 2 / 3], 4)).toBe(true);
    expect(prefersTriplet([0], 4)).toBe(false);
    expect(prefersTriplet([0, 0.62], 4)).toBe(true); // swung eighths, notated as played
  });
});

describe('quantize', () => {
  it('snaps slightly off sixteenths onto the sixteenth grid', () => {
    const q = quantize(take([n(60, 0, 200), n(62, 270, 450), n(64, 480, 700), n(65, 760, 950)]), 16, true);
    expect(starts(q)).toEqual([0, 3, 6, 9]);
    expect(q.tripletBeats.size).toBe(0);
  });

  it('recognises played triplets', () => {
    const q = quantize(take([n(60, 0, 300), n(62, 340, 640), n(64, 660, 1000)]), 16, true);
    expect(starts(q)).toEqual([0, 4, 8]);
    expect([...q.tripletBeats]).toEqual([0]);
  });

  it('stays binary when triplets are off', () => {
    const q = quantize(take([n(60, 0, 300), n(62, 340, 640), n(64, 660, 1000)]), 16, false);
    expect(starts(q)).toEqual([0, 3, 9]);
  });

  it('uses the eighth grid when asked', () => {
    expect(starts(quantize(take([n(60, 260, 500)]), 8, false))).toEqual([6]);
  });

  it('snaps a note played just before a beat onto that beat', () => {
    expect(starts(quantize(take([n(60, 980, 1500)]), 16, true))).toEqual([12]);
  });

  it('snaps ends and never makes a note shorter than one grid step', () => {
    const q = quantize(take([n(60, 0, 480), n(64, 1000, 1010)]), 16, true);
    expect(q.notes.map((x) => [x.start, x.end])).toEqual([[0, 6], [12, 15]]);
  });

  it('keeps everything inside the last bar', () => {
    const q = quantize(take([n(60, 3990, 6000)]), 16, true);
    expect(q.totalTicks).toBe(48);
    expect(q.notes[0].start).toBeLessThan(48);
    expect(q.notes[0].end).toBe(48);
  });
});

describe('quantize regressions', () => {
  it('keeps an early onset on its triplet beat with the eighth grid', () => {
    const q = quantize(take([n(72, 0, 900), n(74, 1790, 2300), n(76, 2333, 2650), n(77, 2667, 2990)]), 8, true);
    expect(starts(q)).toEqual([0, 24, 28, 32]);
  });
});
