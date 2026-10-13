/** Timestamped input events, for tools that need exact timing (the Studio recorder). */
export type RawNoteEvent =
  | { type: 'on'; note: number; velocity: number; time: number }
  | { type: 'off'; note: number; time: number }
  | { type: 'sustain'; down: boolean; time: number };

const listeners = new Set<(e: RawNoteEvent) => void>();

export function onRawNoteEvent(fn: (e: RawNoteEvent) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function publishRawNoteEvent(e: RawNoteEvent): void {
  for (const fn of listeners) fn(e);
}
