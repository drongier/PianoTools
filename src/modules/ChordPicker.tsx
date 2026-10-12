import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { chordCatalog, chordName, type Chord } from '../music/chords';
import { NOTE_NAMES } from '../music/notes';
import { useMusicStore } from '../state/store';

const CATALOG = chordCatalog();
const FLATS: Record<string, string> = { db: 'c#', eb: 'd#', gb: 'f#', ab: 'g#', bb: 'a#' };

export const catalogDragId = (c: Chord) => `catalog:${c.root}:${c.quality.id}`;

/** "Bbm7" → "a#m7" so flat spellings find the sharp-named chords. */
function normalizeQuery(query: string): string {
  const q = query.trim().toLowerCase();
  return FLATS[q.slice(0, 2)] ? FLATS[q.slice(0, 2)] + q.slice(2) : q;
}

function matches(chord: Chord, query: string): boolean {
  if (!query) return true;
  return chordName(chord).toLowerCase().startsWith(query) || chord.quality.label.toLowerCase().includes(query);
}

/** Scrollable list of every chord. Click to show it on the piano, drag or + to add it to the score. */
export function ChordPicker() {
  const [root, setRoot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const q = normalizeQuery(query);
    return CATALOG.filter((c) => (root === null || c.root === root) && matches(c, q));
  }, [root, query]);

  return (
    <div className="picker">
      <input
        className="picker-search"
        type="search"
        placeholder="Rechercher : Am7, sus4, mineur…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="picker-roots" role="group" aria-label="Filtrer par fondamentale">
        {[null, ...NOTE_NAMES.map((_, i) => i)].map((r) => (
          <button key={r ?? 'all'} className={`chip ${root === r ? 'is-active' : ''}`} onClick={() => setRoot(r)}>
            {r === null ? 'Toutes' : NOTE_NAMES[r]}
          </button>
        ))}
      </div>
      <ul className="picker-list scroll">
        {items.map((c) => <PickerItem key={catalogDragId(c)} chord={c} />)}
        {items.length === 0 && <li className="empty">Aucun accord trouvé.</li>}
      </ul>
    </div>
  );
}

function PickerItem({ chord }: { chord: Chord }) {
  const selected = useMusicStore((s) => s.selected?.root === chord.root && s.selected.quality.id === chord.quality.id);
  const toggleSelected = useMusicStore((s) => s.toggleSelected);
  const addChord = useMusicStore((s) => s.addChord);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: catalogDragId(chord),
    data: { kind: 'catalog', chord },
  });

  return (
    <li ref={setNodeRef} className={`picker-item ${selected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`} {...attributes} {...listeners}>
      <button className="picker-main" onClick={() => toggleSelected(chord)} title="Afficher sur le piano">
        <span className="picker-name">{chordName(chord)}</span>
        <span className="picker-label">{chord.quality.label}</span>
      </button>
      <button className="icon-button" onClick={() => addChord(chord)} title="Ajouter à la partition" aria-label={`Ajouter ${chordName(chord)} à la partition`}>
        +
      </button>
    </li>
  );
}
