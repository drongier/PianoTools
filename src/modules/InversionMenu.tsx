import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { chordName, chordVoicing, inversionName } from '../music/chords';
import { CHORD_DISPLAY_MIDI, pitchClass, pitchClassName } from '../music/notes';
import { shiftStepOctave, stepChord, stepVoicing, type ProgressionStep } from '../music/progression';
import { useMusicStore } from '../state/store';
import { OCTAVE_DOWN_CODE, OCTAVE_UP_CODE, keyLabels } from '../input/shortcuts';

interface Props {
  step: ProgressionStep;
  /** Card the menu opens under (viewport coordinates). */
  anchor: DOMRect;
  onClose: () => void;
}

/**
 * Position picker for a score chord. Rendered in a portal so the module's
 * scrolling and rounded corners don't clip it.
 */
export function InversionMenu({ step, anchor, onClose }: Props) {
  const setStepInversion = useMusicStore((s) => s.setStepInversion);
  const shiftOctave = useMusicStore((s) => s.shiftStepOctave);
  const ref = useRef<HTMLDivElement>(null);
  const chord = stepChord(step);
  const [keys, setKeys] = useState<[string, string]>(['Z', 'X']);
  useEffect(() => {
    void keyLabels([OCTAVE_DOWN_CODE, OCTAVE_UP_CODE]).then(([down, up]) => setKeys([down, up]));
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  useEffect(() => ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(), []);

  if (!chord) return null;
  const spell = (n: number) => pitchClassName(pitchClass(n), step.flats);
  const name = chordName(chord, step.flats);
  const choose = (inversion: number | undefined) => {
    setStepInversion(step.id, inversion);
    onClose();
  };

  const options: { inversion: number | undefined; label: string; detail: string }[] = [
    { inversion: undefined, label: 'Position libre', detail: 'toutes les positions sont acceptées' },
    ...chord.quality.intervals.map((_, i) => {
      const notes = chordVoicing(chord, CHORD_DISPLAY_MIDI, i);
      return { inversion: i, label: i === 0 ? name : `${name}/${spell(notes[0])}`, detail: `${inversionName(i)} · ${notes.map(spell).join(' ')}` };
    }),
  ];

  const canShift = (delta: number) => {
    const p = { steps: [step], active: 0 };
    return shiftStepOctave(p, step.id, delta).steps[0] !== step;
  };
  const bass = stepVoicing(step)[0];
  const bassLabel = `${spell(bass)}${Math.floor(bass / 12) - 1}`;

  const left = Math.min(anchor.left, window.innerWidth - 248);
  return createPortal(
    <div ref={ref} className="menu" role="menu" aria-label={`Position de ${name}`} style={{ top: anchor.bottom + 6, left: Math.max(8, left) }}>
      <div className="menu-title">Octave sur le piano</div>
      <div className="menu-octave">
        <button className="icon-button" onClick={() => shiftOctave(step.id, -1)} disabled={!canShift(-1)} aria-label="Octave plus basse" title={`Octave plus basse (${keys[0]})`}>−</button>
        <span className="menu-octave-value">
          basse en <strong>{bassLabel}</strong>
        </span>
        <button className="icon-button" onClick={() => shiftOctave(step.id, 1)} disabled={!canShift(1)} aria-label="Octave plus haute" title={`Octave plus haute (${keys[1]})`}>+</button>
      </div>
      <div className="menu-hint">
        Raccourcis : <kbd>{keys[0]}</kbd> <kbd>{keys[1]}</kbd> sur l’accord actif
      </div>
      <div className="menu-title">Position</div>
      {options.map((o) => (
        <button
          key={o.inversion ?? 'free'}
          role="menuitemradio"
          aria-checked={step.inversion === o.inversion}
          className={`menu-item ${step.inversion === o.inversion ? 'is-active' : ''}`}
          onClick={() => choose(o.inversion)}
        >
          <span className="menu-label">{o.label}</span>
          <span className="menu-detail">{o.detail}</span>
        </button>
      ))}
    </div>,
    document.body,
  );
}
