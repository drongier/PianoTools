import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { identifiedChordName, identifyChord, satisfiesChord, type Chord, type IdentifiedChord } from '../music/chords';
import { advance, insertStep, moveStep, removeStep, stepChord, type Progression } from '../music/progression';

const HISTORY_SIZE = 200;

export interface PlayedChord {
  notes: number[];
  chord: IdentifiedChord | null;
}

/** Last time the target chord was played correctly, for the success flash. */
export interface Hit {
  target: 'selected' | string; // 'selected' or a progression step id
  at: number;
}

interface MusicState {
  status: string;
  held: number[];
  played: PlayedChord | null;
  history: string[];
  /** Chord picked in the list: shown on the piano until unselected. */
  selected: Chord | null;
  progression: Progression;
  lastHit: Hit | null;
  /** Notes of the last correct chord, still held: they stay green after the target moves on. */
  hitNotes: number[];

  setStatus: (status: string) => void;
  setHeld: (notes: number[]) => void;
  chordPlayed: (notes: number[]) => void;
  toggleSelected: (chord: Chord) => void;
  addChord: (chord: Chord, index?: number) => void;
  moveStep: (from: number, to: number) => void;
  removeStep: (id: string) => void;
  setActiveStep: (index: number) => void;
  clearProgression: () => void;
}

const sameChord = (a: Chord | null, b: Chord) => a?.root === b.root && a.quality.id === b.quality.id;

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      status: 'Initialisation…',
      held: [],
      played: null,
      history: [],
      selected: null,
      progression: { steps: [], active: 0 },
      lastHit: null,
      hitNotes: [],

      setStatus: (status) => set({ status }),
      setHeld: (held) => set({ held, hitNotes: get().hitNotes.filter((n) => held.includes(n)) }),

      chordPlayed: (notes) => {
        const chord = identifyChord(notes);
        const { history, selected, progression } = get();
        const name = chord && identifiedChordName(chord);
        const update: Partial<MusicState> = { played: { notes, chord } };
        if (name && history[0] !== name) update.history = [name, ...history].slice(0, HISTORY_SIZE);

        if (selected) {
          if (satisfiesChord(notes, selected)) {
            update.lastHit = { target: 'selected', at: Date.now() };
            update.hitNotes = notes;
          }
        } else {
          const result = advance(progression, notes);
          if (result.hit) {
            update.lastHit = { target: progression.steps[progression.active].id, at: Date.now() };
            update.progression = result.progression;
            update.hitNotes = notes;
          }
        }
        set(update);
      },

      toggleSelected: (chord) => set({ selected: sameChord(get().selected, chord) ? null : chord }),

      addChord: (chord, index) =>
        set({
          progression: insertStep(get().progression, { id: crypto.randomUUID(), root: chord.root, qualityId: chord.quality.id }, index),
          selected: null,
        }),
      moveStep: (from, to) => set({ progression: moveStep(get().progression, from, to) }),
      removeStep: (id) => set({ progression: removeStep(get().progression, id) }),
      setActiveStep: (active) => set({ progression: { ...get().progression, active }, selected: null }),
      clearProgression: () => set({ progression: { steps: [], active: 0 } }),
    }),
    {
      name: 'pianotools.progression.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ progression: s.progression }),
    },
  ),
);

/** The chord the piano should light up: the picked chord, else the active score step. */
export function useTargetChord(): Chord | null {
  // Select stable references only; deriving a new object inside the selector would re-render forever.
  const selected = useMusicStore((s) => s.selected);
  const step = useMusicStore((s) => s.progression.steps[s.progression.active]);
  return useMemo(() => selected ?? (step ? stepChord(step) : null), [selected, step]);
}
