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
