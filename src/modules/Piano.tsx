import { useEffect, useRef, useState, type RefObject } from 'react';
import { PIANO_HIGH, PIANO_LOW, isBlackKey, pitchClass, pitchClassName } from '../music/notes';

const WHITE_W = 24;
/** Key length bounds, in key widths: keeps keys looking like keys whatever the module size. */
const MIN_H = WHITE_W * 3;
const MAX_H = WHITE_W * 6.5;
const BLACK_W = WHITE_W * 0.6;

interface PianoProps {
  held: readonly number[];
  /** Notes of the chord to play, shown as a visual cue. */
  target?: readonly number[];
  /** Held notes known to be right even if they are not in the target (chord just validated). */
  right?: readonly number[];
  /** Label target keys with flats (Bb) rather than sharps (A#). */
  flats?: boolean;
  low?: number;
  high?: number;
}

/**
 * SVG keyboard that stretches to its module. With a target, held keys turn
 * green when they belong to the chord (any octave) and red otherwise.
 */
export function Piano({ held, target = [], right = [], flats = false, low = PIANO_LOW, high = PIANO_HIGH }: PianoProps) {
  const noteName = (n: number) => pitchClassName(pitchClass(n), flats);
  const heldSet = new Set(held);
  const rightSet = new Set(right);
  const targetSet = new Set(target);
  const targetPcs = new Set(target.map(pitchClass));
  const whites: number[] = [];
  for (let n = low; n <= high; n++) if (!isBlackKey(n)) whites.push(n);
  const xOf = new Map(whites.map((n, i) => [n, i * WHITE_W]));
  const totalW = whites.length * WHITE_W;
  const [ref, WHITE_H] = useKeyLength(totalW);
  const BLACK_H = WHITE_H * 0.62;

  const keyClass = (n: number) => {
    const classes = [isBlackKey(n) ? 'key key-black' : 'key key-white'];
    if (targetSet.has(n)) classes.push('is-target');
    if (heldSet.has(n)) {
      if (rightSet.has(n)) classes.push('is-right');
      else if (target.length === 0) classes.push('is-held');
      else classes.push(targetPcs.has(pitchClass(n)) ? 'is-right' : 'is-wrong');
    }
    return classes.join(' ');
  };

  const blacks: number[] = [];
  for (let n = low; n <= high; n++) if (isBlackKey(n) && xOf.has(n - 1)) blacks.push(n);

  return (
    <svg ref={ref} className="piano" viewBox={`0 0 ${totalW} ${WHITE_H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Clavier de piano">
      {whites.map((n) => (
        <g key={n}>
          <rect className={keyClass(n)} x={xOf.get(n)! + 0.5} y={0} width={WHITE_W - 1} height={WHITE_H} rx={2} />
          {targetSet.has(n) && <text className="key-label" x={xOf.get(n)! + WHITE_W / 2} y={WHITE_H - 10}>{noteName(n)}</text>}
          {n === 60 && !targetSet.has(n) && <circle className="key-c4" cx={xOf.get(n)! + WHITE_W / 2} cy={WHITE_H - 10} r={2.5} />}
        </g>
      ))}
      {blacks.map((n) => {
        const x = xOf.get(n - 1)! + WHITE_W - BLACK_W / 2;
        return (
          <g key={n}>
            <rect className={keyClass(n)} x={x} y={0} width={BLACK_W} height={BLACK_H} rx={1.5} />
            {targetSet.has(n) && <text className="key-label key-label-black" x={x + BLACK_W / 2} y={BLACK_H - 8}>{noteName(n)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Key length (viewBox units) matching the element's aspect ratio, within realistic bounds. */
function useKeyLength(totalW: number): [RefObject<SVGSVGElement | null>, number] {
  const ref = useRef<SVGSVGElement>(null);
  const [length, setLength] = useState(WHITE_W * 5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0) setLength(Math.min(MAX_H, Math.max(MIN_H, (totalW * height) / width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [totalW]);
  return [ref, length];
}
