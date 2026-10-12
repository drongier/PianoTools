import { describe, expect, it } from 'vitest';
import { chordName } from './chords';
import { TWO_FIVE_ONES } from './twoFiveOne';

describe('ii-V-I catalog', () => {
  it('lists the 12 keys in the practice-sheet order, spelled like the sheet', () => {
    const names = TWO_FIVE_ONES.map((p) => p.chords.map((c) => chordName(c, p.flats)).join(' '));
    expect(names).toEqual([
      'Dm7 G7 Cmaj7',
      'Cm7 F7 Bbmaj7',
      'Bbm7 Eb7 Abmaj7',
      'Abm7 Db7 Gbmaj7',
      'F#m7 B7 Emaj7',
      'Em7 A7 Dmaj7',
      'C#m7 F#7 Bmaj7',
      'Bm7 E7 Amaj7',
      'Am7 D7 Gmaj7',
      'Gm7 C7 Fmaj7',
      'Fm7 Bb7 Ebmaj7',
      'Ebm7 Ab7 Dbmaj7',
    ]);
  });

  it('names each key', () => {
    expect(TWO_FIVE_ONES.map((p) => p.keyName)).toEqual(['C', 'Bb', 'Ab', 'Gb', 'E', 'D', 'B', 'A', 'G', 'F', 'Eb', 'Db']);
  });
});
