import { describe, expect, it } from 'vitest';
import { onRawNoteEvent, publishRawNoteEvent, type RawNoteEvent } from './rawEvents';

describe('raw note events', () => {
  it('delivers events to subscribers until they unsubscribe', () => {
    const seen: RawNoteEvent[] = [];
    const off = onRawNoteEvent((e) => seen.push(e));
    publishRawNoteEvent({ type: 'on', note: 60, velocity: 80, time: 10 });
    off();
    publishRawNoteEvent({ type: 'off', note: 60, time: 20 });
    expect(seen).toEqual([{ type: 'on', note: 60, velocity: 80, time: 10 }]);
  });
});
