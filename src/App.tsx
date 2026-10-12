import { useEffect, useState } from 'react';
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, closestCenter, pointerWithin, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Layout } from 'react-grid-layout';
import { Dashboard } from './dashboard/Dashboard';
import { DEFAULT_LAYOUT, loadLayout, saveLayout } from './dashboard/layout';
import { PROGRESSION_DROP_ID } from './modules/ProgressionModule';
import { chordName, type Chord } from './music/chords';
import { stepName } from './music/progression';
import type { ChordGroup } from './music/twoFiveOne';
import { startEngine } from './state/engine';
import { useMusicStore } from './state/store';

type DragData = { kind: 'catalog'; chord: Chord } | { kind: 'group'; group: ChordGroup } | { kind: 'step' };

/** Steps reorder by closest card; chords from the list must be dropped onto the score. */
const collisionDetection: CollisionDetection = (args) => {
  if ((args.active.data.current as DragData | undefined)?.kind === 'step') {
    return closestCenter({ ...args, droppableContainers: args.droppableContainers.filter((c) => c.id !== PROGRESSION_DROP_ID) });
  }
  return pointerWithin(args);
};

export function App() {
  const status = useMusicStore((s) => s.status);
  const [layout, setLayout] = useState<Layout>(loadLayout);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => startEngine(), []);

  const changeLayout = (next: Layout) => {
    setLayout(next);
    saveLayout(next);
  };

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
      <header className="topbar">
        <h1>Piano Tools</h1>
        <span className="topbar-status">{status}</span>
        <button className="text-button" onClick={() => changeLayout(DEFAULT_LAYOUT)}>Réinitialiser la disposition</button>
      </header>
      <Dashboard layout={layout} onLayoutChange={changeLayout} />
      <DragOverlay dropAnimation={null}>{dragLabel && <div className="drag-chip">{dragLabel}</div>}</DragOverlay>
    </DndContext>
  );
}
