import { useEffect, useState } from 'react';
import { startRecording, stopRecording } from '../session';
import { clampTempo, useStudioStore } from '../store';
import type { BeatsPerBar } from '../take';

const METERS: BeatsPerBar[] = [4, 3, 2];
const REC_LABELS = { idle: '● Enregistrer', countIn: 'Décompte… (arrêter)', recording: '■ Arrêter' } as const;

export function TransportBar() {
  const transport = useStudioStore((s) => s.transport);
  const status = useStudioStore((s) => s.status);
  const setTransport = useStudioStore((s) => s.setTransport);
  const busy = status !== 'idle';
  const [tempoDraft, setTempoDraft] = useState(String(transport.tempo));
  useEffect(() => setTempoDraft(String(transport.tempo)), [transport.tempo]);

  const commitTempo = () => {
    const tempo = clampTempo(Number(tempoDraft));
    setTempoDraft(String(tempo));
    setTransport({ tempo });
  };

  return (
    <div className="transport">
      <label className="field">
        <span>Tempo</span>
        <input
          type="number"
          min={40}
          max={240}
          value={tempoDraft}
          disabled={busy}
          onChange={(e) => setTempoDraft(e.target.value)}
          onBlur={commitTempo}
          onKeyDown={(e) => e.key === 'Enter' && commitTempo()}
        />
      </label>
      <label className="field">
        <span>Mesure</span>
        <select value={transport.beatsPerBar} disabled={busy} onChange={(e) => setTransport({ beatsPerBar: Number(e.target.value) as BeatsPerBar })}>
          {METERS.map((m) => <option key={m} value={m}>{m}/4</option>)}
        </select>
      </label>
      <label className="field field-check">
        <input type="checkbox" checked={transport.metronome} disabled={busy} onChange={(e) => setTransport({ metronome: e.target.checked })} />
        <span>Métronome</span>
      </label>
      <button
        className={`rec-button is-${status}`}
        onClick={() => (status === 'idle' ? void startRecording() : stopRecording())}
      >
        {REC_LABELS[status]}
      </button>
    </div>
  );
}
