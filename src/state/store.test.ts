import { beforeEach, describe, expect, it } from 'vitest';
import { useMusicStore } from './store';

const C_MAJOR = [60, 64, 67];
const A_MINOR = [57, 60, 64];

beforeEach(() => {
  useMusicStore.setState({ played: null, history: [], selected: null, progression: { steps: [], active: 0 }, scale: null, hitNotes: [] });
});

describe('scale lock', () => {
  it('locks the scale of the first chord played', () => {
    useMusicStore.getState().chordPlayed(C_MAJOR);
    expect(useMusicStore.getState().scale).toMatchObject({ root: 0, type: { id: 'major' } });
  });

  it('keeps the scale while other chords are played', () => {
    const s = useMusicStore.getState();
    s.chordPlayed(C_MAJOR);
    s.chordPlayed(A_MINOR);
    expect(useMusicStore.getState().scale).toMatchObject({ root: 0, type: { id: 'major' } });
  });

  it('ignores unknown chords while armed', () => {
    useMusicStore.getState().chordPlayed([60, 61, 62]);
    expect(useMusicStore.getState().scale).toBeNull();
  });

  it('re-arms on clear: the next chord picks the new scale', () => {
    const s = useMusicStore.getState();
    s.chordPlayed(C_MAJOR);
    s.clearScale();
    expect(useMusicStore.getState().scale).toBeNull();
    s.chordPlayed(A_MINOR);
    expect(useMusicStore.getState().scale).toMatchObject({ root: 9, type: { id: 'naturalMinor' } });
  });

  it('changes the scale type on the same root', () => {
    const s = useMusicStore.getState();
    s.chordPlayed(A_MINOR);
    s.setScaleType('dorian');
    expect(useMusicStore.getState().scale).toMatchObject({ root: 9, type: { id: 'dorian' } });
  });

  it('ignores a scale type change when nothing is locked', () => {
    useMusicStore.getState().setScaleType('dorian');
    expect(useMusicStore.getState().scale).toBeNull();
  });
});
