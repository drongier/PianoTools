import { findQuality, satisfiesChord, type Chord } from './chords';
import type { PitchClass } from './notes';

/** One chord placed on the score. Stored by quality id so it can be saved as JSON. */
export interface ProgressionStep {
  id: string;
  root: PitchClass;
  qualityId: string;
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

export function insertStep(p: Progression, step: ProgressionStep, index = p.steps.length): Progression {
  const steps = [...p.steps];
  steps.splice(index, 0, step);
  const active = p.steps.length > 0 && index <= p.active ? p.active + 1 : p.active;
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
  const chord = step && stepChord(step);
  if (!chord || !satisfiesChord(played, chord)) return { progression: p, hit: false };
  return { progression: { ...p, active: (p.active + 1) % p.steps.length }, hit: true };
}
