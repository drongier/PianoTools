import { useEffect, useMemo, useRef, useState } from 'react';
import abcjs from 'abcjs';
import { toAbc } from '../abc';
import { transcribe } from '../transcribe';
import type { Take } from '../take';

/** Draws the take's score with abcjs; a failure shows a message, the take is untouched. */
export function ScoreView({ take }: { take: Take }) {
  const ref = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState(false);
  const abc = useMemo(() => {
    try {
      return toAbc(transcribe(take));
    } catch {
      return null;
    }
  }, [take]);

  useEffect(() => {
    if (!ref.current || abc === null) return;
    try {
      const color = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e8e8f0';
      abcjs.renderAbc(ref.current, abc, { responsive: 'resize', foregroundColor: color, jazzchords: true, add_classes: true });
      setRenderError(false);
    } catch {
      setRenderError(true);
    }
  }, [abc]);

  if (abc === null || renderError) {
    return <p className="empty score-error">La partition n’a pas pu être affichée. La prise est intacte : essaie d’autres réglages.</p>;
  }
  // abcjs restyles the svg's parent (overflow: hidden, aspect-ratio padding), so it
  // draws into an inner div and the outer one stays the scroll container.
  return (
    <div className="score-view">
      <div ref={ref} />
    </div>
  );
}
