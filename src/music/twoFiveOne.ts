import { findQuality, type Chord } from './chords';
import { pitchClassName, type PitchClass } from './notes';

export interface ChordGroup {
  id: string;
  /** Tonic name, spelled like the key ("Bb", not "A#"). */
  keyName: string;
  flats: boolean;
  /** Key of the progression, for the label: "en B mineur". */
  mode?: 'major' | 'minor';
  chords: Chord[];
}

/** Practice-sheet order: down a whole tone, then on through the keys. */
const KEY_ORDER: PitchClass[] = [0, 10, 8, 6, 4, 2, 11, 9, 7, 5, 3, 1];
/** Keys written with flats: F, Bb, Eb, Ab, Db, Gb. */
const FLAT_KEYS = new Set<PitchClass>([5, 10, 3, 8, 1, 6]);

const quality = (id: string) => findQuality(id)!;

function twoFiveOne(key: PitchClass): ChordGroup {
  const flats = FLAT_KEYS.has(key);
  return {
    id: `ii-V-I:${key}`,
    mode: 'major',
    keyName: pitchClassName(key, flats),
    flats,
    chords: [
      { root: (key + 2) % 12, quality: quality('min7') },
      { root: (key + 7) % 12, quality: quality('dom7') },
      { root: key, quality: quality('maj7') },
    ],
  };
}

/** The 12 major ii-V-I progressions, in the practice-sheet order. */
export const TWO_FIVE_ONES: readonly ChordGroup[] = KEY_ORDER.map(twoFiveOne);

/** Minor keys written with flats: D, G, C, F, Bb, Eb (relative of F, Bb, Eb, Ab, Db, Gb). */
const FLAT_MINOR_KEYS = new Set<PitchClass>([2, 7, 0, 5, 10, 3]);

/** iiø7 - V7 - im7: ii from the natural minor, V7 from the harmonic minor (raised leading tone). */
function minorTwoFiveOne(key: PitchClass): ChordGroup {
  const flats = FLAT_MINOR_KEYS.has(key);
  return {
    id: `ii-V-i:${key}`,
    mode: 'minor',
    keyName: pitchClassName(key, flats),
    flats,
    chords: [
      { root: (key + 2) % 12, quality: quality('m7b5') },
      { root: (key + 7) % 12, quality: quality('dom7') },
      { root: key, quality: quality('min7') },
    ],
  };
}

/** The 12 minor ii-V-i progressions, same practice order as the major ones. */
export const MINOR_TWO_FIVE_ONES: readonly ChordGroup[] = KEY_ORDER.map(minorTwoFiveOne);
