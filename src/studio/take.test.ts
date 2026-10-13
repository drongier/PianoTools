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
