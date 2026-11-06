import { describe, expect, it } from 'vitest';
import { chordName } from './chords';
import { degreeChords, scaleTwoFiveOne, scaleUsesFlats } from './degrees';
import { findScaleType, type Scale } from './scales';
import { MINOR_TWO_FIVE_ONES } from './twoFiveOne';

const scale = (root: number, id: string): Scale => ({ root, type: findScaleType(id)! });
const sevenths = (s: Scale) => degreeChords(s).map((d) => d.seventh && chordName(d.seventh, scaleUsesFlats(s)));

describe('degree chords', () => {
  it('builds the seventh chords of C major with their numerals', () => {
    const degrees = degreeChords(scale(0, 'major'));
    expect(sevenths(scale(0, 'major'))).toEqual(['Cmaj7', 'Dm7', 'Em7', 'Fmaj7', 'G7', 'Am7', 'Bm7b5']);
    expect(degrees.map((d) => d.triadNumeral)).toEqual(['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']);
    expect(degrees.map((d) => d.seventhNumeral)).toEqual(['Imaj7', 'ii7', 'iii7', 'IVmaj7', 'V7', 'vi7', 'viiø7']);
  });

  it('builds B natural minor, whose v is minor', () => {
    const s = scale(11, 'naturalMinor');
    expect(sevenths(s)).toEqual(['Bm7', 'C#m7b5', 'Dmaj7', 'Em7', 'F#m7', 'Gmaj7', 'A7']);
    expect(degreeChords(s).map((d) => d.triadNumeral)).toEqual(['i', 'ii°', '♭III', 'iv', 'v', '♭VI', '♭VII']);
  });

  it('builds B harmonic minor, with the V7 and the augmented III', () => {
    const s = scale(11, 'harmonicMinor');
    expect(sevenths(s)).toEqual(['BmMaj7', 'C#m7b5', 'Dmaj7#5', 'Em7', 'F#7', 'Gmaj7', 'A#dim7']);
    expect(degreeChords(s).map((d) => d.seventhNumeral)).toEqual(['i(maj7)', 'iiø7', '♭III+maj7', 'iv7', 'V7', '♭VImaj7', 'vii°7']);
  });

  it('spells flat keys with flats', () => {
    expect(sevenths(scale(5, 'naturalMinor'))).toEqual(['Fm7', 'Gm7b5', 'Abmaj7', 'Bbm7', 'Cm7', 'Dbmaj7', 'Eb7']);
  });

  it('has no degree chords for scales other than 7 notes', () => {
    expect(degreeChords(scale(0, 'pentaMinor'))).toEqual([]);
  });
});

describe('ii-V-I of a scale', () => {
  it('gives iiø7 V7 i in B minor', () => {
    const g = scaleTwoFiveOne(scale(11, 'naturalMinor'))!;
    expect(g.chords.map((c) => chordName(c, g.flats))).toEqual(['C#m7b5', 'F#7', 'Bm7']);
    expect(g.mode).toBe('minor');
  });

  it('gives ii V I in a major key', () => {
    const g = scaleTwoFiveOne(scale(10, 'major'))!;
    expect(g.chords.map((c) => chordName(c, g.flats))).toEqual(['Cm7', 'F7', 'Bbmaj7']);
  });

  it('has none for a scale without a perfect fifth', () => {
    expect(scaleTwoFiveOne(scale(0, 'locrian'))).toBeNull();
  });
});

describe('minor ii-V-i catalog', () => {
  it('lists the 12 minor keys', () => {
    const names = MINOR_TWO_FIVE_ONES.map((p) => p.chords.map((c) => chordName(c, p.flats)).join(' '));
    expect(names[0]).toBe('Dm7b5 G7 Cm7');
    expect(names).toContain('C#m7b5 F#7 Bm7');
    expect(names).toContain('Gm7b5 C7 Fm7');
    expect(names).toHaveLength(12);
  });
});
