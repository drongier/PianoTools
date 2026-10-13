import { onRawNoteEvent } from '../input/rawEvents';
import { Metronome } from './metronome';
import { Recorder } from './recorder';
import { useStudioStore } from './store';
import { DEFAULT_TRANSCRIPTION, defaultTakeName, type BeatsPerBar } from './take';

const metronome = new Metronome();

interface Session {
  recorder: Recorder;
  zeroTime: number;
  tempo: number;
  beatsPerBar: BeatsPerBar;
  unsubscribe: () => void;
  timer: number;
}

let session: Session | null = null;
let starting = false;
let cancelStart = false;

export function isRecordingActive(): boolean {
  return starting || session !== null;
}

/** Count-in bar, then record until stopRecording(). */
export async function startRecording(): Promise<void> {
  if (isRecordingActive()) return;
  const store = useStudioStore.getState();
  const { tempo, beatsPerBar, metronome: clicks } = store.transport;
  starting = true;
  cancelStart = false;
  store.setMessage(null);
  store.setStatus('countIn');
  try {
    const zeroTime = await metronome.start({ tempo, beatsPerBar, countInBars: 1, clickAfterCountIn: clicks });
    if (cancelStart) {
      metronome.stop();
      return;
    }
    const recorder = new Recorder({ tempo, beatsPerBar, zeroTime });
    const unsubscribe = onRawNoteEvent((e) => {
      if (e.type === 'on') recorder.noteOn(e.note, e.velocity, e.time);
      else if (e.type === 'off') recorder.noteOff(e.note, e.time);
      else recorder.sustain(e.down, e.time);
    });
    const timer = window.setTimeout(() => useStudioStore.getState().setStatus('recording'), Math.max(0, zeroTime - performance.now()));
    session = { recorder, zeroTime, tempo, beatsPerBar, unsubscribe, timer };
  } catch {
    metronome.stop();
    store.setStatus('idle');
    store.setMessage('Impossible de démarrer le métronome dans ce navigateur.');
  } finally {
    starting = false;
  }
}

/** Stops and saves the take. Stopping during the count-in keeps nothing. */
export function stopRecording(): void {
  const store = useStudioStore.getState();
  if (starting) {
    cancelStart = true;
    metronome.stop();
    store.setStatus('idle');
    return;
  }
  if (!session) return;
  const { recorder, zeroTime, tempo, beatsPerBar, unsubscribe, timer } = session;
  session = null;
  unsubscribe();
  window.clearTimeout(timer);
  metronome.stop();
  store.setStatus('idle');
  const now = performance.now();
  if (now <= zeroTime) return; // stopped during the count-in
  const recording = recorder.stop(now);
  if (!recording) {
    store.setMessage('Aucune note jouée : la prise n’a pas été gardée.');
    return;
  }
  store.addTake({
    id: crypto.randomUUID(),
    name: defaultTakeName(store.takes.length + 1, new Date()),
    createdAt: Date.now(),
    tempo,
    beatsPerBar,
    ...recording,
    settings: { ...DEFAULT_TRANSCRIPTION },
  });
}
