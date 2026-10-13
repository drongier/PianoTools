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
