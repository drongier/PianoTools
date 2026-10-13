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
