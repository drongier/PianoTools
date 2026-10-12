import { chordName, chordVoicing, findQuality, satisfiesChord, type Chord } from './chords';
import { CHORD_DISPLAY_MIDI, PIANO_HIGH, PIANO_LOW, pitchClass, pitchClassName } from './notes';
import type { PitchClass } from './notes';

/** One chord placed on the score. Stored by quality id so it can be saved as JSON. */
export interface ProgressionStep {
  id: string;
  root: PitchClass;
  qualityId: string;
  /** Spell the root with flats (Bbmaj7 rather than A#maj7). */
  flats?: boolean;
  /** Required position (0 = root position, 1 = first inversion…). Unset: any voicing is accepted. */
  inversion?: number;
  /** Octaves to move the piano display up (+) or down (−). Display only: any octave is accepted. */
  octave?: number;
}

export interface Progression {
  steps: ProgressionStep[];
  /** Index of the chord to play next. */
  active: number;
}

export function stepChord(step: ProgressionStep): Chord | null {
  const quality = findQuality(step.qualityId);
  return quality ? { root: step.root, quality } : null;
}

/** Notes to show on the piano for a step, in its chosen position. */
export function stepVoicing(step: ProgressionStep): number[] {
  const chord = stepChord(step);
  if (!chord) return [];
  const shift = 12 * (step.octave ?? 0);
  return chordVoicing(chord, CHORD_DISPLAY_MIDI, step.inversion ?? 0).map((n) => n + shift);
}

/** Moves a step's piano display by `delta` octaves, unless that would leave the keyboard. */
export function shiftStepOctave(p: Progression, id: string, delta: number): Progression {
  return {
    ...p,
    steps: p.steps.map((s) => {
      if (s.id !== id) return s;
      const octave = (s.octave ?? 0) + delta;
      const { octave: _, ...rest } = s;
      const next = octave === 0 ? rest : { ...rest, octave };
      const notes = stepVoicing(next);
      return notes.length && Math.min(...notes) >= PIANO_LOW && Math.max(...notes) <= PIANO_HIGH ? next : s;
    }),
  };
}

/** Chord name, with a slash bass when the step is inverted ("C/E"). */
export function stepName(step: ProgressionStep): string {
  const chord = stepChord(step);
  if (!chord) return '?';
  const name = chordName(chord, step.flats);
  if (!step.inversion) return name;
  return `${name}/${pitchClassName(pitchClass(stepVoicing(step)[0]), step.flats)}`;
}

export function setStepInversion(p: Progression, id: string, inversion: number | undefined): Progression {
  return {
    ...p,
    steps: p.steps.map((s) => {
      if (s.id !== id) return s;
      const { inversion: _, ...rest } = s;
      return inversion === undefined ? rest : { ...rest, inversion };
    }),
  };
}

/** True if the notes play the step's chord, with the right bass when a position is set. */
export function stepSatisfied(step: ProgressionStep, played: readonly number[]): boolean {
  const chord = stepChord(step);
  if (!chord || played.length === 0 || !satisfiesChord(played, chord)) return false;
  if (step.inversion === undefined) return true;
  return pitchClass(Math.min(...played)) === pitchClass(stepVoicing(step)[0]);
}

export function insertStep(p: Progression, step: ProgressionStep, index = p.steps.length): Progression {
  return insertSteps(p, [step], index);
}

/** Inserts steps in order at `index`; the active step stays the same chord. */
export function insertSteps(p: Progression, added: ProgressionStep[], index = p.steps.length): Progression {
  const steps = [...p.steps];
  steps.splice(index, 0, ...added);
  const active = p.steps.length > 0 && index <= p.active ? p.active + added.length : p.active;
  return { steps, active };
}

/** Reorders a step; the active step stays the same chord. */
export function moveStep(p: Progression, from: number, to: number): Progression {
  const steps = [...p.steps];
  const [moved] = steps.splice(from, 1);
  steps.splice(to, 0, moved);
  const activeId = p.steps[p.active]?.id;
  return { steps, active: Math.max(0, steps.findIndex((s) => s.id === activeId)) };
}

export function removeStep(p: Progression, id: string): Progression {
  const index = p.steps.findIndex((s) => s.id === id);
  if (index < 0) return p;
  const steps = p.steps.filter((s) => s.id !== id);
  let active = index < p.active ? p.active - 1 : p.active;
  active = Math.min(active, Math.max(0, steps.length - 1));
  return { steps, active };
}

/** If the played notes are the active chord, move to the next one (looping). */
export function advance(p: Progression, played: readonly number[]): { progression: Progression; hit: boolean } {
  const step = p.steps[p.active];
  if (!step || !stepSatisfied(step, played)) return { progression: p, hit: false };
  return { progression: { ...p, active: (p.active + 1) % p.steps.length }, hit: true };
}
