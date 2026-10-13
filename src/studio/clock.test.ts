import { describe, expect, it } from 'vitest';
import { audioToPerformanceMs, heardTimeMs } from './clock';

describe('audioToPerformanceMs', () => {
  it('maps audio time onto the performance clock', () => {
    expect(audioToPerformanceMs({ contextTime: 2, performanceTime: 5_000 }, 3)).toBe(6_000);
  });
  it('adds the output latency: a click is heard after it is scheduled', () => {
    expect(audioToPerformanceMs({ contextTime: 2, performanceTime: 5_000 }, 3, 0.02)).toBe(6_020);
  });
});

describe('heardTimeMs', () => {
  const now = { contextTime: 10, performanceTime: 20_000 };
  it('trusts a real output timestamp, which already includes the output latency', () => {
    expect(heardTimeMs(3, { contextTime: 2, performanceTime: 5_000 }, now, 0.2)).toBe(6_000);
  });
  it('adds the latency when only the current time is known', () => {
    expect(heardTimeMs(11, { contextTime: 0, performanceTime: 0 }, now, 0.2)).toBe(21_200);
    expect(heardTimeMs(11, null, now, 0.2)).toBe(21_200);
  });
});
