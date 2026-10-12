import { chordName, chordPitchClasses, identifiedChordName } from '../music/chords';
import { NOTE_NAMES, noteNameWithOctave } from '../music/notes';
import { useMusicStore, useTargetChord } from '../state/store';

const INVERSION_LABELS = ['état fondamental', '1er renversement', '2e renversement', '3e renversement', 'neuvième à la basse'];

/** Big name of the last chord played, with its spelling and the current target. */
export function CurrentChord() {
  const played = useMusicStore((s) => s.played);
  const held = useMusicStore((s) => s.held);
  const lastHit = useMusicStore((s) => s.lastHit);
  const target = useTargetChord();

  let name = '—';
  let detail = 'Joue un accord';
  if (played?.chord) {
    const c = played.chord;
    name = identifiedChordName(c);
    const spelled = chordPitchClasses(c).map((pc) => NOTE_NAMES[pc]).join(' ');
    detail = `${NOTE_NAMES[c.root]} ${c.quality.label} · ${INVERSION_LABELS[c.inversion] ?? ''} · ${spelled}`;
  } else if (played) {
    name = '?';
    detail = `Accord inconnu : ${[...new Set(played.notes.map((n) => NOTE_NAMES[n % 12]))].join(' ')}`;
  }

  return (
    <div className="current-chord">
      {lastHit && <div key={lastHit.at} className="hit-flash" aria-hidden />}
      <div className="current-name">{name}</div>
      <div className="current-detail">{detail}</div>
      <div className="current-held">{held.map(noteNameWithOctave).join('  ')}</div>
      {target && (
        <div className="current-target">
          Cible : <strong>{chordName(target)}</strong>
        </div>
      )}
    </div>
  );
}
