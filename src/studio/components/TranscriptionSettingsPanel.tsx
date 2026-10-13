import { noteNameWithOctave } from '../../music/notes';
import { useStudioStore } from '../store';
import type { Take } from '../take';

const SPLIT_NOTES = Array.from({ length: 25 }, (_, i) => 48 + i); // C3 to C5

export function TranscriptionSettingsPanel({ take }: { take: Take }) {
  const update = useStudioStore((s) => s.updateSettings);
  const s = take.settings;
  return (
    <div className="transcription-settings">
      <label className="field">
        <span>Grille</span>
        <select value={s.grid} onChange={(e) => update(take.id, { grid: Number(e.target.value) as 8 | 16 })}>
          <option value={16}>Double croche</option>
          <option value={8}>Croche</option>
        </select>
      </label>
      <label className="field field-check">
        <input type="checkbox" checked={s.triplets} onChange={(e) => update(take.id, { triplets: e.target.checked })} />
        <span>Triolets</span>
      </label>
      <label className="field">
        <span>Clé de sol à partir de</span>
        <select value={s.split} onChange={(e) => update(take.id, { split: Number(e.target.value) })}>
          {SPLIT_NOTES.map((n) => <option key={n} value={n}>{noteNameWithOctave(n)}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Altérations</span>
        <select value={s.flats ? 'flats' : 'sharps'} onChange={(e) => update(take.id, { flats: e.target.value === 'flats' })}>
          <option value="sharps">Dièses</option>
          <option value="flats">Bémols</option>
        </select>
      </label>
      <label className="field field-check">
        <input type="checkbox" checked={s.chordNames} onChange={(e) => update(take.id, { chordNames: e.target.checked })} />
        <span>Noms d’accords</span>
      </label>
    </div>
  );
}
