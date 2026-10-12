import { useMusicStore, useTarget } from '../state/store';
import { Piano } from './Piano';

export function PianoModule() {
  const held = useMusicStore((s) => s.held);
  const hitNotes = useMusicStore((s) => s.hitNotes);
  const target = useTarget();
  return (
    <div className="piano-module">
      <Piano held={held} target={target?.notes ?? []} right={hitNotes} flats={target?.flats} />
    </div>
  );
}
