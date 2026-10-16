import { useMemo } from 'react';
import { pitchClassName } from '../music/notes';
import { SCALE_TYPES, scalePitchClasses } from '../music/scales';
import { useMusicStore, useTarget } from '../state/store';
import { Piano } from './Piano';

export function PianoModule() {
  const held = useMusicStore((s) => s.held);
  const hitNotes = useMusicStore((s) => s.hitNotes);
  const scale = useMusicStore((s) => s.scale);
  const scalePcs = useMemo(() => (scale ? scalePitchClasses(scale) : []), [scale]);
  const target = useTarget();
  return (
    <div className="piano-module">
      <Piano held={held} target={target?.notes ?? []} right={hitNotes} flats={target?.flats} scale={scalePcs} scaleRoot={scale?.root} />
    </div>
  );
}

/** Locked scale with a menu to switch its type, and a button to re-arm on the next chord. */
export function ScaleActions() {
  const scale = useMusicStore((s) => s.scale);
  const clearScale = useMusicStore((s) => s.clearScale);
  const setScaleType = useMusicStore((s) => s.setScaleType);
  return (
    <div className="scale-actions">
      {scale ? (
        <>
          <span className="scale-root">{pitchClassName(scale.root)}</span>
          <select className="scale-select" aria-label="Gamme" value={scale.type.id} onChange={(e) => setScaleType(e.target.value)}>
            {SCALE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </>
      ) : (
        <span>Joue un accord pour afficher sa gamme</span>
      )}
      <button className="text-button" onClick={clearScale} disabled={!scale}>Effacer</button>
    </div>
  );
}
