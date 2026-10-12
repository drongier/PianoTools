/**
 * Single entry point for notes, whatever their source (MIDI keyboard,
 * computer keyboard, on-screen keys later). The game only listens here.
 */
type NoteListener = (note: number, velocity: number) => void;
type StatusListener = (status: string) => void;

export class NoteInput {
  private readonly onListeners: NoteListener[] = [];
  private readonly offListeners: NoteListener[] = [];
  private readonly statusListeners: StatusListener[] = [];
  private readonly sustainListeners: ((down: boolean) => void)[] = [];
  status = 'Initialisation…';

  onNoteOn(fn: NoteListener): void { this.onListeners.push(fn); }
  onNoteOff(fn: NoteListener): void { this.offListeners.push(fn); }
  onStatus(fn: StatusListener): void { this.statusListeners.push(fn); fn(this.status); }
  onSustain(fn: (down: boolean) => void): void { this.sustainListeners.push(fn); }

  emitNoteOn(note: number, velocity: number): void {
    for (const fn of this.onListeners) fn(note, velocity);
  }
  emitNoteOff(note: number): void {
    for (const fn of this.offListeners) fn(note, 0);
  }
  emitSustain(down: boolean): void {
    for (const fn of this.sustainListeners) fn(down);
  }
  setStatus(status: string): void {
    this.status = status;
    for (const fn of this.statusListeners) fn(status);
  }
}
