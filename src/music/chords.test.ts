import { describe, expect, it } from 'vitest';
import {
  CHORD_QUALITIES, chordCatalog, chordName, chordVoicing, identifiedChordName, identifyChord, inversionName, matchesChord, satisfiesChord,
} from './chords';

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

describe('identifyChord: common piano voicings', () => {
  const cases: [string, number[]][] = [
    ['C6', [60, 64, 67, 69]],
    ['Am7', [57, 60, 64, 67]],
    ['Cm6', [60, 63, 67, 69]],
    ['Am7b5', [57, 60, 63, 67]],
    ['C7', [48, 64, 70]], // fifth omitted
    ['Cmaj7', [48, 64, 71]],
    ['Cm7', [48, 63, 70]],
    ['Cadd9', [60, 62, 64, 67]],
    ['Cmadd9', [60, 62, 63, 67]],
    ['C7sus4', [60, 65, 67, 70]],
    ['CmMaj7', [60, 63, 67, 71]],
    ['C9', [48, 64, 67, 70, 74]],
    ['C9', [48, 64, 70, 74]], // fifth omitted
    ['Cmaj9', [48, 64, 67, 71, 74]],
    ['Cm9', [48, 63, 67, 70, 74]],
  ];
  it('numbers inversions by the bass note role, not list position', () => {
    expect(identifyChord([64, 67, 72, 74])!.inversion).toBe(1); // Cadd9/E: third in bass
    expect(identifyChord([46, 60, 64])!.inversion).toBe(3); // C7/Bb: seventh in bass
    expect(identifyChord([50, 60, 64, 67])!.inversion).toBe(4); // Cadd9/D: ninth in bass
    expect(identifyChord([67, 72, 74])!.inversion).toBe(0); // Gsus4 root position
  });

  it.each(cases)('names %s', (expected, notes) => {
    expect(identifiedChordName(identifyChord(notes)!)).toBe(expected);
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

describe('chordCatalog', () => {
  it('lists every root with every selectable quality, without duplicate names', () => {
    const names = chordCatalog().map((c) => chordName(c));
    expect(names).toContain('C');
    expect(names).toContain('F#m7');
    expect(names).toContain('A#maj9');
    expect(new Set(names).size).toBe(names.length);
    expect(names.length % 12).toBe(0);
  });
});

describe('chordVoicing', () => {
  it('stacks the chord from the root in the given octave', () => {
    expect(chordVoicing({ root: 0, quality: q('maj') })).toEqual([60, 64, 67]);
    expect(chordVoicing({ root: 9, quality: q('min7') })).toEqual([57, 60, 64, 67]); // kept near middle C
  });
  it('puts the ninth above the root octave', () => {
    expect(chordVoicing({ root: 0, quality: q('dom9') })).toEqual([60, 64, 67, 70, 74]);
    expect(chordVoicing({ root: 0, quality: q('add9') })).toEqual([60, 64, 67, 74]);
  });
});

describe('satisfiesChord', () => {
  it('accepts the exact notes in any voicing', () => {
    expect(satisfiesChord([43, 59, 62, 65], { root: 7, quality: q('dom7') })).toBe(true);
  });
  it('accepts a 7th or 9th chord played without its fifth', () => {
    expect(satisfiesChord([43, 59, 65], { root: 7, quality: q('dom7') })).toBe(true);
    expect(satisfiesChord([48, 64, 70, 74], { root: 0, quality: q('dom9') })).toBe(true);
  });
  it('still requires the fifth of a triad', () => {
    expect(satisfiesChord([60, 64], { root: 0, quality: q('maj') })).toBe(false);
  });
  it('rejects a wrong chord', () => {
    expect(satisfiesChord([60, 63, 67], { root: 0, quality: q('maj') })).toBe(false);
  });
});

describe('chordVoicing with inversions', () => {
  it('moves the lowest notes up an octave', () => {
    expect(chordVoicing({ root: 0, quality: q('maj') }, 60, 1)).toEqual([64, 67, 72]);
    expect(chordVoicing({ root: 0, quality: q('maj') }, 60, 2)).toEqual([55, 60, 64]);
    expect(chordVoicing({ root: 7, quality: q('dom7') }, 60, 3)).toEqual([65, 67, 71, 74]);
  });
  it('keeps the voicing around the middle of the keyboard', () => {
    for (let root = 0; root < 12; root++) {
      for (let inv = 0; inv < 4; inv++) {
        const notes = chordVoicing({ root, quality: q('maj7') }, 60, inv);
        expect(notes[0]).toBeGreaterThanOrEqual(53);
        expect(notes[0]).toBeLessThan(66);
      }
    }
  });
});

describe('inversionName', () => {
  it('names root position and inversions in French', () => {
    expect(inversionName(0)).toBe('état fondamental');
    expect(inversionName(1)).toBe('1er renversement');
    expect(inversionName(3)).toBe('3e renversement');
  });
});

describe('identifiedChordName with flats', () => {
  it('spells root and bass with flats when asked', () => {
    const c = identifyChord([46, 50, 53, 56])!; // Bb7 in root position
    expect(identifiedChordName(c)).toBe('A#7');
    expect(identifiedChordName(c, true)).toBe('Bb7');
    expect(identifiedChordName(identifyChord([51, 55, 58, 61])!, true)).toBe('Eb7');
  });
});
