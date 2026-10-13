import { TICKS_PER_BEAT as T, type Score, type ScoreEvent } from './score';

const SHARPS: [string, string][] = [['C', ''], ['C', '^'], ['D', ''], ['D', '^'], ['E', ''], ['F', ''], ['F', '^'], ['G', ''], ['G', '^'], ['A', ''], ['A', '^'], ['B', '']];
const FLATS: [string, string][] = [['C', ''], ['D', '_'], ['D', ''], ['E', '_'], ['E', ''], ['F', ''], ['G', '_'], ['G', ''], ['A', '_'], ['A', ''], ['B', '_'], ['B', '']];
const BARS_PER_LINE = 4;

/**
 * One pitch in ABC. `state` holds the accidental in force for each letter and
 * octave in the current bar, as in standard notation; the caller resets it each bar.
 */
export function abcPitch(midi: number, flats: boolean, state: Map<string, string>): string {
  const [letter, accidental] = (flats ? FLATS : SHARPS)[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  const key = `${letter}${octave}`;
  let prefix = '';
  if ((state.get(key) ?? '') !== accidental) {
    prefix = accidental || '=';
    state.set(key, accidental);
  }
  let name = octave >= 5 ? letter.toLowerCase() : letter;
  if (octave > 5) name += "'".repeat(octave - 5);
  if (octave < 4) name += ','.repeat(4 - octave);
  return prefix + name;
}

/** ABC lengths are in sixteenths (L:1/16); triplet eighths are written as eighths inside a (3 group. */
function abcLength(event: ScoreEvent): string {
  const length = event.triplet ? event.ticks / 2 : event.ticks / 3;
  return length === 1 ? '' : String(length);
}

function measureAbc(events: ScoreEvent[], flats: boolean): string {
  const state = new Map<string, string>();
  let out = '';
  events.forEach((event, i) => {
    const beat = Math.floor(event.start / T);
    if (i > 0 && event.start % T === 0) out += ' '; // break beams between beats
    const previous = events[i - 1];
    if (event.triplet && !(previous?.triplet && Math.floor(previous.start / T) === beat)) {
      const count = events.filter((e) => e.triplet && Math.floor(e.start / T) === beat).length;
      out += `(3:2:${count}`;
    }
    if (event.chordName) out += `"${event.chordName}"`;
    if (event.pitches.length === 0) out += 'z';
    else if (event.pitches.length === 1) out += abcPitch(event.pitches[0], flats, state);
    else out += `[${event.pitches.map((p) => abcPitch(p, flats, state)).join('')}]`;
    out += abcLength(event);
    if (event.tie) out += '-';
  });
  return out;
}

/** Grand-staff piano score in ABC notation, four bars per line. */
export function toAbc(score: Score): string {
  const lines = [
    'X:1',
    `T:${score.title.replace(/[\r\n]+/g, ' ')}`,
    `M:${score.beatsPerBar}/4`,
    'L:1/16',
    `Q:1/4=${score.tempo}`,
    '%%staves {RH LH}',
    'V:RH clef=treble',
    'V:LH clef=bass',
  ];
  for (let first = 0; first < score.measures.length; first += BARS_PER_LINE) {
    const chunk = score.measures.slice(first, first + BARS_PER_LINE);
    const end = first + BARS_PER_LINE >= score.measures.length ? ' |]' : ' |';
    lines.push(`[V:RH] ${chunk.map((m) => measureAbc(m.treble, score.flats)).join(' | ')}${end}`);
    lines.push(`[V:LH] ${chunk.map((m) => measureAbc(m.bass, score.flats)).join(' | ')}${end}`);
  }
  return `${lines.join('\n')}\n`;
}
