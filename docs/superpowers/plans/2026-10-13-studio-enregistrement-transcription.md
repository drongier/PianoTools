# Studio : enregistrement et transcription — plan de développement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une page Studio qui enregistre le jeu MIDI sur un métronome et l'affiche en partition de piano, corrigeable par des réglages.

**Architecture:** Les entrées existantes publient des événements horodatés sur un petit bus. Le Studio les capte avec un enregistreur en logique pure, calé sur un métronome Web Audio. Une transcription en logique pure transforme une prise en modèle de partition, converti en texte ABC et dessiné par abcjs. Les prises vivent dans un store Zustand persistant. Une navigation par « # » sépare la page Entraînement de la page Studio.

**Tech Stack:** TypeScript, React 19, Vite 8, Vitest 5, Zustand 5, abcjs 6.7.1 (nouvelle dépendance), Web Audio API, Web MIDI API.

**Spec:** `docs/superpowers/specs/2026-10-13-studio-enregistrement-transcription-design.md`

## Global Constraints

- Aucune mention de Claude dans les messages de commit, ni ligne `Co-Authored-By`.
- Interface en français ; code, noms et commentaires en anglais, comme le reste du projet.
- Adresses : page Entraînement à `#/`, page Studio à `#/studio`.
- Tempo : 40 à 240, défaut 90. Mesures : 4/4, 3/4, 2/4, défaut 4/4. Métronome activé par défaut.
- Une mesure de décompte, toujours jouée. Anticipation acceptée : le dernier demi-temps du décompte.
- Réglages de transcription par défaut : grille double croche, triolets activés, séparation C4 (60, incluse en clé de sol), dièses, noms d'accords affichés.
- Stockage du Studio sous la clé `pianotools.studio.v1`.
- Les couleurs suivent les variables CSS existantes (`--text`, `--panel`, `--border`, etc.).
- La page Entraînement doit fonctionner exactement comme avant.
- Commandes de vérification : `npm test`, `npm run typecheck`, `npm run build`.

## Review Focus

- Arrêter pendant le décompte : aucune prise créée, métronome arrêté, pas d'erreur.
- Une même touche renvoyée deux fois sans relâchement (double note-on MIDI) : la première note est fermée, rien ne se perd ni ne se chevauche.
- Notes très brèves ou quasi simultanées (appogiatures, accords égrenés) : fusionnées en accord sur le même temps calé, jamais de durée nulle.
- Une portée sans aucune note : des silences de mesure entière, et un texte ABC valide.
- Une note qui finit après la dernière mesure, ou commence tout au bout : rien ne dépasse la dernière barre de mesure.

Chacun de ces cas a son test dans la tâche qui possède le code (tâches 3, 6 et 7).

---

## Fichiers

| Fichier | Rôle | Tâche |
|---|---|---|
| `src/input/NoteInput.ts` | transmet l'heure des notes et de la pédale | 1 |
| `src/input/WebMidiSource.ts`, `src/input/KeyboardSource.ts` | fournissent l'heure de l'événement | 1 |
| `src/input/rawEvents.ts` | bus d'événements horodatés | 1 |
| `src/state/engine.ts` | publie sur le bus ; raccourcis d'octave limités à l'Entraînement | 1, 2 |
| `src/routing.ts` | route courante d'après l'adresse | 2 |
| `src/dashboard/layout.ts` | disposition dans un petit store, pour le bouton de réinitialisation | 2 |
| `src/App.tsx` | barre du haut, onglets, choix de la page | 2 |
| `src/pages/TrainingPage.tsx` | page Entraînement, déplacée | 2 |
| `src/pages/StudioPage.tsx` | page Studio | 2, 9 |
| `src/studio/take.ts` | types d'une prise, réglages par défaut, nom par défaut | 3 |
| `src/studio/recorder.ts` | logique pure d'enregistrement | 3 |
| `src/studio/clock.ts`, `src/studio/metronome.ts` | métronome et conversion d'horloges | 4 |
| `src/studio/store.ts` | état du Studio, persistant | 5 |
| `src/studio/score.ts`, `src/studio/quantize.ts` | modèle de partition, calage | 6 |
| `src/studio/transcribe.ts` | prise vers modèle de partition | 7 |
| `src/studio/abc.ts` | modèle vers texte ABC | 8 |
| `src/studio/session.ts` | orchestration : métronome, enregistreur, store | 9 |
| `src/studio/components/*.tsx` | barre de transport, prises, réglages, partition | 9 |
| `src/styles.css` | styles des onglets et du Studio | 2, 9 |
| `README.md` | documentation du Studio | 10 |

---

### Task 1: Événements de note horodatés

**Files:**
- Modify: `src/input/NoteInput.ts`
- Modify: `src/input/WebMidiSource.ts`
- Modify: `src/input/KeyboardSource.ts`
- Create: `src/input/rawEvents.ts`
- Modify: `src/state/engine.ts`
- Test: `src/input/NoteInput.test.ts`, `src/input/rawEvents.test.ts`

**Interfaces:**
- Produces: `NoteInput.onNoteOn(fn: (note, velocity, timeMs) => void)`, `onNoteOff(fn: (note, velocity, timeMs) => void)`, `onSustain(fn: (down, timeMs) => void)` ; `emitNoteOn(note, velocity, timeMs?)`, `emitNoteOff(note, timeMs?)`, `emitSustain(down, timeMs?)`. Les heures sont dans l'horloge de `performance.now()`.
- Produces: `type RawNoteEvent`, `onRawNoteEvent(fn): () => void`, `publishRawNoteEvent(e): void` dans `src/input/rawEvents.ts`.

- [ ] **Step 1: Write the failing tests**

`src/input/NoteInput.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { NoteInput } from './NoteInput';

describe('NoteInput timestamps', () => {
  it('passes the event time to note and sustain listeners', () => {
    const input = new NoteInput();
    const seen: string[] = [];
    input.onNoteOn((n, v, t) => seen.push(`on ${n} ${v} ${t}`));
    input.onNoteOff((n, _v, t) => seen.push(`off ${n} ${t}`));
    input.onSustain((d, t) => seen.push(`pedal ${d} ${t}`));
    input.emitNoteOn(60, 90, 1000);
    input.emitNoteOff(60, 1500);
    input.emitSustain(true, 1600);
    expect(seen).toEqual(['on 60 90 1000', 'off 60 1500', 'pedal true 1600']);
  });

  it('defaults the time to now', () => {
    const input = new NoteInput();
    let time = -1;
    input.onNoteOn((_n, _v, t) => { time = t; });
    const before = performance.now();
    input.emitNoteOn(60, 90);
    expect(time).toBeGreaterThanOrEqual(before);
  });
});
```

`src/input/rawEvents.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { onRawNoteEvent, publishRawNoteEvent, type RawNoteEvent } from './rawEvents';

describe('raw note events', () => {
  it('delivers events to subscribers until they unsubscribe', () => {
    const seen: RawNoteEvent[] = [];
    const off = onRawNoteEvent((e) => seen.push(e));
    publishRawNoteEvent({ type: 'on', note: 60, velocity: 80, time: 10 });
    off();
    publishRawNoteEvent({ type: 'off', note: 60, time: 20 });
    expect(seen).toEqual([{ type: 'on', note: 60, velocity: 80, time: 10 }]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/input`
Expected: FAIL — `rawEvents` introuvable, et l'heure reçue vaut `undefined`.

- [ ] **Step 3: Implement**

Remplacer `src/input/NoteInput.ts` par :

```ts
/**
 * Single entry point for notes, whatever their source (MIDI keyboard,
 * computer keyboard, on-screen keys later). The game only listens here.
 * Times are in the performance.now() clock, in milliseconds.
 */
type NoteListener = (note: number, velocity: number, timeMs: number) => void;
type StatusListener = (status: string) => void;
type SustainListener = (down: boolean, timeMs: number) => void;

export class NoteInput {
  private readonly onListeners: NoteListener[] = [];
  private readonly offListeners: NoteListener[] = [];
  private readonly statusListeners: StatusListener[] = [];
  private readonly sustainListeners: SustainListener[] = [];
  status = 'Initialisation…';

  onNoteOn(fn: NoteListener): void { this.onListeners.push(fn); }
  onNoteOff(fn: NoteListener): void { this.offListeners.push(fn); }
  onStatus(fn: StatusListener): void { this.statusListeners.push(fn); fn(this.status); }
  onSustain(fn: SustainListener): void { this.sustainListeners.push(fn); }

  emitNoteOn(note: number, velocity: number, timeMs = performance.now()): void {
    for (const fn of this.onListeners) fn(note, velocity, timeMs);
  }
  emitNoteOff(note: number, timeMs = performance.now()): void {
    for (const fn of this.offListeners) fn(note, 0, timeMs);
  }
  emitSustain(down: boolean, timeMs = performance.now()): void {
    for (const fn of this.sustainListeners) fn(down, timeMs);
  }
  setStatus(status: string): void {
    this.status = status;
    for (const fn of this.statusListeners) fn(status);
  }
}
```

Créer `src/input/rawEvents.ts` :

```ts
/** Timestamped input events, for tools that need exact timing (the Studio recorder). */
export type RawNoteEvent =
  | { type: 'on'; note: number; velocity: number; time: number }
  | { type: 'off'; note: number; time: number }
  | { type: 'sustain'; down: boolean; time: number };

const listeners = new Set<(e: RawNoteEvent) => void>();

export function onRawNoteEvent(fn: (e: RawNoteEvent) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function publishRawNoteEvent(e: RawNoteEvent): void {
  for (const fn of listeners) fn(e);
}
```

Dans `src/input/WebMidiSource.ts`, remplacer le corps de `handleMessage` par :

```ts
  const handleMessage = (event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 2) return;
    // MIDI events carry their own timestamp, in the performance.now() clock.
    const time = event.timeStamp > 0 ? event.timeStamp : performance.now();
    const command = data[0] & 0xf0;
    const d1 = data[1];
    const d2 = data.length > 2 ? data[2] : 0;
    if (command === 0x90 && d2 > 0) input.emitNoteOn(d1, d2, time);
    else if (command === 0x80 || (command === 0x90 && d2 === 0)) input.emitNoteOff(d1, time);
    else if (command === 0xb0 && d1 === 64) input.emitSustain(d2 >= 64, time);
  };
```

Dans `src/input/KeyboardSource.ts`, passer l'heure de l'événement clavier :

```ts
    input.emitNoteOn(baseNote + offset, 100, e.timeStamp);
```

```ts
    input.emitNoteOff(baseNote + offset, e.timeStamp);
```

Dans `src/state/engine.ts`, ajouter l'import et publier sur le bus :

```ts
import { publishRawNoteEvent } from '../input/rawEvents';
```

```ts
  input.onNoteOn((note, velocity, time) => {
    publishRawNoteEvent({ type: 'on', note, velocity, time });
    detector.noteOn(note, performance.now());
    store.setHeld(detector.heldNotes());
  });
  input.onNoteOff((note, _velocity, time) => {
    publishRawNoteEvent({ type: 'off', note, time });
    detector.noteOff(note, performance.now());
    store.setHeld(detector.heldNotes());
  });
  input.onSustain((down, time) => publishRawNoteEvent({ type: 'sustain', down, time }));
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, aucune erreur de type.

- [ ] **Step 5: Commit**

```bash
git add src/input src/state/engine.ts
git commit -m "Timestamp note input events and publish them on a raw event bus"
```

---

### Task 2: Navigation entre les pages Entraînement et Studio

**Files:**
- Create: `src/routing.ts`, `src/routing.test.ts`
- Create: `src/pages/TrainingPage.tsx`, `src/pages/StudioPage.tsx`
- Modify: `src/dashboard/layout.ts`
- Modify: `src/App.tsx`
- Modify: `src/state/engine.ts`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `Dashboard`, `DEFAULT_LAYOUT`, `loadLayout`, `saveLayout` existants.
- Produces: `type Route = 'training' | 'studio'`, `routeFromHash(hash: string): Route`, `hashForRoute(route: Route): string`, `useRoute(): Route`.
- Produces: `useLayoutStore` avec `{ layout: Layout; setLayout(layout: Layout): void; reset(): void }`.
- Produces: `StudioPage` (contenu provisoire, rempli en tâche 9).

- [ ] **Step 1: Write the failing test**

`src/routing.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { hashForRoute, routeFromHash } from './routing';

describe('routing', () => {
  it('maps hashes to pages', () => {
    expect(routeFromHash('')).toBe('training');
    expect(routeFromHash('#/')).toBe('training');
    expect(routeFromHash('#/studio')).toBe('studio');
    expect(routeFromHash('#studio')).toBe('studio');
    expect(routeFromHash('#/studio?x=1')).toBe('studio');
    expect(routeFromHash('#/inconnu')).toBe('training');
  });
  it('builds hashes from pages', () => {
    expect(hashForRoute('training')).toBe('#/');
    expect(hashForRoute('studio')).toBe('#/studio');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routing.test.ts`
Expected: FAIL — module `./routing` introuvable.

- [ ] **Step 3: Implement routing**

`src/routing.ts` :

```ts
import { useSyncExternalStore } from 'react';

/** Pages of the app. Hash URLs so GitHub Pages never 404s on reload. */
export type Route = 'training' | 'studio';

export function routeFromHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split(/[/?]/)[0];
  return path === 'studio' ? 'studio' : 'training';
}

export function hashForRoute(route: Route): string {
  return route === 'studio' ? '#/studio' : '#/';
}

const subscribe = (onChange: () => void) => {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
};

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, () => routeFromHash(window.location.hash));
}
```

- [ ] **Step 4: Move the layout state into a store**

Ajouter à la fin de `src/dashboard/layout.ts` :

```ts
import { create } from 'zustand';

interface LayoutState {
  layout: Layout;
  setLayout: (layout: Layout) => void;
  reset: () => void;
}

/** Training-page layout, shared with the top bar's reset button. */
export const useLayoutStore = create<LayoutState>()((set) => ({
  layout: loadLayout(),
  setLayout: (layout) => {
    saveLayout(layout);
    set({ layout });
  },
  reset: () => {
    saveLayout(DEFAULT_LAYOUT);
    set({ layout: DEFAULT_LAYOUT });
  },
}));
```

Placer l'import `create` en tête du fichier avec les autres imports.

- [ ] **Step 5: Create the pages and the new App**

`src/pages/TrainingPage.tsx` reprend le glisser-déposer et la grille de l'ancien `App.tsx` :

```tsx
import { useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Dashboard } from '../dashboard/Dashboard';
import { useLayoutStore } from '../dashboard/layout';
import { PROGRESSION_DROP_ID } from '../modules/ProgressionModule';
import { chordName, type Chord } from '../music/chords';
import { stepName } from '../music/progression';
import type { ChordGroup } from '../music/twoFiveOne';
import { useMusicStore } from '../state/store';

type DragData = { kind: 'catalog'; chord: Chord } | { kind: 'group'; group: ChordGroup } | { kind: 'step' };

/** Steps reorder by closest card; chords from the list must be dropped onto the Playground. */
const collisionDetection: CollisionDetection = (args) => {
  if ((args.active.data.current as DragData | undefined)?.kind === 'step') {
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.id !== PROGRESSION_DROP_ID) });
  }
  return pointerWithin(args);
};

export function TrainingPage() {
  const layout = useLayoutStore((s) => s.layout);
  const setLayout = useLayoutStore((s) => s.setLayout);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = ({ active }: DragStartEvent) => {
    const data = active.data.current as DragData;
    if (data.kind === 'catalog') setDragLabel(chordName(data.chord));
    else if (data.kind === 'group') setDragLabel(data.group.chords.map((c) => chordName(c, data.group.flats)).join('  '));
    else {
      const step = useMusicStore.getState().progression.steps.find((s) => s.id === active.id);
      setDragLabel(step ? stepName(step) : null);
    }
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setDragLabel(null);
    if (!over) return;
    const { progression, addChord, addChords, moveStep } = useMusicStore.getState();
    const overIndex = progression.steps.findIndex((s) => s.id === over.id);
    const data = active.data.current as DragData;
    const index = overIndex >= 0 ? overIndex : over.id === PROGRESSION_DROP_ID ? undefined : null;
    if (data.kind === 'catalog') {
      if (index !== null) addChord(data.chord, index);
    } else if (data.kind === 'group') {
      if (index !== null) addChords(data.group.chords, index, data.group.flats);
    } else {
      const from = progression.steps.findIndex((s) => s.id === active.id);
      if (from >= 0 && overIndex >= 0 && from !== overIndex) moveStep(from, overIndex);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragLabel(null)}
    >
      <Dashboard layout={layout} onLayoutChange={setLayout} />
      <DragOverlay dropAnimation={null}>{dragLabel && <div className="drag-chip">{dragLabel}</div>}</DragOverlay>
    </DndContext>
  );
}
```

`src/pages/StudioPage.tsx`, provisoire :

```tsx
/** Recording and transcription page. Filled in by the Studio tasks. */
export function StudioPage() {
  return <div className="studio"><p className="empty">Studio</p></div>;
}
```

Remplacer `src/App.tsx` par :

```tsx
import { useEffect } from 'react';
import { useLayoutStore } from './dashboard/layout';
import { TrainingPage } from './pages/TrainingPage';
import { StudioPage } from './pages/StudioPage';
import { hashForRoute, useRoute, type Route } from './routing';
import { startEngine } from './state/engine';
import { useMusicStore } from './state/store';

const TABS: { route: Route; label: string }[] = [
  { route: 'training', label: 'Entraînement' },
  { route: 'studio', label: 'Studio' },
];

export function App() {
  const status = useMusicStore((s) => s.status);
  const resetLayout = useLayoutStore((s) => s.reset);
  const route = useRoute();

  useEffect(() => startEngine(), []);

  return (
    <>
      <header className="topbar">
        <h1>Piano Tools</h1>
        <nav className="page-tabs" aria-label="Pages">
          {TABS.map((t) => (
            <a key={t.route} href={hashForRoute(t.route)} className={`page-tab ${route === t.route ? 'is-active' : ''}`} aria-current={route === t.route ? 'page' : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
        <span className="topbar-status">{status}</span>
        {route === 'training' && <button className="text-button" onClick={resetLayout}>Réinitialiser la disposition</button>}
      </header>
      {route === 'training' ? <TrainingPage /> : <StudioPage />}
      <footer className="footer">Made by Damien Rongier</footer>
    </>
  );
}
```

- [ ] **Step 6: Limit octave shortcuts to the Training page**

Dans `src/state/engine.ts`, ajouter l'import et remplacer la ligne des raccourcis :

```ts
import { routeFromHash } from '../routing';
```

```ts
  // W/X move the active Playground chord, which only exists on the Training page.
  const disconnectShortcuts = connectOctaveShortcuts((delta) => {
    if (routeFromHash(window.location.hash) === 'training') store.shiftActiveStepOctave(delta);
  });
```

- [ ] **Step 7: Style the page tabs**

Ajouter à `src/styles.css`, après le bloc `.topbar-status` :

```css
.page-tabs { display: flex; gap: 4px; }
.page-tab {
  padding: 4px 10px;
  border-radius: 6px;
  color: var(--muted);
  font-size: 14px;
  text-decoration: none;
}
.page-tab:hover { color: var(--text); background: var(--panel-raised); }
.page-tab.is-active { color: var(--text); background: var(--accent-bg); }
```

- [ ] **Step 8: Run tests, typecheck and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "Add hash routing with Training and Studio pages"
```

---

### Task 3: Prise et enregistreur

**Files:**
- Create: `src/studio/take.ts`, `src/studio/recorder.ts`
- Test: `src/studio/take.test.ts`, `src/studio/recorder.test.ts`

**Interfaces:**
- Produces (`take.ts`) : `type BeatsPerBar = 2 | 3 | 4`, `interface RecordedNote { pitch; start; end; velocity }` (ms depuis l'instant zéro), `interface PedalChange { time; down }`, `interface TranscriptionSettings { grid: 8 | 16; triplets: boolean; split: number; flats: boolean; chordNames: boolean }`, `DEFAULT_TRANSCRIPTION`, `interface Take { id; name; createdAt; tempo; beatsPerBar; bars; notes; pedal; settings }`, `beatMs(tempo): number`, `defaultTakeName(n: number, date: Date): string`.
- Produces (`recorder.ts`) : `class Recorder` avec `constructor({ tempo, beatsPerBar, zeroTime })`, `noteOn(pitch, velocity, time)`, `noteOff(pitch, time)`, `sustain(down, time)`, `stop(time): Recording | null` ; `interface Recording { notes: RecordedNote[]; pedal: PedalChange[]; bars: number }`.

- [ ] **Step 1: Write the failing tests**

`src/studio/take.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { beatMs, defaultTakeName } from './take';

describe('take helpers', () => {
  it('computes the beat length', () => {
    expect(beatMs(60)).toBe(1000);
    expect(beatMs(120)).toBe(500);
  });
  it('names takes with their number and date', () => {
    expect(defaultTakeName(3, new Date(2026, 9, 13, 14, 5))).toBe('Prise 3 · 13 oct. 14:05');
  });
});
```

`src/studio/recorder.test.ts` (tempo 60 : un temps = 1000 ms ; instant zéro à 10 000 ms) :

```ts
import { describe, expect, it } from 'vitest';
import { Recorder } from './recorder';

const make = () => new Recorder({ tempo: 60, beatsPerBar: 4, zeroTime: 10_000 });

describe('Recorder', () => {
  it('records notes relative to the first beat', () => {
    const r = make();
    r.noteOn(60, 90, 10_250);
    r.noteOff(60, 10_750);
    expect(r.stop(12_000)).toEqual({ notes: [{ pitch: 60, start: 250, end: 750, velocity: 90 }], pedal: [], bars: 1 });
  });

  it('moves an anticipation in the last half beat of the count-in to zero', () => {
    const r = make();
    r.noteOn(60, 90, 9_600);
    r.noteOff(60, 10_400);
    expect(r.stop(11_000)!.notes[0]).toMatchObject({ start: 0, end: 400 });
  });

  it('ignores notes started earlier in the count-in, and their release', () => {
    const r = make();
    r.noteOn(60, 90, 9_000);
    r.noteOff(60, 10_200);
    r.noteOn(64, 90, 10_000);
    expect(r.stop(11_000)!.notes.map((n) => n.pitch)).toEqual([64]);
  });

  it('closes held notes at stop and rounds up to whole bars', () => {
    const r = make();
    r.noteOn(60, 90, 10_000);
    const rec = r.stop(14_500)!;
    expect(rec.notes[0].end).toBe(4_500);
    expect(rec.bars).toBe(2);
  });

  it('closes the previous note when the same key is pressed again without release', () => {
    const r = make();
    r.noteOn(60, 90, 10_000);
    r.noteOn(60, 70, 10_500);
    r.noteOff(60, 11_000);
    expect(r.stop(12_000)!.notes).toEqual([
      { pitch: 60, start: 0, end: 500, velocity: 90 },
      { pitch: 60, start: 500, end: 1_000, velocity: 70 },
    ]);
  });

  it('keeps pedal changes after zero', () => {
    const r = make();
    r.sustain(true, 9_000);
    r.noteOn(60, 90, 10_000);
    r.sustain(true, 10_100);
    r.sustain(false, 10_900);
    expect(r.stop(11_000)!.pedal).toEqual([{ time: 100, down: true }, { time: 900, down: false }]);
  });

  it('returns null without notes, or when stopped during the count-in', () => {
    expect(make().stop(12_000)).toBeNull();
    const r = make();
    r.noteOn(60, 90, 9_800);
    expect(r.stop(9_900)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/studio`
Expected: FAIL — modules introuvables.

- [ ] **Step 3: Implement**

`src/studio/take.ts` :

```ts
export type BeatsPerBar = 2 | 3 | 4;

/** A played note, in milliseconds from the first beat after the count-in. */
export interface RecordedNote {
  pitch: number;
  start: number;
  end: number;
  velocity: number;
}

export interface PedalChange {
  time: number;
  down: boolean;
}

/** How a take is turned into a score. Editable after recording. */
export interface TranscriptionSettings {
  /** Shortest binary value: 8 = eighth notes, 16 = sixteenth notes. */
  grid: 8 | 16;
  triplets: boolean;
  /** Lowest MIDI note written on the treble staff. */
  split: number;
  flats: boolean;
  chordNames: boolean;
}

export const DEFAULT_TRANSCRIPTION: TranscriptionSettings = {
  grid: 16,
  triplets: true,
  split: 60,
  flats: false,
  chordNames: true,
};

export interface Take {
  id: string;
  name: string;
  createdAt: number;
  tempo: number;
  beatsPerBar: BeatsPerBar;
  bars: number;
  notes: RecordedNote[];
  pedal: PedalChange[];
  settings: TranscriptionSettings;
}

export function beatMs(tempo: number): number {
  return 60_000 / tempo;
}

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "Prise 3 · 13 oct. 14:05" */
export function defaultTakeName(n: number, date: Date): string {
  const time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  return `Prise ${n} · ${date.getDate()} ${MONTHS[date.getMonth()]} ${time}`;
}
```

`src/studio/recorder.ts` :

```ts
import { beatMs, type PedalChange, type RecordedNote } from './take';

export interface RecorderOptions {
  tempo: number;
  beatsPerBar: number;
  /** performance.now() time of the first beat after the count-in. */
  zeroTime: number;
}

export interface Recording {
  notes: RecordedNote[];
  pedal: PedalChange[];
  bars: number;
}

/**
 * Collects timestamped notes into a take. Pure: times are passed in, so the
 * count-in, anticipation and stop rules are testable.
 */
export class Recorder {
  private readonly open = new Map<number, { start: number; velocity: number }>();
  private readonly notes: RecordedNote[] = [];
  private readonly pedal: PedalChange[] = [];

  constructor(private readonly options: RecorderOptions) {}

  noteOn(pitch: number, velocity: number, time: number): void {
    let start = time - this.options.zeroTime;
    // A note in the last half beat of the count-in is an anticipation of beat 1.
    if (start < -beatMs(this.options.tempo) / 2) return;
    start = Math.max(0, start);
    this.close(pitch, start);
    this.open.set(pitch, { start, velocity });
  }

  noteOff(pitch: number, time: number): void {
    this.close(pitch, Math.max(0, time - this.options.zeroTime));
  }

  sustain(down: boolean, time: number): void {
    const t = time - this.options.zeroTime;
    if (t >= 0) this.pedal.push({ time: t, down });
  }

  /** Ends the take. Null when nothing was played, or when stopped before beat 1. */
  stop(time: number): Recording | null {
    const end = time - this.options.zeroTime;
    if (end <= 0) return null;
    for (const pitch of [...this.open.keys()]) this.close(pitch, end);
    if (this.notes.length === 0) return null;
    const barMs = beatMs(this.options.tempo) * this.options.beatsPerBar;
    const last = Math.max(end, ...this.notes.map((n) => n.end));
    return {
      notes: [...this.notes].sort((a, b) => a.start - b.start || a.pitch - b.pitch),
      pedal: [...this.pedal],
      bars: Math.max(1, Math.ceil(last / barMs)),
    };
  }

  private close(pitch: number, end: number): void {
    const note = this.open.get(pitch);
    if (!note) return;
    this.open.delete(pitch);
    this.notes.push({ pitch, start: note.start, end: Math.max(end, note.start), velocity: note.velocity });
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/studio`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/studio
git commit -m "Add Studio take model and recorder"
```

---

### Task 4: Métronome et conversion d'horloges

**Files:**
- Create: `src/studio/clock.ts`, `src/studio/metronome.ts`
- Test: `src/studio/clock.test.ts`

**Interfaces:**
- Produces: `audioToPerformanceMs(stamp: { contextTime: number; performanceTime: number }, audioTime: number, outputLatencySec?: number): number`.
- Produces: `class Metronome` avec `start(o: { tempo: number; beatsPerBar: number; countInBars: number; clickAfterCountIn: boolean }): Promise<number>` qui renvoie l'heure `performance.now()` du premier temps après le décompte, et `stop(): void`.

- [ ] **Step 1: Write the failing test**

`src/studio/clock.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { audioToPerformanceMs } from './clock';

describe('audioToPerformanceMs', () => {
  it('maps audio time onto the performance clock', () => {
    expect(audioToPerformanceMs({ contextTime: 2, performanceTime: 5_000 }, 3)).toBe(6_000);
  });
  it('adds the output latency: a click is heard after it is scheduled', () => {
    expect(audioToPerformanceMs({ contextTime: 2, performanceTime: 5_000 }, 3, 0.02)).toBe(6_020);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/studio/clock.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implement**

`src/studio/clock.ts` :

```ts
/**
 * Converts an AudioContext time (seconds) to the performance.now() clock (ms),
 * from a matching pair of timestamps. The output latency is when the sound
 * actually reaches the ears, which is what the player follows.
 */
export function audioToPerformanceMs(
  stamp: { contextTime: number; performanceTime: number },
  audioTime: number,
  outputLatencySec = 0,
): number {
  return stamp.performanceTime + (audioTime - stamp.contextTime + outputLatencySec) * 1000;
}
```

`src/studio/metronome.ts` :

```ts
import { audioToPerformanceMs } from './clock';

export interface MetronomeStart {
  tempo: number;
  beatsPerBar: number;
  countInBars: number;
  /** Keep clicking after the count-in. */
  clickAfterCountIn: boolean;
}

const LOOKAHEAD_SEC = 0.12;
const TICK_MS = 25;

/** Click track on the Web Audio clock, scheduled slightly ahead so it never drifts. */
export class Metronome {
  private ctx: AudioContext | null = null;
  private timer = 0;

  /** Starts clicking; resolves with the performance.now() time of the first beat after the count-in. */
  async start(o: MetronomeStart): Promise<number> {
    this.stop();
    const ctx = (this.ctx ??= new AudioContext());
    await ctx.resume();
    const beat = 60 / o.tempo;
    const countInBeats = o.countInBars * o.beatsPerBar;
    const startAt = ctx.currentTime + 0.1;
    let index = 0;
    let next = startAt;
    const schedule = () => {
      while (next < ctx.currentTime + LOOKAHEAD_SEC) {
        if (index < countInBeats || o.clickAfterCountIn) this.click(ctx, next, index % o.beatsPerBar === 0);
        index++;
        next += beat;
      }
    };
    schedule();
    this.timer = window.setInterval(schedule, TICK_MS);
    return audioToPerformanceMs(outputStamp(ctx), startAt + countInBeats * beat, ctx.outputLatency || 0);
  }

  stop(): void {
    window.clearInterval(this.timer);
    this.timer = 0;
  }

  private click(ctx: AudioContext, time: number, accent: boolean): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1000;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.06);
  }
}

/** A matching (audio time, performance time) pair; falls back to "now" before audio output starts. */
function outputStamp(ctx: AudioContext): { contextTime: number; performanceTime: number } {
  const stamp = ctx.getOutputTimestamp();
  if (stamp.contextTime && stamp.performanceTime) return { contextTime: stamp.contextTime, performanceTime: stamp.performanceTime };
  return { contextTime: ctx.currentTime, performanceTime: performance.now() };
}
```

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run src/studio && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/studio
git commit -m "Add Web Audio metronome aligned with the input clock"
```

---

### Task 5: État du Studio

**Files:**
- Create: `src/studio/store.ts`
- Test: `src/studio/store.test.ts`

**Interfaces:**
- Consumes: `Take`, `BeatsPerBar`, `TranscriptionSettings` (tâche 3).
- Produces: `useStudioStore` avec l'état `{ transport: { tempo; beatsPerBar; metronome }; takes: Take[]; selectedId: string | null; status: 'idle' | 'countIn' | 'recording'; message: string | null }` et les actions `setTransport(p)`, `setStatus(s)`, `setMessage(m)`, `addTake(take)`, `renameTake(id, name)`, `deleteTake(id)`, `selectTake(id)`, `updateSettings(id, p)`. Produces aussi `clampTempo(n: number): number`, `STORAGE_FULL_MESSAGE`.

- [ ] **Step 1: Write the failing tests**

`src/studio/store.test.ts` :

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { clampTempo, useStudioStore } from './store';
import { DEFAULT_TRANSCRIPTION, type Take } from './take';

const take = (id: string, extra: Partial<Take> = {}): Take => ({
  id, name: id, createdAt: 0, tempo: 90, beatsPerBar: 4, bars: 1,
  notes: [{ pitch: 60, start: 0, end: 500, velocity: 80 }], pedal: [], settings: { ...DEFAULT_TRANSCRIPTION }, ...extra,
});

beforeEach(() => {
  useStudioStore.setState({ takes: [], selectedId: null, status: 'idle', message: null, transport: { tempo: 90, beatsPerBar: 4, metronome: true } });
});

describe('studio store', () => {
  it('clamps the tempo', () => {
    expect(clampTempo(20)).toBe(40);
    expect(clampTempo(300)).toBe(240);
    expect(clampTempo(99.6)).toBe(100);
    expect(clampTempo(Number.NaN)).toBe(90);
  });

  it('adds takes newest first and selects the new one', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.addTake(take('b'));
    expect(useStudioStore.getState().takes.map((t) => t.id)).toEqual(['b', 'a']);
    expect(useStudioStore.getState().selectedId).toBe('b');
  });

  it('renames with a trimmed name and ignores empty names', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.renameTake('a', '  Idée blues  ');
    expect(useStudioStore.getState().takes[0].name).toBe('Idée blues');
    s.renameTake('a', '   ');
    expect(useStudioStore.getState().takes[0].name).toBe('Idée blues');
  });

  it('selects a neighbour when the selected take is deleted', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.addTake(take('b'));
    s.deleteTake('b');
    expect(useStudioStore.getState().selectedId).toBe('a');
    useStudioStore.getState().deleteTake('a');
    expect(useStudioStore.getState().selectedId).toBeNull();
  });

  it('updates one take settings without touching its tempo when the transport changes', () => {
    const s = useStudioStore.getState();
    s.addTake(take('a'));
    s.updateSettings('a', { grid: 8, flats: true });
    s.setTransport({ tempo: 140 });
    const t = useStudioStore.getState().takes[0];
    expect(t.settings).toMatchObject({ grid: 8, flats: true, triplets: true });
    expect(t.tempo).toBe(90);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/studio/store.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implement**

`src/studio/store.ts` :

```ts
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { BeatsPerBar, Take, TranscriptionSettings } from './take';

export interface Transport {
  tempo: number;
  beatsPerBar: BeatsPerBar;
  metronome: boolean;
}

export type RecordingStatus = 'idle' | 'countIn' | 'recording';

export const STORAGE_FULL_MESSAGE = 'Plus de place pour sauvegarder les prises dans le navigateur. Supprime d’anciennes prises : la dernière reste disponible tant que la page est ouverte.';

interface StudioState {
  transport: Transport;
  takes: Take[];
  selectedId: string | null;
  status: RecordingStatus;
  message: string | null;

  setTransport: (patch: Partial<Transport>) => void;
  setStatus: (status: RecordingStatus) => void;
  setMessage: (message: string | null) => void;
  addTake: (take: Take) => void;
  renameTake: (id: string, name: string) => void;
  deleteTake: (id: string) => void;
  selectTake: (id: string) => void;
  updateSettings: (id: string, patch: Partial<TranscriptionSettings>) => void;
}

export function clampTempo(n: number): number {
  return Number.isFinite(n) ? Math.round(Math.min(240, Math.max(40, n))) : 90;
}

/** localStorage that reports a full quota instead of throwing. */
const safeStorage: StateStorage = {
  getItem: (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    if (typeof localStorage === 'undefined') return; // tests, or storage disabled
    try {
      localStorage.setItem(key, value);
    } catch {
      // Only set the message once: setting state triggers another save.
      if (useStudioStore.getState().message !== STORAGE_FULL_MESSAGE) {
        queueMicrotask(() => useStudioStore.setState({ message: STORAGE_FULL_MESSAGE }));
      }
    }
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      transport: { tempo: 90, beatsPerBar: 4, metronome: true },
      takes: [],
      selectedId: null,
      status: 'idle',
      message: null,

      setTransport: (patch) => set({ transport: { ...get().transport, ...patch } }),
      setStatus: (status) => set({ status }),
      setMessage: (message) => set({ message }),
      addTake: (take) => set({ takes: [take, ...get().takes], selectedId: take.id }),
      renameTake: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({ takes: get().takes.map((t) => (t.id === id ? { ...t, name: trimmed } : t)) });
      },
      deleteTake: (id) => {
        const { takes, selectedId } = get();
        const index = takes.findIndex((t) => t.id === id);
        const rest = takes.filter((t) => t.id !== id);
        const nextSelected = selectedId === id ? (rest[Math.min(index, rest.length - 1)]?.id ?? null) : selectedId;
        set({ takes: rest, selectedId: nextSelected });
      },
      selectTake: (id) => set({ selectedId: id }),
      updateSettings: (id, patch) =>
        set({ takes: get().takes.map((t) => (t.id === id ? { ...t, settings: { ...t.settings, ...patch } } : t)) }),
    }),
    {
      name: 'pianotools.studio.v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ transport: s.transport, takes: s.takes, selectedId: s.selectedId }),
    },
  ),
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/studio && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/studio
git commit -m "Add persistent Studio store for takes and transport"
```

---

### Task 6: Modèle de partition et calage sur la grille

**Files:**
- Create: `src/studio/score.ts`, `src/studio/quantize.ts`
- Test: `src/studio/quantize.test.ts`

**Interfaces:**
- Consumes: `Take`, `beatMs` (tâche 3).
- Produces (`score.ts`) : `TICKS_PER_BEAT = 12` ; `interface ScoreEvent { pitches: number[]; start: number; ticks: number; triplet: boolean; tie: boolean; chordName?: string }` (`start` relatif à la mesure, `ticks` durée réelle : croche de triolet = 4) ; `interface ScoreMeasure { treble: ScoreEvent[]; bass: ScoreEvent[] }` ; `interface Score { title: string; tempo: number; beatsPerBar: number; flats: boolean; measures: ScoreMeasure[] }`.
- Produces (`quantize.ts`) : `interface QuantizedNote { pitch: number; start: number; end: number }` (ticks depuis le début) ; `interface Quantized { notes: QuantizedNote[]; tripletBeats: Set<number>; totalTicks: number }` ; `prefersTriplet(positions: number[], binary: number): boolean` ; `quantize(take: Pick<Take, 'tempo' | 'beatsPerBar' | 'bars' | 'notes'>, grid: 8 | 16, triplets: boolean): Quantized`.

Une noire vaut 12 ticks : une double croche 3, une croche 6, une croche de triolet 4.

- [ ] **Step 1: Write the failing tests**

`src/studio/quantize.test.ts` (tempo 60 : un temps = 1000 ms) :

```ts
import { describe, expect, it } from 'vitest';
import { prefersTriplet, quantize } from './quantize';
import type { RecordedNote } from './take';

const n = (pitch: number, start: number, end: number): RecordedNote => ({ pitch, start, end, velocity: 80 });
const take = (notes: RecordedNote[], bars = 1) => ({ tempo: 60, beatsPerBar: 4 as const, bars, notes });
const starts = (q: ReturnType<typeof quantize>) => q.notes.map((x) => x.start);

describe('prefersTriplet', () => {
  it('keeps binary when it fits, picks triplets when clearly better', () => {
    expect(prefersTriplet([0, 0.25, 0.5, 0.75], 4)).toBe(false);
    expect(prefersTriplet([0, 1 / 3, 2 / 3], 4)).toBe(true);
    expect(prefersTriplet([0], 4)).toBe(false);
    expect(prefersTriplet([0, 0.62], 4)).toBe(true); // swung eighths, notated as played
  });
});

describe('quantize', () => {
  it('snaps slightly off sixteenths onto the sixteenth grid', () => {
    const q = quantize(take([n(60, 0, 200), n(62, 270, 450), n(64, 480, 700), n(65, 760, 950)]), 16, true);
    expect(starts(q)).toEqual([0, 3, 6, 9]);
    expect(q.tripletBeats.size).toBe(0);
  });

  it('recognises played triplets', () => {
    const q = quantize(take([n(60, 0, 300), n(62, 340, 640), n(64, 660, 1000)]), 16, true);
    expect(starts(q)).toEqual([0, 4, 8]);
    expect([...q.tripletBeats]).toEqual([0]);
  });

  it('stays binary when triplets are off', () => {
    const q = quantize(take([n(60, 0, 300), n(62, 340, 640), n(64, 660, 1000)]), 16, false);
    expect(starts(q)).toEqual([0, 3, 9]);
  });

  it('uses the eighth grid when asked', () => {
    expect(starts(quantize(take([n(60, 260, 500)]), 8, false))).toEqual([6]);
  });

  it('snaps a note played just before a beat onto that beat', () => {
    expect(starts(quantize(take([n(60, 980, 1500)]), 16, true))).toEqual([12]);
  });

  it('snaps ends and never makes a note shorter than one grid step', () => {
    const q = quantize(take([n(60, 0, 480), n(64, 1000, 1010)]), 16, true);
    expect(q.notes.map((x) => [x.start, x.end])).toEqual([[0, 6], [12, 15]]);
  });

  it('keeps everything inside the last bar', () => {
    const q = quantize(take([n(60, 3990, 6000)]), 16, true);
    expect(q.totalTicks).toBe(48);
    expect(q.notes[0].start).toBeLessThan(48);
    expect(q.notes[0].end).toBe(48);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/studio/quantize.test.ts`
Expected: FAIL — module introuvable.

- [ ] **Step 3: Implement**

`src/studio/score.ts` :

```ts
/** Ticks per quarter note: divisible by 4 (sixteenths) and 3 (triplet eighths). */
export const TICKS_PER_BEAT = 12;

export interface ScoreEvent {
  /** MIDI pitches, low to high; empty for a rest. */
  pitches: number[];
  /** Start in ticks from the beginning of the measure. */
  start: number;
  /** Real length in ticks: a sixteenth is 3, a triplet eighth 4. */
  ticks: number;
  triplet: boolean;
  /** Tied to the next event of the same staff. */
  tie: boolean;
  /** Chord symbol written above this event (treble staff only). */
  chordName?: string;
}

export interface ScoreMeasure {
  treble: ScoreEvent[];
  bass: ScoreEvent[];
}

/** Renderer-independent score, so it can later be exported to MusicXML too. */
export interface Score {
  title: string;
  tempo: number;
  beatsPerBar: number;
  flats: boolean;
  measures: ScoreMeasure[];
}
```

`src/studio/quantize.ts` :

```ts
import { TICKS_PER_BEAT as T } from './score';
import { beatMs, type Take } from './take';

export interface QuantizedNote {
  pitch: number;
  /** Ticks from the start of the take. */
  start: number;
  end: number;
}

export interface Quantized {
  notes: QuantizedNote[];
  /** Beats written as triplets. */
  tripletBeats: Set<number>;
  totalTicks: number;
}

/**
 * Whether triplets fit these onsets (positions within a beat, 0..1) clearly
 * better than the binary grid. Binary wins any doubt, to avoid stray triplets.
 */
export function prefersTriplet(positions: number[], binary: number): boolean {
  const error = (steps: number) => positions.reduce((sum, x) => sum + Math.abs(x - Math.round(x * steps) / steps), 0);
  const binaryError = error(binary);
  const tripletError = error(3);
  return tripletError < binaryError * 0.6 && binaryError - tripletError > 0.02 * positions.length;
}

/** Snaps note starts and ends to a grid chosen beat by beat. */
export function quantize(take: Pick<Take, 'tempo' | 'beatsPerBar' | 'bars' | 'notes'>, grid: 8 | 16, triplets: boolean): Quantized {
  const beatLength = beatMs(take.tempo);
  const binary = grid === 16 ? 4 : 2;
  const totalBeats = take.bars * take.beatsPerBar;
  const totalTicks = totalBeats * T;
  const clampBeat = (b: number) => Math.min(totalBeats - 1, Math.max(0, b));

  // An onset belongs to the beat whose grid it is closest to: one played a hair early counts for the next beat.
  const located = take.notes.map((note) => {
    const u = note.start / beatLength;
    const beat = clampBeat(Math.floor(u + 1 / (2 * binary)));
    return { note, beat, x: u - beat };
  });

  const tripletBeats = new Set<number>();
  if (triplets) {
    const byBeat = new Map<number, number[]>();
    for (const { beat, x } of located) byBeat.set(beat, [...(byBeat.get(beat) ?? []), x]);
    for (const [beat, xs] of byBeat) if (prefersTriplet(xs, binary)) tripletBeats.add(beat);
  }

  const steps = (beat: number) => (tripletBeats.has(beat) ? 3 : binary);
  const snap = (beat: number, x: number) => beat * T + Math.round(x * steps(beat)) * (T / steps(beat));

  const notes = located.map(({ note, beat, x }) => {
    const step = T / steps(beat);
    const start = Math.min(snap(beat, x), totalTicks - step);
    const endBeats = note.end / beatLength;
    const endBeat = clampBeat(Math.floor(endBeats));
    let end = Math.min(snap(endBeat, endBeats - endBeat), totalTicks);
    if (end <= start) end = Math.min(start + T / steps(Math.floor(start / T)), totalTicks);
    return { pitch: note.pitch, start, end };
  });

  return { notes, tripletBeats, totalTicks };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/studio && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/studio
git commit -m "Add score model and beat-by-beat quantization"
```

---

### Task 7: Transcription en modèle de partition

**Files:**
- Modify: `src/music/chords.ts` (option bémols pour `identifiedChordName`)
- Modify: `src/music/chords.test.ts`
- Create: `src/studio/transcribe.ts`
- Test: `src/studio/transcribe.test.ts`

**Interfaces:**
- Consumes: `quantize`, `QuantizedNote` (tâche 6), `Take` (tâche 3), `identifyChord`.
- Produces: `identifiedChordName(chord, flats = false)` ; `staffSegments(notes: QuantizedNote[], total: number): Segment[]` avec `interface Segment { start: number; end: number; pitches: number[] }` ; `noteValues(start: number, length: number, barTicks: number, allowDotted: boolean): number[]` ; `chordNamesByTick(notes: QuantizedNote[], totalBeats: number, flats: boolean): Map<number, string>` ; `transcribe(take: Take): Score`.

- [ ] **Step 1: Write the failing tests**

Ajouter à `src/music/chords.test.ts` :

```ts
describe('identifiedChordName with flats', () => {
  it('spells root and bass with flats when asked', () => {
    const c = identifyChord([46, 50, 53, 56])!; // Bb7 in root position
    expect(identifiedChordName(c)).toBe('A#7');
    expect(identifiedChordName(c, true)).toBe('Bb7');
    expect(identifiedChordName(identifyChord([51, 55, 58, 61])!, true)).toBe('Eb7');
  });
});
```

`src/studio/transcribe.test.ts` (tempo 60, 4/4 : un temps = 1000 ms = 12 ticks, une mesure = 48 ticks) :

```ts
import { describe, expect, it } from 'vitest';
import { noteValues, transcribe } from './transcribe';
import type { Score, ScoreEvent } from './score';
import { DEFAULT_TRANSCRIPTION, type RecordedNote, type Take, type TranscriptionSettings } from './take';

const n = (pitch: number, start: number, end: number): RecordedNote => ({ pitch, start, end, velocity: 80 });
const take = (notes: RecordedNote[], bars = 1, settings: Partial<TranscriptionSettings> = {}): Take => ({
  id: 't', name: 'Test', createdAt: 0, tempo: 60, beatsPerBar: 4, bars, notes, pedal: [],
  settings: { ...DEFAULT_TRANSCRIPTION, ...settings },
});
const brief = (events: ScoreEvent[]) => events.map((e) => `${e.pitches.join('+') || 'z'}:${e.ticks}${e.triplet ? 't' : ''}${e.tie ? '-' : ''}`);

/** Every staff of every measure must add up to a full bar. */
function expectFullMeasures(score: Score) {
  const bar = score.beatsPerBar * 12;
  for (const m of score.measures) {
    expect(m.treble.reduce((s, e) => s + e.ticks, 0)).toBe(bar);
    expect(m.bass.reduce((s, e) => s + e.ticks, 0)).toBe(bar);
  }
}

describe('noteValues', () => {
  it('splits durations into readable values', () => {
    expect(noteValues(0, 48, 48, true)).toEqual([48]);
    expect(noteValues(12, 36, 48, true)).toEqual([12, 24]); // beat 2 to the end: quarter + half
    expect(noteValues(12, 18, 48, true)).toEqual([18]); // syncopated dotted quarter
    expect(noteValues(3, 21, 48, true)).toEqual([9, 12]); // off-beat start resolves on the beat
    expect(noteValues(0, 36, 48, false)).toEqual([24, 12]); // rests are never dotted
    expect(noteValues(0, 36, 36, true)).toEqual([36]); // full 3/4 bar
  });
});

describe('transcribe', () => {
  it('writes a held chord as a whole note, with a whole-bar rest on the empty staff', () => {
    const s = transcribe(take([n(60, 0, 4000), n(64, 0, 4000), n(67, 0, 4000)]));
    expect(brief(s.measures[0].treble)).toEqual(['60+64+67:48']);
    expect(brief(s.measures[0].bass)).toEqual(['z:48']);
    expectFullMeasures(s);
  });

  it('writes quarter notes', () => {
    const s = transcribe(take([0, 1000, 2000, 3000].map((t) => n(72, t, t + 900))));
    expect(brief(s.measures[0].treble)).toEqual(['72:12', '72:12', '72:12', '72:12']);
  });

  it('ties a note across the barline', () => {
    const s = transcribe(take([n(72, 3000, 5000)], 2));
    expect(brief(s.measures[0].treble)).toEqual(['z:24', 'z:12', '72:12-']);
    expect(brief(s.measures[1].treble)).toEqual(['72:12', 'z:12', 'z:24']);
    expectFullMeasures(s);
  });

  it('writes played triplets as triplets', () => {
    const s = transcribe(take([n(72, 0, 330), n(74, 340, 660), n(76, 670, 1000)]));
    expect(brief(s.measures[0].treble)).toEqual(['72:4t', '74:4t', '76:4t', 'z:12', 'z:24']);
    expectFullMeasures(s);
  });

  it('splits hands at the split note, which goes on the treble staff', () => {
    const s = transcribe(take([n(59, 0, 4000), n(60, 0, 4000)]));
    expect(brief(s.measures[0].treble)).toEqual(['60:48']);
    expect(brief(s.measures[0].bass)).toEqual(['59:48']);
  });

  it('merges near-simultaneous notes into one chord, never zero length', () => {
    const s = transcribe(take([n(72, 0, 30), n(76, 40, 1000)]));
    expect(brief(s.measures[0].treble)[0]).toBe('72+76:12');
    expectFullMeasures(s);
  });

  it('shortens a held note when the next one starts on the same staff (one voice)', () => {
    const s = transcribe(take([n(72, 0, 4000), n(76, 2000, 3000)]));
    expect(brief(s.measures[0].treble)).toEqual(['72:24', '76:12', 'z:12']);
  });

  it('names chords above the treble staff when they change', () => {
    const notes = [n(50, 0, 4000), n(65, 0, 4000), n(69, 0, 4000), n(72, 0, 4000), n(43, 4000, 8000), n(65, 4000, 8000), n(71, 4000, 8000), n(74, 4000, 8000)];
    const s = transcribe(take(notes, 2));
    expect(s.measures[0].treble[0].chordName).toBe('Dm7');
    expect(s.measures[1].treble[0].chordName).toBe('G7');
    expect(s.measures[0].treble.filter((e) => e.chordName)).toHaveLength(1);
    expect(transcribe(take(notes, 2, { chordNames: false })).measures[0].treble[0].chordName).toBeUndefined();
  });

  it('cuts a long note where a new chord name starts, so the name has a note to sit on', () => {
    const notes = [n(72, 0, 4000), n(48, 0, 2000), n(52, 0, 2000), n(55, 0, 2000), n(48, 2000, 4000), n(53, 2000, 4000), n(57, 2000, 4000)];
    const s = transcribe(take(notes));
    expect(brief(s.measures[0].treble)).toEqual(['72:24-', '72:24']);
    expect(s.measures[0].treble.map((e) => e.chordName)).toEqual(['C', 'F/C']);
  });

  it('follows the flats setting in chord names', () => {
    const s = transcribe(take([n(46, 0, 4000), n(62, 0, 4000), n(65, 0, 4000)], 1, { flats: true }));
    expect(s.flats).toBe(true);
    expect(s.measures[0].treble[0].chordName).toBe('Bb');
  });

  it('never writes past the last barline', () => {
    const s = transcribe(take([n(72, 3990, 9000)]));
    expect(s.measures).toHaveLength(1);
    expectFullMeasures(s);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/studio/transcribe.test.ts src/music/chords.test.ts`
Expected: FAIL — `transcribe` introuvable, et `identifiedChordName(c, true)` donne encore `A#7`.

- [ ] **Step 3: Add flats to identifiedChordName**

Dans `src/music/chords.ts`, remplacer `identifiedChordName` par :

```ts
/** Name including slash bass for inversions, e.g. "C/E". */
export function identifiedChordName(chord: IdentifiedChord, flats = false): string {
  const base = chordName(chord, flats);
  return chord.bass === chord.root ? base : `${base}/${pitchClassName(chord.bass, flats)}`;
}
```

Si `NOTE_NAMES` n'est plus utilisé dans ce fichier après ce changement, retirer son import pour que la vérification de types passe.

- [ ] **Step 4: Implement transcribe**

`src/studio/transcribe.ts` :

```ts
import { identifiedChordName, identifyChord } from '../music/chords';
import { quantize, type QuantizedNote } from './quantize';
import { TICKS_PER_BEAT as T, type Score, type ScoreEvent, type ScoreMeasure } from './score';
import type { Take } from './take';

export interface Segment {
  start: number;
  end: number;
  /** Empty for a rest. */
  pitches: number[];
}

/**
 * One staff as a gapless run of chords and rests. Notes starting together form
 * a chord lasting until its longest note; a chord stops where the next one
 * starts (one voice per staff).
 */
export function staffSegments(notes: QuantizedNote[], total: number): Segment[] {
  const byStart = new Map<number, { pitches: Set<number>; end: number }>();
  for (const note of notes) {
    const group = byStart.get(note.start);
    if (group) {
      group.pitches.add(note.pitch);
      group.end = Math.max(group.end, note.end);
    } else {
      byStart.set(note.start, { pitches: new Set([note.pitch]), end: note.end });
    }
  }
  const starts = [...byStart.keys()].sort((a, b) => a - b);
  const segments: Segment[] = [];
  let pos = 0;
  starts.forEach((start, i) => {
    const group = byStart.get(start)!;
    const end = Math.min(group.end, starts[i + 1] ?? total, total);
    if (start > pos) segments.push({ start: pos, end: start, pitches: [] });
    segments.push({ start, end, pitches: [...group.pitches].sort((a, b) => a - b) });
    pos = end;
  });
  if (pos < total) segments.push({ start: pos, end: total, pitches: [] });
  return segments;
}

const PLAIN = [48, 24, 12, 6, 3];
const DOTTED = new Set([36, 18, 9]);
const ALL = [48, 36, 24, 18, 12, 9, 6, 3];

/**
 * Splits a binary-grid duration (inside one bar) into writable values.
 * Off-beat notes resolve on the next beat; halves start on beat 1 or 3; whole
 * and dotted-half values start the bar; dotted values must end on a beat or
 * finish the duration. Rests are never dotted.
 */
export function noteValues(start: number, length: number, barTicks: number, allowDotted: boolean): number[] {
  const values: number[] = [];
  let pos = start;
  let left = length;
  while (left > 0) {
    const inBar = pos % barTicks;
    const inBeat = pos % T;
    const limit = inBeat === 0 ? left : Math.min(left, T - inBeat);
    const value = (allowDotted ? ALL : PLAIN).find((v) => {
      if (v > limit) return false;
      if (v >= 36 && inBar !== 0) return false;
      if (v >= 24 && inBar % 24 !== 0) return false;
      if (DOTTED.has(v) && (pos + v) % T !== 0 && v !== left) return false;
      return true;
    })!;
    values.push(value);
    pos += value;
    left -= value;
  }
  return values;
}

/** Chord symbol per beat, kept only when it changes from the last one shown. */
export function chordNamesByTick(notes: QuantizedNote[], totalBeats: number, flats: boolean): Map<number, string> {
  const names = new Map<number, string>();
  let last: string | null = null;
  for (let beat = 0; beat < totalBeats; beat++) {
    const from = beat * T;
    const to = from + T;
    const chord = identifyChord(notes.filter((n) => n.start < to && n.end > from).map((n) => n.pitch));
    const name = chord ? identifiedChordName(chord, flats) : null;
    if (name && name !== last) {
      names.set(from, name);
      last = name;
    }
  }
  return names;
}

/** Turns a take and its settings into a renderer-independent score. */
export function transcribe(take: Take): Score {
  const { settings } = take;
  const q = quantize(take, settings.grid, settings.triplets);
  const barTicks = take.beatsPerBar * T;
  const totalBeats = take.bars * take.beatsPerBar;
  const names = settings.chordNames ? chordNamesByTick(q.notes, totalBeats, settings.flats) : new Map<number, string>();

  const baseCuts = new Set<number>();
  for (let t = barTicks; t < q.totalTicks; t += barTicks) baseCuts.add(t);
  for (const beat of q.tripletBeats) {
    baseCuts.add(beat * T);
    baseCuts.add((beat + 1) * T);
  }

  const measures: ScoreMeasure[] = Array.from({ length: take.bars }, () => ({ treble: [], bass: [] }));

  const writeStaff = (staff: 'treble' | 'bass', notes: QuantizedNote[]) => {
    const cuts = new Set(baseCuts);
    if (staff === 'treble') for (const tick of names.keys()) cuts.add(tick);
    const sortedCuts = [...cuts].sort((a, b) => a - b);

    for (const segment of staffSegments(notes, q.totalTicks)) {
      const bounds = [segment.start, ...sortedCuts.filter((c) => c > segment.start && c < segment.end), segment.end];
      const lengths: { start: number; ticks: number; triplet: boolean }[] = [];
      for (let i = 0; i < bounds.length - 1; i++) {
        const [from, to] = [bounds[i], bounds[i + 1]];
        const beat = Math.floor(from / T);
        const wholeBeat = from % T === 0 && to - from === T;
        if (q.tripletBeats.has(beat) && !wholeBeat) {
          let pos = from;
          while (pos < to) {
            const ticks = to - pos >= 8 ? 8 : 4;
            lengths.push({ start: pos, ticks, triplet: true });
            pos += ticks;
          }
        } else {
          let pos = from;
          for (const ticks of noteValues(from, to - from, barTicks, segment.pitches.length > 0)) {
            lengths.push({ start: pos, ticks, triplet: false });
            pos += ticks;
          }
        }
      }
      lengths.forEach((piece, i) => {
        const measure = Math.floor(piece.start / barTicks);
        const event: ScoreEvent = {
          pitches: segment.pitches,
          start: piece.start - measure * barTicks,
          ticks: piece.ticks,
          triplet: piece.triplet,
          tie: segment.pitches.length > 0 && i < lengths.length - 1,
        };
        const name = staff === 'treble' ? names.get(piece.start) : undefined;
        if (name) event.chordName = name;
        measures[measure][staff].push(event);
      });
    }
  };

  writeStaff('treble', q.notes.filter((n) => n.pitch >= settings.split));
  writeStaff('bass', q.notes.filter((n) => n.pitch < settings.split));

  return { title: take.name, tempo: take.tempo, beatsPerBar: take.beatsPerBar, flats: settings.flats, measures };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test && npm run typecheck`
Expected: PASS. Si un cas de `noteValues` échoue, corriger la règle dans `noteValues` sans modifier le test : les attentes reflètent les conventions d'écriture de la spec.

- [ ] **Step 6: Commit**

```bash
git add src/music/chords.ts src/music/chords.test.ts src/studio
git commit -m "Transcribe takes into a two-staff score model"
```

---

### Task 8: Conversion en texte ABC

**Files:**
- Modify: `package.json`, `package-lock.json` (ajout d'abcjs)
- Create: `src/studio/abc.ts`
- Test: `src/studio/abc.test.ts`

**Interfaces:**
- Consumes: `Score`, `ScoreEvent`, `TICKS_PER_BEAT` (tâche 6), `transcribe` (tâche 7).
- Produces: `toAbc(score: Score): string` ; `abcPitch(midi: number, flats: boolean, state: Map<string, string>): string`.

- [ ] **Step 1: Install abcjs**

Run: `npm install abcjs@6.7.1`
Expected: `abcjs` ajouté aux dépendances.

- [ ] **Step 2: Write the failing tests**

`src/studio/abc.test.ts` :

```ts
import abcjs from 'abcjs';
import { describe, expect, it } from 'vitest';
import { abcPitch, toAbc } from './abc';
import type { Score } from './score';
import { transcribe } from './transcribe';
import { DEFAULT_TRANSCRIPTION, type Take } from './take';

const ev = (pitches: number[], start: number, ticks: number, extra: object = {}) => ({ pitches, start, ticks, triplet: false, tie: false, ...extra });

describe('abcPitch', () => {
  it('writes octaves the ABC way', () => {
    const s = new Map<string, string>();
    expect([36, 48, 60, 72, 84].map((m) => abcPitch(m, false, s))).toEqual(['C,,', 'C,', 'C', 'c', "c'"]);
  });
  it('writes accidentals once per bar, and naturals to cancel them', () => {
    const s = new Map<string, string>();
    expect([61, 61, 60].map((m) => abcPitch(m, false, s))).toEqual(['^C', 'C', '=C']);
    expect(abcPitch(70, true, new Map())).toBe('_B');
    expect(abcPitch(70, false, new Map())).toBe('^A');
  });
});

describe('toAbc', () => {
  it('writes a grand staff with chords, triplets, rests and ties', () => {
    const score: Score = {
      title: 'Test', tempo: 90, beatsPerBar: 4, flats: false,
      measures: [{
        treble: [
          ev([62, 65, 69, 72], 0, 12, { chordName: 'Dm7' }),
          ev([73], 12, 4, { triplet: true }), ev([74], 16, 4, { triplet: true }), ev([76], 20, 4, { triplet: true }),
          ev([], 24, 12),
          ev([70], 36, 12, { tie: true }),
        ],
        bass: [ev([50], 0, 48)],
      }],
    };
    expect(toAbc(score)).toBe([
      'X:1',
      'T:Test',
      'M:4/4',
      'L:1/16',
      'Q:1/4=90',
      '%%staves {RH LH}',
      'V:RH clef=treble',
      'V:LH clef=bass',
      '[V:RH] "Dm7"[DFAc]4 (3:2:3^c2d2e2 z4 ^A4- |]',
      '[V:LH] D,16 |]',
      '',
    ].join('\n'));
  });

  it('puts four bars per line', () => {
    const bar = { treble: [ev([], 0, 48)], bass: [ev([], 0, 48)] };
    const abc = toAbc({ title: 'T', tempo: 60, beatsPerBar: 4, flats: false, measures: Array.from({ length: 5 }, () => bar) });
    expect(abc).toContain('[V:RH] z16 | z16 | z16 | z16 |\n[V:LH] z16 | z16 | z16 | z16 |\n[V:RH] z16 |]\n[V:LH] z16 |]');
  });

  it('produces ABC that abcjs reads without warnings', () => {
    const take: Take = {
      id: 't', name: 'Impro', createdAt: 0, tempo: 60, beatsPerBar: 3, bars: 2, pedal: [],
      settings: { ...DEFAULT_TRANSCRIPTION, flats: true },
      notes: [
        { pitch: 46, start: 0, end: 3000, velocity: 80 },
        { pitch: 70, start: 0, end: 330, velocity: 80 },
        { pitch: 72, start: 340, end: 660, velocity: 80 },
        { pitch: 74, start: 670, end: 2500, velocity: 80 },
        { pitch: 75, start: 2600, end: 6000, velocity: 80 },
      ],
    };
    const [tune] = abcjs.parseOnly(toAbc(transcribe(take)));
    expect(tune.warnings ?? []).toEqual([]);
    expect(tune.lines[0].staff).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/studio/abc.test.ts`
Expected: FAIL — module `./abc` introuvable.

- [ ] **Step 4: Implement**

`src/studio/abc.ts` :

```ts
import { TICKS_PER_BEAT as T, type Score, type ScoreEvent } from './score';

const SHARPS: [string, string][] = [['C', ''], ['C', '^'], ['D', ''], ['D', '^'], ['E', ''], ['F', ''], ['F', '^'], ['G', ''], ['G', '^'], ['A', ''], ['A', '^'], ['B', '']];
const FLATS: [string, string][] = [['C', ''], ['D', '_'], ['D', ''], ['E', '_'], ['E', ''], ['F', ''], ['G', '_'], ['G', ''], ['A', '_'], ['A', ''], ['B', '_'], ['B', '']];
const BARS_PER_LINE = 4;

/**
 * One pitch in ABC. `state` holds the accidental in force for each letter and
 * octave in the current bar, as in standard notation; the caller resets it each bar.
 */
export function abcPitch(midi: number, flats: boolean, state: Map<string, string>): string {
  const [letter, accidental] = (flats ? FLATS : SHARPS)[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  const key = `${letter}${octave}`;
  let prefix = '';
  if ((state.get(key) ?? '') !== accidental) {
    prefix = accidental || '=';
    state.set(key, accidental);
  }
  let name = octave >= 5 ? letter.toLowerCase() : letter;
  if (octave > 5) name += "'".repeat(octave - 5);
  if (octave < 4) name += ','.repeat(4 - octave);
  return prefix + name;
}

/** ABC lengths are in sixteenths (L:1/16); triplet eighths are written as eighths inside a (3 group. */
function abcLength(event: ScoreEvent): string {
  const length = event.triplet ? event.ticks / 2 : event.ticks / 3;
  return length === 1 ? '' : String(length);
}

function measureAbc(events: ScoreEvent[], flats: boolean): string {
  const state = new Map<string, string>();
  let out = '';
  events.forEach((event, i) => {
    const beat = Math.floor(event.start / T);
    if (i > 0 && event.start % T === 0) out += ' '; // break beams between beats
    const previous = events[i - 1];
    if (event.triplet && !(previous?.triplet && Math.floor(previous.start / T) === beat)) {
      const count = events.filter((e) => e.triplet && Math.floor(e.start / T) === beat).length;
      out += `(3:2:${count}`;
    }
    if (event.chordName) out += `"${event.chordName}"`;
    if (event.pitches.length === 0) out += 'z';
    else if (event.pitches.length === 1) out += abcPitch(event.pitches[0], flats, state);
    else out += `[${event.pitches.map((p) => abcPitch(p, flats, state)).join('')}]`;
    out += abcLength(event);
    if (event.tie) out += '-';
  });
  return out;
}

/** Grand-staff piano score in ABC notation, four bars per line. */
export function toAbc(score: Score): string {
  const lines = [
    'X:1',
    `T:${score.title.replace(/[\r\n]+/g, ' ')}`,
    `M:${score.beatsPerBar}/4`,
    'L:1/16',
    `Q:1/4=${score.tempo}`,
    '%%staves {RH LH}',
    'V:RH clef=treble',
    'V:LH clef=bass',
  ];
  for (let first = 0; first < score.measures.length; first += BARS_PER_LINE) {
    const chunk = score.measures.slice(first, first + BARS_PER_LINE);
    const end = first + BARS_PER_LINE >= score.measures.length ? ' |]' : ' |';
    lines.push(`[V:RH] ${chunk.map((m) => measureAbc(m.treble, score.flats)).join(' | ')}${end}`);
    lines.push(`[V:LH] ${chunk.map((m) => measureAbc(m.bass, score.flats)).join(' | ')}${end}`);
  }
  return `${lines.join('\n')}\n`;
}
```

- [ ] **Step 5: Run tests, typecheck and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS. Si la vérification de types refuse `import abcjs from 'abcjs'`, utiliser `import * as abcjs from 'abcjs'` dans le test et vérifier qu'il passe toujours.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/studio
git commit -m "Convert scores to ABC notation"
```

---

### Task 9: Page Studio

**Files:**
- Create: `src/studio/session.ts`
- Create: `src/studio/components/TransportBar.tsx`, `src/studio/components/TakeList.tsx`, `src/studio/components/TranscriptionSettingsPanel.tsx`, `src/studio/components/ScoreView.tsx`
- Modify: `src/pages/StudioPage.tsx`
- Modify: `src/styles.css`

**Interfaces:**
- Consumes: `onRawNoteEvent` (tâche 1), `Recorder` (tâche 3), `Metronome` (tâche 4), `useStudioStore`, `clampTempo` (tâche 5), `transcribe` (tâche 7), `toAbc` (tâche 8), `Piano`, `useMusicStore` existants.
- Produces: `startRecording(): Promise<void>`, `stopRecording(): void`, `isRecordingActive(): boolean` dans `session.ts`.

Cette tâche est de l'interface : elle est vérifiée dans le navigateur à la tâche 10, pas par des tests unitaires.

- [ ] **Step 1: Write the session**

`src/studio/session.ts` :

```ts
import { onRawNoteEvent } from '../input/rawEvents';
import { Metronome } from './metronome';
import { Recorder } from './recorder';
import { useStudioStore } from './store';
import { DEFAULT_TRANSCRIPTION, defaultTakeName, type BeatsPerBar } from './take';

const metronome = new Metronome();

interface Session {
  recorder: Recorder;
  zeroTime: number;
  tempo: number;
  beatsPerBar: BeatsPerBar;
  unsubscribe: () => void;
  timer: number;
}

let session: Session | null = null;
let starting = false;
let cancelStart = false;

export function isRecordingActive(): boolean {
  return starting || session !== null;
}

/** Count-in bar, then record until stopRecording(). */
export async function startRecording(): Promise<void> {
  if (isRecordingActive()) return;
  const store = useStudioStore.getState();
  const { tempo, beatsPerBar, metronome: clicks } = store.transport;
  starting = true;
  cancelStart = false;
  store.setMessage(null);
  store.setStatus('countIn');
  try {
    const zeroTime = await metronome.start({ tempo, beatsPerBar, countInBars: 1, clickAfterCountIn: clicks });
    if (cancelStart) {
      metronome.stop();
      return;
    }
    const recorder = new Recorder({ tempo, beatsPerBar, zeroTime });
    const unsubscribe = onRawNoteEvent((e) => {
      if (e.type === 'on') recorder.noteOn(e.note, e.velocity, e.time);
      else if (e.type === 'off') recorder.noteOff(e.note, e.time);
      else recorder.sustain(e.down, e.time);
    });
    const timer = window.setTimeout(() => useStudioStore.getState().setStatus('recording'), Math.max(0, zeroTime - performance.now()));
    session = { recorder, zeroTime, tempo, beatsPerBar, unsubscribe, timer };
  } catch {
    metronome.stop();
    store.setStatus('idle');
    store.setMessage('Impossible de démarrer le métronome dans ce navigateur.');
  } finally {
    starting = false;
  }
}

/** Stops and saves the take. Stopping during the count-in keeps nothing. */
export function stopRecording(): void {
  const store = useStudioStore.getState();
  if (starting) {
    cancelStart = true;
    metronome.stop();
    store.setStatus('idle');
    return;
  }
  if (!session) return;
  const { recorder, zeroTime, tempo, beatsPerBar, unsubscribe, timer } = session;
  session = null;
  unsubscribe();
  window.clearTimeout(timer);
  metronome.stop();
  store.setStatus('idle');
  const now = performance.now();
  if (now <= zeroTime) return; // stopped during the count-in
  const recording = recorder.stop(now);
  if (!recording) {
    store.setMessage('Aucune note jouée : la prise n’a pas été gardée.');
    return;
  }
  store.addTake({
    id: crypto.randomUUID(),
    name: defaultTakeName(store.takes.length + 1, new Date()),
    createdAt: Date.now(),
    tempo,
    beatsPerBar,
    ...recording,
    settings: { ...DEFAULT_TRANSCRIPTION },
  });
}
```

- [ ] **Step 2: Write the transport bar**

`src/studio/components/TransportBar.tsx` :

```tsx
import { useEffect, useState } from 'react';
import { startRecording, stopRecording } from '../session';
import { clampTempo, useStudioStore } from '../store';
import type { BeatsPerBar } from '../take';

const METERS: BeatsPerBar[] = [4, 3, 2];
const REC_LABELS = { idle: '● Enregistrer', countIn: 'Décompte… (arrêter)', recording: '■ Arrêter' } as const;

export function TransportBar() {
  const transport = useStudioStore((s) => s.transport);
  const status = useStudioStore((s) => s.status);
  const setTransport = useStudioStore((s) => s.setTransport);
  const busy = status !== 'idle';
  const [tempoDraft, setTempoDraft] = useState(String(transport.tempo));
  useEffect(() => setTempoDraft(String(transport.tempo)), [transport.tempo]);

  const commitTempo = () => {
    const tempo = clampTempo(Number(tempoDraft));
    setTempoDraft(String(tempo));
    setTransport({ tempo });
  };

  return (
    <div className="transport">
      <label className="field">
        <span>Tempo</span>
        <input
          type="number"
          min={40}
          max={240}
          value={tempoDraft}
          disabled={busy}
          onChange={(e) => setTempoDraft(e.target.value)}
          onBlur={commitTempo}
          onKeyDown={(e) => e.key === 'Enter' && commitTempo()}
        />
      </label>
      <label className="field">
        <span>Mesure</span>
        <select value={transport.beatsPerBar} disabled={busy} onChange={(e) => setTransport({ beatsPerBar: Number(e.target.value) as BeatsPerBar })}>
          {METERS.map((m) => <option key={m} value={m}>{m}/4</option>)}
        </select>
      </label>
      <label className="field field-check">
        <input type="checkbox" checked={transport.metronome} disabled={busy} onChange={(e) => setTransport({ metronome: e.target.checked })} />
        <span>Métronome</span>
      </label>
      <button
        className={`rec-button is-${status}`}
        onClick={() => (status === 'idle' ? void startRecording() : stopRecording())}
      >
        {REC_LABELS[status]}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Write the take list**

`src/studio/components/TakeList.tsx` :

```tsx
import { useRef, useState } from 'react';
import { useStudioStore } from '../store';
import type { Take } from '../take';

export function TakeList() {
  const takes = useStudioStore((s) => s.takes);
  const selectedId = useStudioStore((s) => s.selectedId);
  const selectTake = useStudioStore((s) => s.selectTake);
  const deleteTake = useStudioStore((s) => s.deleteTake);
  const [editing, setEditing] = useState<string | null>(null);

  if (takes.length === 0) return <p className="empty">Aucune prise. Clique sur Enregistrer pour commencer.</p>;

  return (
    <ul className="take-list scroll">
      {takes.map((take) => (
        <li key={take.id} className={`take ${take.id === selectedId ? 'is-selected' : ''}`}>
          {editing === take.id ? (
            <RenameInput take={take} onDone={() => setEditing(null)} />
          ) : (
            <button className="take-main" onClick={() => selectTake(take.id)}>
              <span className="take-name">{take.name}</span>
              <span className="take-meta">
                {take.tempo} bpm · {take.beatsPerBar}/4 · {take.bars} mesure{take.bars > 1 ? 's' : ''}
              </span>
            </button>
          )}
          <button className="icon-button" title="Renommer" aria-label={`Renommer ${take.name}`} onClick={() => setEditing(take.id)}>✎</button>
          <button
            className="icon-button"
            title="Supprimer"
            aria-label={`Supprimer ${take.name}`}
            onClick={() => window.confirm(`Supprimer « ${take.name} » ?`) && deleteTake(take.id)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  );
}

function RenameInput({ take, onDone }: { take: Take; onDone: () => void }) {
  const renameTake = useStudioStore((s) => s.renameTake);
  const [value, setValue] = useState(take.name);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    if (save) renameTake(take.id, value);
    onDone();
  };
  return (
    <input
      className="take-rename"
      aria-label="Nom de la prise"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        if (e.key === 'Escape') finish(false);
      }}
    />
  );
}
```

- [ ] **Step 4: Write the transcription settings**

`src/studio/components/TranscriptionSettingsPanel.tsx` :

```tsx
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
```

- [ ] **Step 5: Write the score view**

`src/studio/components/ScoreView.tsx` :

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { toAbc } from '../abc';
import { transcribe } from '../transcribe';
import type { Take } from '../take';

/** Draws the take's score with abcjs; a failure shows a message, the take is untouched. */
export function ScoreView({ take }: { take: Take }) {
  const ref = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const abc = useMemo(() => {
    try {
      return toAbc(transcribe(take));
    } catch {
      return null;
    }
  }, [take]);

  useEffect(() => {
    if (!ref.current || abc === null) return;
    try {
      const color = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8e8f0';
      abcjs.renderAbc(ref.current, abc, { responsive: 'resize', foregroundColor: color, jazzchords: true, add_classes: true });
      setRenderError(false);
    } catch {
      setRenderError(true);
    }
  }, [abc]);

  if (abc === null || renderError) {
    return <p className="empty score-error">La partition n’a pas pu être affichée. La prise est intacte : essaie d’autres réglages.</p>;
  }
  return <div ref={ref} className="score-view" />;
}
```

- [ ] **Step 6: Write the Studio page**

Remplacer `src/pages/StudioPage.tsx` par :

```tsx
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
```

- [ ] **Step 7: Style the Studio**

Ajouter à la fin de `src/styles.css` :

```css
/* Studio */
.studio { display: flex; flex-direction: column; gap: 12px; padding: 16px; height: calc(100vh - 90px); min-height: 560px; }
.transport { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--panel); }
.field { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--muted); }
.field input[type='number'], .field select {
  padding: 5px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}
.field input[type='number'] { width: 72px; }
.field-check { cursor: pointer; }
.rec-button {
  margin-left: auto;
  padding: 7px 16px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--panel-raised);
  color: var(--text);
  font-weight: 500;
  cursor: pointer;
}
.rec-button.is-idle:hover { border-color: var(--bad); }
.rec-button.is-countIn { border-color: var(--accent); color: var(--accent-soft); }
.rec-button.is-recording { border-color: var(--bad); background: rgba(229, 72, 77, 0.18); animation: rec-pulse 1.2s ease-in-out infinite; }
@keyframes rec-pulse { 50% { background: rgba(229, 72, 77, 0.32); } }
.banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 12px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--panel-raised); font-size: 14px; }
.studio-body { flex: 1; min-height: 0; display: grid; grid-template-columns: 280px 1fr; gap: 12px; }
.studio-takes, .studio-score { min-height: 0; }
.studio-piano { height: 130px; flex: none; }
.take-list { list-style: none; margin: 0; padding: 4px 0; flex: 1; min-height: 0; }
.take { display: flex; align-items: center; gap: 4px; padding: 2px 8px 2px 4px; }
.take:hover { background: var(--panel-raised); }
.take.is-selected { background: var(--accent-bg); }
.take-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 6px; border: none; background: none; text-align: left; cursor: pointer; }
.take-name { font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.take-meta { font-size: 12px; color: var(--dim); }
.take-rename { flex: 1; min-width: 0; margin: 4px; padding: 5px 8px; border: 1px solid var(--accent); border-radius: 6px; background: var(--bg); color: var(--text); font: inherit; font-size: 14px; }
.transcription-settings { display: flex; flex-wrap: wrap; gap: 8px 16px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.score-view { flex: 1; min-height: 0; overflow: auto; padding: 8px 12px; }
.score-view svg { display: block; }
```

- [ ] **Step 8: Typecheck, test and build**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "Build the Studio page: transport, takes, settings and score"
```

---

### Task 10: Vérification dans le navigateur et documentation

**Files:**
- Modify: `README.md`
- Scratch (non commité) : un script Playwright dans le dossier temporaire de la session

**Interfaces:**
- Consumes: toute la fonctionnalité.

- [ ] **Step 1: Drive the Studio in Chrome**

Lancer `npx vite preview --port 4179` après `npm run build`, puis un script `playwright-core` avec le Chrome installé (`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`), en headless, qui :

1. ouvre `http://localhost:4179/PianoTools/#/studio`, vide le stockage local et recharge ;
2. vérifie que l'onglet Studio est actif et que les trois zones s'affichent ;
3. règle le tempo sur 120, clique sur « ● Enregistrer », attend la fin du décompte (2 secondes à 120 en 4/4), joue au clavier d'ordinateur quatre noires `a`, `d`, `g`, `k` (C4 E4 G4 C5) en tenant chaque touche 400 ms sur chaque temps, puis clique sur « ■ Arrêter » ;
4. vérifie qu'une prise apparaît, sélectionnée, et que la partition contient un SVG ;
5. passe les altérations sur « Bémols » et la grille sur « Croche », et vérifie que le SVG change ;
6. renomme la prise, puis la supprime en acceptant la confirmation ;
7. relance un enregistrement et l'arrête pendant le décompte : aucune prise n'est créée ;
8. ouvre `#/`, vérifie que la page Entraînement s'affiche avec ses cinq modules, recharge sur `#/studio` et vérifie que le Studio s'affiche ;
9. relève toutes les erreurs de la console et de la page : il ne doit y en avoir aucune.

Capturer une image de la partition pour la relecture visuelle. Le son du métronome ne peut pas être entendu en headless : vérifier seulement l'absence d'erreur.

- [ ] **Step 2: Document the Studio in the README**

Dans `README.md`, ajouter une section `## The Studio page` après `## Modules`, décrivant en anglais : le réglage du tempo, de la mesure et du métronome ; la mesure de décompte et l'anticipation ; l'arrêt et l'arrondi à la mesure ; la liste des prises, avec renommage et suppression ; les réglages de transcription et leurs valeurs par défaut ; les limites de cette version (une voix par portée, rythmes écrits tels que joués, pas d'armure, 6/8 non géré). Ajouter `pianotools.studio.v1` à la section des données stockées, et les fichiers `src/studio/` et `src/pages/` au tableau de structure.

- [ ] **Step 3: Final checks and commit**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

```bash
git add README.md
git commit -m "Document the Studio page"
```
