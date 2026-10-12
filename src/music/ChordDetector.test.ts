import { describe, expect, it } from 'vitest';
import { ChordDetector } from './ChordDetector';

function setup() {
  const d = new ChordDetector({ settleMs: 50 });
  const chords: number[][] = [];
  d.onChord = (n) => chords.push(n);
  return { d, chords };
}

describe('ChordDetector', () => {
  it('emits once the held set is stable', () => {
    const { d, chords } = setup();
    d.noteOn(60, 0);
    d.noteOn(64, 10);
    d.noteOn(67, 20);
    d.update(60);
    expect(chords).toEqual([]);
    d.update(70);
    expect(chords).toEqual([[60, 64, 67]]);
    d.update(200);
    expect(chords).toHaveLength(1);
  });

  it('does not emit with fewer than 3 notes', () => {
    const { d, chords } = setup();
    d.noteOn(60, 0);
    d.noteOn(64, 0);
    d.update(100);
    expect(chords).toEqual([]);
  });

  it('does not emit when fingers are lifted from a held chord', () => {
    const { d, chords } = setup();
    [60, 64, 67, 71].forEach((n) => d.noteOn(n, 0));
    d.update(100);
    d.noteOff(71, 150);
    d.update(300);
    expect(chords).toEqual([[60, 64, 67, 71]]);
  });

  it('emits the new chord when a key is added', () => {
    const { d, chords } = setup();
    [60, 64, 67].forEach((n) => d.noteOn(n, 0));
    d.update(100);
    d.noteOn(70, 150);
    d.update(250);
    expect(chords).toEqual([[60, 64, 67], [60, 64, 67, 70]]);
  });
});
