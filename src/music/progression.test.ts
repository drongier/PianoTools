import { describe, expect, it } from 'vitest';
import { advance, insertStep, moveStep, removeStep, stepChord, type Progression } from './progression';

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
