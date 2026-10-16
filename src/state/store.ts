import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { chordName, chordVoicing, identifiedChordName, identifyChord, satisfiesChord, type Chord, type IdentifiedChord } from '../music/chords';
import {
  advance, insertSteps, moveStep, removeStep, setStepInversion, shiftStepOctave, stepChord, stepName, stepVoicing, type Progression,
} from '../music/progression';
import { CHORD_DISPLAY_MIDI } from '../music/notes';
import { defaultScaleFor, findScaleType, type Scale } from '../music/scales';

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
  /** Scale dotted on the piano, locked by the first chord played; null = armed for the next chord. */
  scale: Scale | null;

  setStatus: (status: string) => void;
  setHeld: (notes: number[]) => void;
  chordPlayed: (notes: number[]) => void;
  toggleSelected: (chord: Chord) => void;
  addChord: (chord: Chord, index?: number) => void;
  /** Adds several chords in order (e.g. a ii-V-I), optionally spelled with flats. */
  addChords: (chords: Chord[], index?: number, flats?: boolean) => void;
  moveStep: (from: number, to: number) => void;
  removeStep: (id: string) => void;
  /** Position to play a score chord in; undefined accepts any voicing. */
  setStepInversion: (id: string, inversion: number | undefined) => void;
  /** Moves a score chord's piano display up or down an octave. */
  shiftStepOctave: (id: string, delta: number) => void;
  /** Same, for the active score chord; ignored while a chord from the list is shown instead. */
  shiftActiveStepOctave: (delta: number) => void;
  setActiveStep: (index: number) => void;
  clearProgression: () => void;
  /** Removes the scale dots; the next chord played locks a new scale. */
  clearScale: () => void;
  /** Swaps the locked scale for another type on the same root. */
  setScaleType: (id: string) => void;
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
      scale: null,

      setStatus: (status) => set({ status }),
      setHeld: (held) => set({ held, hitNotes: get().hitNotes.filter((n) => held.includes(n)) }),

      chordPlayed: (notes) => {
        const chord = identifyChord(notes);
        const { history, selected, progression, scale } = get();
        const name = chord && identifiedChordName(chord);
        const update: Partial<MusicState> = { played: { notes, chord } };
        if (chord && !scale) update.scale = defaultScaleFor(chord);
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

      addChord: (chord, index) => get().addChords([chord], index),
      addChords: (chords, index, flats) =>
        set({
          progression: insertSteps(
            get().progression,
            chords.map((c) => ({ id: crypto.randomUUID(), root: c.root, qualityId: c.quality.id, ...(flats && { flats }) })),
            index,
          ),
          selected: null,
        }),
      moveStep: (from, to) => set({ progression: moveStep(get().progression, from, to) }),
      removeStep: (id) => set({ progression: removeStep(get().progression, id) }),
      setStepInversion: (id, inversion) => set({ progression: setStepInversion(get().progression, id, inversion) }),
      shiftStepOctave: (id, delta) => set({ progression: shiftStepOctave(get().progression, id, delta) }),
      shiftActiveStepOctave: (delta) => {
        const { selected, progression } = get();
        const step = progression.steps[progression.active];
        if (!selected && step) get().shiftStepOctave(step.id, delta);
      },
      setActiveStep: (active) => set({ progression: { ...get().progression, active }, selected: null }),
      clearProgression: () => set({ progression: { steps: [], active: 0 } }),
      clearScale: () => set({ scale: null }),
      setScaleType: (id) => {
        const { scale } = get();
        const type = findScaleType(id);
        if (scale && type) set({ scale: { ...scale, type } });
      },
    }),
    {
      name: 'pianotools.progression.v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ progression: s.progression }),
    },
  ),
);

/** The chord to play now: the one picked in the list, else the active score step. */
export interface Target {
  chord: Chord;
  /** Display name, with slash bass for an inverted score step. */
  name: string;
  /** Notes shown on the piano, in the chosen position. */
  notes: number[];
  flats: boolean;
}

export function useTarget(): Target | null {
  // Select stable references only; deriving a new object inside the selector would re-render forever.
  const selected = useMusicStore((s) => s.selected);
  const step = useMusicStore((s) => s.progression.steps[s.progression.active]);
  return useMemo(() => {
    if (selected) return { chord: selected, name: chordName(selected), notes: chordVoicing(selected, CHORD_DISPLAY_MIDI), flats: false };
    const chord = step && stepChord(step);
    if (!chord) return null;
    return { chord, name: stepName(step), notes: stepVoicing(step), flats: !!step.flats };
  }, [selected, step]);
}
