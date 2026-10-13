/**
 * Single entry point for notes, whatever their source (MIDI keyboard,
 * computer keyboard, on-screen keys later). The game only listens here.
 * Times are in the performance.now() clock, in milliseconds.
 */
type NoteListener = (note: number, velocity: number, timeMs: number) => void;
type StatusListener = (status: string) => void;
type SustainListener = (down: boolean, timeMs: number) => void;

export class NoteInput {
  private readonly onListeners: NoteListener[] = [];
  private readonly offListeners: NoteListener[] = [];
  private readonly statusListeners: StatusListener[] = [];
  private readonly sustainListeners: SustainListener[] = [];
  status = 'Initialisation…';

  onNoteOn(fn: NoteListener): void { this.onListeners.push(fn); }
  onNoteOff(fn: NoteListener): void { this.offListeners.push(fn); }
  onStatus(fn: StatusListener): void { this.statusListeners.push(fn); fn(this.status); }
  onSustain(fn: SustainListener): void { this.sustainListeners.push(fn); }

  emitNoteOn(note: number, velocity: number, timeMs = performance.now()): void {
    for (const fn of this.onListeners) fn(note, velocity, timeMs);
  }
  emitNoteOff(note: number, timeMs = performance.now()): void {
    for (const fn of this.offListeners) fn(note, 0, timeMs);
  }
  emitSustain(down: boolean, timeMs = performance.now()): void {
    for (const fn of this.sustainListeners) fn(down, timeMs);
  }
  setStatus(status: string): void {
    this.status = status;
    for (const fn of this.statusListeners) fn(status);
  }
}
