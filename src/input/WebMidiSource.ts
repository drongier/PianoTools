import type { NoteInput } from './NoteInput';

/**
 * Reads every connected MIDI input through the browser's Web MIDI API.
 * Supported in Chrome, Edge and Firefox; not in Safari. Needs HTTPS or localhost.
 * Resolves to a function that stops listening.
 */
export async function connectWebMidi(input: NoteInput): Promise<() => void> {
  const noop = () => {};
  if (!('requestMIDIAccess' in navigator)) {
    input.setStatus('Web MIDI non supporté par ce navigateur (essaie Chrome ou Firefox). Clavier d’ordinateur actif.');
    return noop;
  }

  let access: MIDIAccess;
  try {
    access = await navigator.requestMIDIAccess();
  } catch {
    input.setStatus('Accès MIDI refusé. Clavier d’ordinateur actif.');
    return noop;
  }

  const handleMessage = (event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 2) return;
    // MIDI events carry their own timestamp, in the performance.now() clock.
    const time = event.timeStamp > 0 ? event.timeStamp : performance.now();
    const command = data[0] & 0xf0;
    const d1 = data[1];
    const d2 = data.length > 2 ? data[2] : 0;
    if (command === 0x90 && d2 > 0) input.emitNoteOn(d1, d2, time);
    else if (command === 0x80 || (command === 0x90 && d2 === 0)) input.emitNoteOff(d1, time);
    else if (command === 0xb0 && d1 === 64) input.emitSustain(d2 >= 64, time);
  };

  const refresh = () => {
    const names: string[] = [];
    access.inputs.forEach((port) => {
      port.onmidimessage = handleMessage;
      names.push(port.name ?? 'MIDI');
    });
    input.setStatus(
      names.length > 0
        ? `MIDI connecté : ${names.join(', ')}`
        : 'Aucun appareil MIDI détecté. Branche ton piano (clavier d’ordinateur actif en attendant).',
    );
  };

  access.onstatechange = refresh;
  refresh();
  return () => {
    access.onstatechange = null;
    access.inputs.forEach((port) => { port.onmidimessage = null; });
  };
}
