import { describe, expect, it } from 'vitest';
import { NoteInput } from './NoteInput';

describe('NoteInput timestamps', () => {
  it('passes the event time to note and sustain listeners', () => {
    const input = new NoteInput();
    const seen: string[] = [];
    input.onNoteOn((n, v, t) => seen.push(`on ${n} ${v} ${t}`));
    input.onNoteOff((n, _v, t) => seen.push(`off ${n} ${t}`));
    input.onSustain((d, t) => seen.push(`pedal ${d} ${t}`));
    input.emitNoteOn(60, 90, 1000);
    input.emitNoteOff(60, 1500);
    input.emitSustain(true, 1600);
    expect(seen).toEqual(['on 60 90 1000', 'off 60 1500', 'pedal true 1600']);
  });

  it('defaults the time to now', () => {
    const input = new NoteInput();
    let time = -1;
    input.onNoteOn((_n, _v, t) => { time = t; });
    const before = performance.now();
    input.emitNoteOn(60, 90);
    expect(time).toBeGreaterThanOrEqual(before);
  });
});
