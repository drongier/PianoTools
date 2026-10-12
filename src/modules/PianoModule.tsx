import { chordVoicing } from '../music/chords';
import { useMusicStore, useTargetChord, useTargetFlats } from '../state/store';
import { Piano } from './Piano';

export function PianoModule() {
  const held = useMusicStore((s) => s.held);
  const hitNotes = useMusicStore((s) => s.hitNotes);
  const target = useTargetChord();
  const flats = useTargetFlats();
  return (
    <div className="piano-module">
      <Piano held={held} target={target ? chordVoicing(target) : []} right={hitNotes} flats={flats} />
    </div>
  );
}
