/**
 * Converts an AudioContext time (seconds) to the performance.now() clock (ms),
 * from a matching pair of timestamps. The output latency is when the sound
 * actually reaches the ears, which is what the player follows.
 */
export function audioToPerformanceMs(
  stamp: { contextTime: number; performanceTime: number },
  audioTime: number,
  outputLatencySec = 0,
): number {
  return stamp.performanceTime + (audioTime - stamp.contextTime + outputLatencySec) * 1000;
}

type Stamp = { contextTime: number; performanceTime: number };

/**
 * When a sound scheduled at `audioTime` reaches the ears, in the performance.now() clock.
 * A real AudioContext output timestamp already includes the output latency; the
 * fallback pair (currentTime, now) does not, so the latency is added only then.
 */
export function heardTimeMs(audioTime: number, outputStamp: Stamp | null, now: Stamp, outputLatencySec: number): number {
  if (outputStamp && outputStamp.contextTime && outputStamp.performanceTime) return audioToPerformanceMs(outputStamp, audioTime);
  return audioToPerformanceMs(now, audioTime, outputLatencySec);
}
