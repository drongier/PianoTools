import { describe, expect, it } from 'vitest';
import { Recorder } from './recorder';

const make = () => new Recorder({ tempo: 60, beatsPerBar: 4, zeroTime: 10_000 });

describe('Recorder', () => {
  it('records notes relative to the first beat', () => {
    const r = make();
    r.noteOn(60, 90, 10_250);
    r.noteOff(60, 10_750);
    expect(r.stop(12_000)).toEqual({ notes: [{ pitch: 60, start: 250, end: 750, velocity: 90 }], pedal: [], bars: 1 });
  });

  it('moves an anticipation in the last half beat of the count-in to zero', () => {
    const r = make();
    r.noteOn(60, 90, 9_600);
    r.noteOff(60, 10_400);
    expect(r.stop(11_000)!.notes[0]).toMatchObject({ start: 0, end: 400 });
  });

  it('ignores notes started earlier in the count-in, and their release', () => {
    const r = make();
    r.noteOn(60, 90, 9_000);
    r.noteOff(60, 10_200);
    r.noteOn(64, 90, 10_000);
    expect(r.stop(11_000)!.notes.map((n) => n.pitch)).toEqual([64]);
  });

  it('closes held notes at stop and rounds up to whole bars', () => {
    const r = make();
    r.noteOn(60, 90, 10_000);
    const rec = r.stop(14_500)!;
    expect(rec.notes[0].end).toBe(4_500);
    expect(rec.bars).toBe(2);
  });

  it('closes the previous note when the same key is pressed again without release', () => {
    const r = make();
    r.noteOn(60, 90, 10_000);
    r.noteOn(60, 70, 10_500);
    r.noteOff(60, 11_000);
    expect(r.stop(12_000)!.notes).toEqual([
      { pitch: 60, start: 0, end: 500, velocity: 90 },
      { pitch: 60, start: 500, end: 1_000, velocity: 70 },
    ]);
  });

  it('keeps pedal changes after zero', () => {
    const r = make();
    r.sustain(true, 9_000);
    r.noteOn(60, 90, 10_000);
    r.sustain(true, 10_100);
    r.sustain(false, 10_900);
    expect(r.stop(11_000)!.pedal).toEqual([{ time: 100, down: true }, { time: 900, down: false }]);
  });

  it('returns null without notes, or when stopped during the count-in', () => {
    expect(make().stop(12_000)).toBeNull();
    const r = make();
    r.noteOn(60, 90, 9_800);
    expect(r.stop(9_900)).toBeNull();
  });
});
