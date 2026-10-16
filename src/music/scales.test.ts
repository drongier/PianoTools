import { describe, expect, it } from 'vitest';
import { CHORD_QUALITIES } from './chords';
import { SCALE_TYPES, defaultScaleFor, findScaleType, scaleName, scalePitchClasses } from './scales';

const q = (id: string) => CHORD_QUALITIES.find((c) => c.id === id)!;

describe('scales', () => {
  it('spells a C major scale', () => {
    expect(scalePitchClasses({ root: 0, type: findScaleType('major')! })).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('transposes to the root and wraps around the octave', () => {
    expect(scalePitchClasses({ root: 9, type: findScaleType('naturalMinor')! })).toEqual([9, 11, 0, 2, 4, 5, 7]);
  });

  it('defaults to the major scale for chords with a major third or no third', () => {
    for (const id of ['maj', 'dom7', 'maj7', 'sus4', 'aug', 'add9']) {
      expect(defaultScaleFor({ root: 7, quality: q(id) })).toEqual({ root: 7, type: findScaleType('major') });
    }
  });

  it('defaults to the natural minor scale for chords with a minor third', () => {
    for (const id of ['min', 'min7', 'dim', 'm7b5', 'min7no5']) {
      expect(defaultScaleFor({ root: 2, quality: q(id) })).toEqual({ root: 2, type: findScaleType('naturalMinor') });
    }
  });

  it('names a scale from its root and type', () => {
    expect(scaleName({ root: 0, type: findScaleType('major')! })).toBe('C majeur');
    expect(scaleName({ root: 10, type: findScaleType('dorian')! }, true)).toBe('Bb dorien');
  });

  it('keeps every scale inside one octave, sorted, starting on the root', () => {
    for (const type of SCALE_TYPES) {
      expect(type.intervals[0]).toBe(0);
      expect([...type.intervals].sort((a, b) => a - b)).toEqual(type.intervals);
      expect(Math.max(...type.intervals)).toBeLessThan(12);
    }
  });
});
