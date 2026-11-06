import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { chordCatalog, chordName, type Chord } from '../music/chords';
import { NOTE_NAMES, pitchClassName } from '../music/notes';
import { degreeChords, scaleTwoFiveOne, scaleUsesFlats } from '../music/degrees';
import { scaleName, scalePitchClasses } from '../music/scales';
import { MINOR_TWO_FIVE_ONES, TWO_FIVE_ONES, type ChordGroup } from '../music/twoFiveOne';
import { useMusicStore } from '../state/store';
import { ScaleActions } from './PianoModule';

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

type Tab = 'all' | 'scale' | 'ii-V-I';

const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'Tous les accords' },
  { id: 'scale', label: 'Gamme' },
  { id: 'ii-V-I', label: 'ii-V-I' },
];

/** Chord sources for the score, one tab each. */
export function ChordPicker() {
  const [tab, setTab] = useState<Tab>('all');
  return (
    <div className="picker">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'is-active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'all' ? <AllChords /> : tab === 'scale' ? <ScaleDegrees /> : <TwoFiveOneList />}
    </div>
  );
}

/** ii-V-I in every major or minor key, in the practice-sheet order. Drag or + adds the three chords. */
function TwoFiveOneList() {
  const [minor, setMinor] = useState(false);
  return (
    <>
      <div className="picker-roots picker-modes" role="group" aria-label="Mode">
        <button className={`chip ${!minor ? 'is-active' : ''}`} onClick={() => setMinor(false)}>Majeur</button>
        <button className={`chip ${minor ? 'is-active' : ''}`} onClick={() => setMinor(true)}>Mineur</button>
      </div>
      <ul className="picker-list scroll">
        {(minor ? MINOR_TWO_FIVE_ONES : TWO_FIVE_ONES).map((group) => <GroupItem key={group.id} group={group} />)}
      </ul>
    </>
  );
}

function groupLabel(group: ChordGroup): string {
  return group.mode === 'minor' ? `ii-V-i en ${group.keyName} mineur` : `ii-V-I en ${group.keyName} majeur`;
}

/**
 * Chords on each degree of the scale picked in the Piano module, as triads and sevenths,
 * with the key's ii-V-I. Click shows a chord on the piano, drag or + adds it.
 */
function ScaleDegrees() {
  const scale = useMusicStore((s) => s.scale);
  const info = useMemo(() => {
    if (!scale) return null;
    const flats = scaleUsesFlats(scale);
    const cadence = scaleTwoFiveOne(scale);
    // The V7 of a minor ii-V-i needs the raised leading tone, missing from the natural minor.
    const leadingTone = (scale.root + 11) % 12;
    const borrowed = cadence?.mode === 'minor' && !scalePitchClasses(scale).includes(leadingTone);
    return { flats, cadence, borrowed, leadingTone, degrees: degreeChords(scale), name: scaleName(scale, flats) };
  }, [scale]);

  return (
    <div className="degrees scroll">
      <div className="degrees-scale">
        <ScaleActions />
      </div>
      {!info ? (
        <p className="empty">Choisis une tonique et une gamme, ou joue un accord.</p>
      ) : (
        <>
          {info.cadence && (
            <ul className="picker-list degrees-cadence">
              <GroupItem group={info.cadence} />
            </ul>
          )}
          {info.borrowed && info.cadence && (
            <p className="degrees-hint">
              Le V7 ({chordName(info.cadence.chords[1], info.flats)}) n’est pas dans la gamme : sa tierce{' '}
              {/* A leading tone is never spelled with a flat. */}
              <strong>{pitchClassName(info.leadingTone)}</strong> est la sensible, empruntée au mineur harmonique.
              Dans {info.name}, le v est mineur ({info.degrees[4]?.seventh ? chordName(info.degrees[4].seventh, info.flats) : '—'}).
            </p>
          )}
          {info.degrees.length === 0 ? (
            <p className="empty">Les accords par degré se construisent sur une gamme de 7 notes.</p>
          ) : (
            <table className="degrees-table">
              <thead>
                <tr><th aria-label="Degré" /><th>Triade</th><th>Septième</th></tr>
              </thead>
              <tbody>
                {info.degrees.map((d) => (
                  <tr key={d.degree}>
                    <td className="degree-number">{d.degree}</td>
                    <td><DegreeChord chord={d.triad} numeral={d.triadNumeral} flats={info.flats} /></td>
                    <td><DegreeChord chord={d.seventh} numeral={d.seventhNumeral} flats={info.flats} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

function DegreeChord({ chord, numeral, flats }: { chord: Chord | null; numeral: string; flats: boolean }) {
  if (!chord) return <span className="degree-numeral">{numeral}</span>;
  return <DegreeChordItem chord={chord} numeral={numeral} flats={flats} />;
}

function DegreeChordItem({ chord, numeral, flats }: { chord: Chord; numeral: string; flats: boolean }) {
  const selected = useMusicStore((s) => s.selected?.root === chord.root && s.selected.quality.id === chord.quality.id);
  const toggleSelected = useMusicStore((s) => s.toggleSelected);
  const addChords = useMusicStore((s) => s.addChords);
  const name = chordName(chord, flats);
  const group: ChordGroup = { id: `degree:${chord.root}:${chord.quality.id}`, keyName: name, flats, chords: [chord] };
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: group.id, data: { kind: 'group', group } });
  return (
    <div ref={setNodeRef} className={`picker-item degree-chord ${selected ? 'is-selected' : ''} ${isDragging ? 'is-dragging' : ''}`} {...attributes} {...listeners}>
      <button className="picker-main" onClick={() => toggleSelected(chord, flats)} title={`${chord.quality.label} · afficher sur le piano`}>
        <span className="degree-numeral">{numeral}</span>
        <span className="picker-name">{name}</span>
      </button>
      <button className="icon-button" onClick={() => addChords([chord], undefined, flats)} title="Ajouter au playground" aria-label={`Ajouter ${name} au playground`}>
        +
      </button>
    </div>
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
        <span className="picker-label">{groupLabel(group)}</span>
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
