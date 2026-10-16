import { useMemo } from 'react';
import { NOTE_NAMES } from '../music/notes';
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

/** Menus to pick the scale root and type, and a button to clear it and re-arm on the next chord. */
export function ScaleActions() {
  const scale = useMusicStore((s) => s.scale);
  const clearScale = useMusicStore((s) => s.clearScale);
  const setScaleType = useMusicStore((s) => s.setScaleType);
  const setScaleRoot = useMusicStore((s) => s.setScaleRoot);
  return (
    <div className="scale-actions">
      <select className="scale-select" aria-label="Tonique" value={scale?.root ?? ''} onChange={(e) => setScaleRoot(Number(e.target.value))}>
        {!scale && <option value="" disabled>—</option>}
        {NOTE_NAMES.map((name, pc) => <option key={pc} value={pc}>{name}</option>)}
      </select>
      {scale ? (
        <select className="scale-select" aria-label="Gamme" value={scale.type.id} onChange={(e) => setScaleType(e.target.value)}>
          {SCALE_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      ) : (
        <span>ou joue un accord</span>
      )}
      <button className="text-button" onClick={clearScale} disabled={!scale}>Effacer</button>
    </div>
  );
}
