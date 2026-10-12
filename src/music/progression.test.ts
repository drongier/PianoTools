import { describe, expect, it } from 'vitest';
import {
  advance, insertStep, insertSteps, moveStep, removeStep, setStepInversion, shiftStepOctave, stepChord, stepName, stepVoicing, type Progression,
} from './progression';
import { PIANO_HIGH, PIANO_LOW } from './notes';

const step = (id: string, root: number, qualityId = 'maj') => ({ id, root, qualityId });
const prog = (active = 0): Progression => ({ steps: [step('a', 0), step('b', 5), step('c', 7, 'dom7')], active });

describe('progression', () => {
  it('resolves a step to a chord', () => {
    expect(stepChord(step('x', 2, 'min7'))?.quality.symbol).toBe('m7');
    expect(stepChord(step('x', 2, 'nope'))).toBeNull();
  });

  it('inserts at the end by default or at a given index', () => {
    expect(insertStep(prog(), step('d', 9)).steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(insertStep(prog(), step('d', 9), 1).steps.map((s) => s.id)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('keeps the active step selected when steps move', () => {
    const moved = moveStep(prog(1), 1, 2); // move 'b' after 'c'
    expect(moved.steps.map((s) => s.id)).toEqual(['a', 'c', 'b']);
    expect(moved.steps[moved.active].id).toBe('b');
  });

  it('keeps the active index valid when a step is removed', () => {
    expect(removeStep(prog(2), 'c').active).toBe(1);
    expect(removeStep(prog(1), 'a').active).toBe(0);
    const empty = removeStep(removeStep(removeStep(prog(), 'a'), 'b'), 'c');
    expect(empty).toEqual({ steps: [], active: 0 });
  });

  it('advances (and loops) only when the active chord is played', () => {
    expect(advance(prog(0), [48, 64, 67])).toEqual({ progression: prog(1), hit: true });
    expect(advance(prog(0), [53, 57, 60])).toEqual({ progression: prog(0), hit: false });
    expect(advance(prog(2), [55, 59, 65]).progression.active).toBe(0);
    expect(advance({ steps: [], active: 0 }, [60, 64, 67]).hit).toBe(false);
  });
});

describe('insertSteps', () => {
  it('inserts several steps in order and keeps the active chord', () => {
    const p = insertSteps(prog(1), [step('x', 2), step('y', 7), step('z', 0)], 1);
    expect(p.steps.map((s) => s.id)).toEqual(['a', 'x', 'y', 'z', 'b', 'c']);
    expect(p.steps[p.active].id).toBe('b');
  });
  it('appends by default', () => {
    expect(insertSteps(prog(), [step('x', 2), step('y', 7)]).steps.map((s) => s.id)).toEqual(['a', 'b', 'c', 'x', 'y']);
  });
});

describe('step spelling', () => {
  it('names a step with flats when asked', () => {
    expect(stepName({ id: 's', root: 10, qualityId: 'maj7', flats: true })).toBe('Bbmaj7');
    expect(stepName({ id: 's', root: 10, qualityId: 'maj7' })).toBe('A#maj7');
  });
});

describe('step inversions', () => {
  it('names an inverted step with its bass', () => {
    expect(stepName({ id: 's', root: 0, qualityId: 'maj', inversion: 1 })).toBe('C/E');
    expect(stepName({ id: 's', root: 10, qualityId: 'maj7', inversion: 3, flats: true })).toBe('Bbmaj7/A');
    expect(stepName({ id: 's', root: 0, qualityId: 'maj', inversion: 0 })).toBe('C');
  });

  it('sets or clears the inversion of one step', () => {
    const p = setStepInversion(prog(), 'b', 2);
    expect(p.steps[1].inversion).toBe(2);
    expect(p.steps[0].inversion).toBeUndefined();
    expect(setStepInversion(p, 'b', undefined).steps[1].inversion).toBeUndefined();
  });

  it('requires the right bass when an inversion is set', () => {
    const p = setStepInversion(prog(0), 'a', 1); // C/E
    expect(advance(p, [48, 64, 67]).hit).toBe(false); // C in the bass
    expect(advance(p, [52, 60, 67]).hit).toBe(true); // E in the bass
  });

  it('accepts any voicing when no inversion is set', () => {
    expect(advance(prog(0), [52, 60, 67]).hit).toBe(true);
  });
});

describe('step octave', () => {
  const c = (extra = {}) => ({ id: 'a', root: 0, qualityId: 'maj', ...extra });

  it('shifts the piano voicing by octaves without renaming the chord', () => {
    expect(stepVoicing(c())).toEqual([48, 52, 55]); // shown around C3 by default
    expect(stepVoicing(c({ octave: 1 }))).toEqual([60, 64, 67]);
    expect(stepVoicing(c({ octave: 1, inversion: 1 }))).toEqual([64, 67, 72]);
    expect(stepName(c({ octave: 1 }))).toBe('C');
  });

  it('changes the octave of one step, staying on the keyboard', () => {
    const p: Progression = { steps: [c()], active: 0 };
    expect(shiftStepOctave(p, 'a', 1).steps[0].octave).toBe(1);
    expect(shiftStepOctave(shiftStepOctave(p, 'a', 1), 'a', -1).steps[0].octave).toBeUndefined();
    let high = p;
    for (let i = 0; i < 10; i++) high = shiftStepOctave(high, 'a', 1);
    expect(Math.max(...stepVoicing(high.steps[0]))).toBeLessThanOrEqual(PIANO_HIGH);
    let low = p;
    for (let i = 0; i < 10; i++) low = shiftStepOctave(low, 'a', -1);
    expect(Math.min(...stepVoicing(low.steps[0]))).toBeGreaterThanOrEqual(PIANO_LOW);
  });

  it('accepts the chord in any octave', () => {
    const p: Progression = { steps: [c({ octave: 1 })], active: 0 };
    expect(advance(p, [48, 52, 55]).hit).toBe(true);
  });
});
