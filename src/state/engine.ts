import { NoteInput } from '../input/NoteInput';
import { connectWebMidi } from '../input/WebMidiSource';
import { connectComputerKeyboard } from '../input/KeyboardSource';
import { connectOctaveShortcuts } from '../input/shortcuts';
import { publishRawNoteEvent } from '../input/rawEvents';
import { routeFromHash } from '../routing';
import { ChordDetector } from '../music/ChordDetector';
import { useMusicStore } from './store';

/**
 * Wires note sources (MIDI + computer keyboard) to the chord detector and the
 * store. UI-independent: modules only read the store. Returns a cleanup.
 */
export function startEngine(): () => void {
  const store = useMusicStore.getState();
  const input = new NoteInput();
  const detector = new ChordDetector();

  input.onStatus(store.setStatus);
  input.onNoteOn((note, velocity, time) => {
    publishRawNoteEvent({ type: 'on', note, velocity, time });
    detector.noteOn(note, performance.now());
    store.setHeld(detector.heldNotes());
  });
  input.onNoteOff((note, _velocity, time) => {
    publishRawNoteEvent({ type: 'off', note, time });
    detector.noteOff(note, performance.now());
    store.setHeld(detector.heldNotes());
  });
  input.onSustain((down, time) => publishRawNoteEvent({ type: 'sustain', down, time }));
  detector.onChord = store.chordPlayed;

  let frame = 0;
  const tick = () => {
    detector.update(performance.now());
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  const disconnectKeyboard = connectComputerKeyboard(input);
  // W/X move the active Playground chord, which only exists on the Training page.
  const disconnectShortcuts = connectOctaveShortcuts((delta) => {
    if (routeFromHash(window.location.hash) === 'training') store.shiftActiveStepOctave(delta);
  });
  let disposed = false;
  let disconnectMidi = () => {};
  void connectWebMidi(input).then((disconnect) => {
    if (disposed) disconnect();
    else disconnectMidi = disconnect;
  });

  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    disconnectKeyboard();
    disconnectShortcuts();
    disconnectMidi();
  };
}
