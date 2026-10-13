import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { chordCatalog, chordName, type Chord } from '../music/chords';
import { NOTE_NAMES } from '../music/notes';
import { TWO_FIVE_ONES, type ChordGroup } from '../music/twoFiveOne';
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

type Tab = 'all' | 'ii-V-I';

/** Chord sources for the score, one tab each. */
export function ChordPicker() {
  const [tab, setTab] = useState<Tab>('all');
  return (
    <div className="picker">
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'all'} className={`tab ${tab === 'all' ? 'is-active' : ''}`} onClick={() => setTab('all')}>
          Tous les accords
        </button>
        <button role="tab" aria-selected={tab === 'ii-V-I'} className={`tab ${tab === 'ii-V-I' ? 'is-active' : ''}`} onClick={() => setTab('ii-V-I')}>
          ii-V-I
        </button>
      </div>
      {tab === 'all' ? <AllChords /> : <TwoFiveOneList />}
    </div>
  );
}

/** ii-V-I in every major key, in the practice-sheet order. Drag or + adds the three chords. */
function TwoFiveOneList() {
  return (
    <ul className="picker-list scroll">
      {TWO_FIVE_ONES.map((group) => <GroupItem key={group.id} group={group} />)}
    </ul>
  );
}

function GroupItem({ group }: { group: ChordGroup }) {
  const addChords = useMusicStore((s) => s.addChords);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: group.id, data: { kind: 'group', group } });
  const names = group.chords.map((c) => chordName(c, group.flats));
  return (
    <li ref={setNodeRef} className={`picker-item group-item ${isDragging ? 'is-dragging' : ''}`} {...attributes} {...listeners}>
      <div className="group-main">
        <span className="group-chords">{names.join('  ')}</span>
        <span className="picker-label">ii-V-I en {group.keyName} majeur</span>
      </div>
      <button
        className="icon-button"
        onClick={() => addChords(group.chords, undefined, group.flats)}
        title="Ajouter au playground"
        aria-label={`Ajouter ${names.join(' ')} au playground`}
      >
        +
      </button>
    </li>
  );
}

/** Scrollable list of every chord. Click to show it on the piano, drag or + to add it to the score. */
function AllChords() {
  const [root, setRoot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const items = useMemo(() => {
    const q = normalizeQuery(query);
    return CATALOG.filter((c) => (root === null || c.root === root) && matches(c, q));
  }, [root, query]);

  return (
    <>
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
    </>
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
      <button className="icon-button" onClick={() => addChord(chord)} title="Ajouter au playground" aria-label={`Ajouter ${chordName(chord)} au playground`}>
        +
      </button>
    </li>
  );
}
