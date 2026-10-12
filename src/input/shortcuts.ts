/** Typing in a text field (e.g. the chord search) must not trigger notes or shortcuts. */
export function isTyping(target: EventTarget | null): boolean {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

type KeyLike = Pick<KeyboardEvent, 'code' | 'repeat' | 'ctrlKey' | 'metaKey' | 'altKey' | 'target'>;

/** Physical keys used by Ableton to shift octaves: Z/X on QWERTY, W/X on AZERTY. */
export const OCTAVE_DOWN_CODE = 'KeyZ';
export const OCTAVE_UP_CODE = 'KeyX';

/** −1 / +1 for an octave shortcut, null otherwise. Modifier combos (Cmd+Z…) are left to the browser. */
export function octaveShortcut(e: KeyLike): -1 | 1 | null {
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return null;
  if (e.code === OCTAVE_DOWN_CODE) return -1;
  if (e.code === OCTAVE_UP_CODE) return 1;
  return null;
}

/** Listens for the octave shortcuts; returns a cleanup. */
export function connectOctaveShortcuts(onShift: (delta: -1 | 1) => void): () => void {
  const onKeyDown = (e: KeyboardEvent) => {
    const delta = octaveShortcut(e);
    if (delta) onShift(delta);
  };
  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}

interface LayoutMapNavigator {
  keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> };
}

/**
 * Printed label of physical keys on the user's layout ("W" for KeyZ on AZERTY).
 * Falls back to the QWERTY letter where the browser can't tell (Firefox, Safari).
 */
export async function keyLabels(codes: string[]): Promise<string[]> {
  const fallback = codes.map((c) => c.replace(/^Key/, ''));
  try {
    const map = await (navigator as LayoutMapNavigator).keyboard?.getLayoutMap?.();
    return map ? codes.map((c, i) => (map.get(c) ?? fallback[i]).toUpperCase()) : fallback;
  } catch {
    return fallback;
  }
}
