import { useEffect } from 'react';
import { Piano } from '../modules/Piano';
import { useMusicStore } from '../state/store';
import { ScoreView } from '../studio/components/ScoreView';
import { TakeList } from '../studio/components/TakeList';
import { TranscriptionSettingsPanel } from '../studio/components/TranscriptionSettingsPanel';
import { TransportBar } from '../studio/components/TransportBar';
import { stopRecording } from '../studio/session';
import { useStudioStore } from '../studio/store';

/** Record improvisations on a click track and read them back as a score. */
export function StudioPage() {
  const takes = useStudioStore((s) => s.takes);
  const selectedId = useStudioStore((s) => s.selectedId);
  const message = useStudioStore((s) => s.message);
  const setMessage = useStudioStore((s) => s.setMessage);
  const held = useMusicStore((s) => s.held);
  const take = takes.find((t) => t.id === selectedId) ?? null;

  // Leaving the page ends a recording in progress, and keeps the take.
  useEffect(() => () => stopRecording(), []);

  return (
    <div className="studio">
      <TransportBar />
      {message && (
        <div className="banner" role="status">
          <span>{message}</span>
          <button className="icon-button" aria-label="Fermer le message" onClick={() => setMessage(null)}>×</button>
        </div>
      )}
      <div className="studio-body">
        <section className="panel studio-takes">
          <header className="panel-header"><span className="panel-title">Prises</span></header>
          <div className="panel-body"><TakeList /></div>
        </section>
        <section className="panel studio-score">
          <header className="panel-header"><span className="panel-title">{take ? take.name : 'Partition'}</span></header>
          <div className="panel-body">
            {take ? (
              <>
                <TranscriptionSettingsPanel take={take} />
                <ScoreView take={take} />
              </>
            ) : (
              <p className="empty">Enregistre une prise ou choisis-en une dans la liste pour voir sa partition.</p>
            )}
          </div>
        </section>
      </div>
      <div className="panel studio-piano">
        <div className="piano-module"><Piano held={held} /></div>
      </div>
    </div>
  );
}
