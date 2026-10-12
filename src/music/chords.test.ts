import { describe, expect, it } from 'vitest';
import { CHORD_QUALITIES, identifiedChordName, identifyChord, matchesChord } from './chords';

const q = (id: string) => CHORD_QUALITIES.find((c) => c.id === id)!;

describe('identifyChord', () => {
  it('identifies a C major triad in root position', () => {
    const c = identifyChord([60, 64, 67])!;
    expect(identifiedChordName(c)).toBe('C');
    expect(c.inversion).toBe(0);
  });

  it('identifies inversions with a slash bass', () => {
    const c = identifyChord([64, 67, 72])!;
    expect(identifiedChordName(c)).toBe('C/E');
    expect(c.inversion).toBe(1);
  });

  it('ignores octaves and doublings', () => {
    expect(identifiedChordName(identifyChord([45, 57, 60, 64, 69])!)).toBe('Am');
  });

  it('identifies seventh chords', () => {
    expect(identifiedChordName(identifyChord([67, 71, 74, 77])!)).toBe('G7');
    expect(identifiedChordName(identifyChord([60, 64, 67, 71])!)).toBe('Cmaj7');
    expect(identifiedChordName(identifyChord([71, 74, 77, 81])!)).toBe('Bm7b5');
  });

  it('prefers the bass as root for symmetric chords', () => {
    expect(identifiedChordName(identifyChord([64, 68, 72])!)).toBe('Eaug');
  });

  it('returns null for fewer than 3 pitch classes or unknown sets', () => {
    expect(identifyChord([60, 72, 64])).toBeNull();
    expect(identifyChord([60, 61, 62])).toBeNull();
    expect(identifyChord([])).toBeNull();
  });
});

describe('matchesChord', () => {
  it('accepts any voicing of the target chord', () => {
    expect(matchesChord([55, 60, 64], { root: 0, quality: q('maj') })).toBe(true);
  });
  it('rejects extra or missing notes', () => {
    expect(matchesChord([60, 64, 67, 70], { root: 0, quality: q('maj') })).toBe(false);
    expect(matchesChord([60, 63, 67], { root: 0, quality: q('maj') })).toBe(false);
  });
});
