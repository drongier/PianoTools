import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_FULL_MESSAGE, clampTempo, useStudioStore } from './store';
import { DEFAULT_TRANSCRIPTION, type Take } from './take';

const take = (id: string, extra: Partial<Take> = {}): Take => ({
  id, name: id, createdAt: 0, tempo: 90, beatsPerBar: 4, bars: 1,
  notes: [{ pitch: 60, start: 0, end: 500, velocity: 80 }], pedal: [], settings: { ...DEFAULT_TRANSCRIPTION }, ...extra,
});

beforeEach(() => {
  useStudioStore.setState({ takes: [], selectedId: null, status: 'idle', message: null, transport: { tempo: 90, beatsPerBar: 4, metronome: true } });
});

describe('studio store', () => {
  it('clamps the tempo', () => {
    expect(clampTempo(20)).toBe(40);
    expect(clampTempo(300)).toBe(240);
    expect(clampTempo(99.6)).toBe(100);
    expect(clampTempo(Number.NaN)).toBe(90);
  });

  it('adds takes newest first and selects the new one', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.addTake(take('b'));
    expect(useStudioStore.getState().takes.map((t) => t.id)).toEqual(['b', 'a']);
    expect(useStudioStore.getState().selectedId).toBe('b');
  });

  it('renames with a trimmed name and ignores empty names', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.renameTake('a', '  Idée blues  ');
    expect(useStudioStore.getState().takes[0].name).toBe('Idée blues');
    s.renameTake('a', '   ');
    expect(useStudioStore.getState().takes[0].name).toBe('Idée blues');
  });

  it('selects a neighbour when the selected take is deleted', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.addTake(take('b'));
    s.deleteTake('b');
    expect(useStudioStore.getState().selectedId).toBe('a');
    useStudioStore.getState().deleteTake('a');
    expect(useStudioStore.getState().selectedId).toBeNull();
  });

  it('updates one take settings without touching its tempo when the transport changes', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.updateSettings('a', { grid: 8, flats: true });
    s.setTransport({ tempo: 140 });
    const t = useStudioStore.getState().takes[0];
    expect(t.settings).toMatchObject({ grid: 8, flats: true, triplets: true });
    expect(t.tempo).toBe(90);
  });
});

describe('studio store storage', () => {
  const setLocalStorage = (descriptor: PropertyDescriptor) => Object.defineProperty(globalThis, 'localStorage', { configurable: true, ...descriptor });
  const removeLocalStorage = () => { delete (globalThis as { localStorage?: unknown }).localStorage; };

  it('keeps working when browser storage is blocked', () => {
    setLocalStorage({ get() { throw new Error('SecurityError: access denied'); } });
    try {
      expect(() => useStudioStore.getState().setMessage('ok')).not.toThrow();
      expect(useStudioStore.getState().message).toBe('ok');
    } finally {
      removeLocalStorage();
    }
  });

  it('tells the user when storage is full', async () => {
    setLocalStorage({ value: { getItem: () => null, removeItem: () => {}, setItem: () => { throw new DOMException('full', 'QuotaExceededError'); } } });
    try {
      useStudioStore.getState().addTake(take('a'));
      await Promise.resolve();
      expect(useStudioStore.getState().message).toBe(STORAGE_FULL_MESSAGE);
    } finally {
      removeLocalStorage();
    }
  });
});
