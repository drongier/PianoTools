import type { NoteInput } from './NoteInput';

/**
 * Computer-keyboard fallback. Uses physical key positions (KeyboardEvent.code)
 * so it works on AZERTY and QWERTY alike: the home row plays white keys,
 * the row above plays black keys, like a piano.
 *   QWERTY:  A W S E D F T G Y H U J K    AZERTY:  Q Z S E D F T G Y H U J K
 */
const CODE_TO_OFFSET: Record<string, number> = {
  KeyA: 0, KeyW: 1, KeyS: 2, KeyE: 3, KeyD: 4, KeyF: 5, KeyT: 6,
  KeyG: 7, KeyY: 8, KeyH: 9, KeyU: 10, KeyJ: 11, KeyK: 12, KeyO: 13, KeyL: 14,
};

export function connectComputerKeyboard(input: NoteInput, baseNote = 60): () => void {
  const down = new Set<string>();

  const onDown = (e: KeyboardEvent) => {
    const offset = CODE_TO_OFFSET[e.code];
    if (offset === undefined || e.repeat || down.has(e.code)) return;
    down.add(e.code);
    input.emitNoteOn(baseNote + offset, 100);
  };
  const onUp = (e: KeyboardEvent) => {
    const offset = CODE_TO_OFFSET[e.code];
    if (offset === undefined || !down.delete(e.code)) return;
    input.emitNoteOff(baseNote + offset);
  };
  const releaseAll = () => {
    for (const code of down) input.emitNoteOff(baseNote + CODE_TO_OFFSET[code]);
    down.clear();
  };

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', releaseAll);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', releaseAll);
  };
}
