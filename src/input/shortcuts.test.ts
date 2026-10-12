import { describe, expect, it } from 'vitest';
import { octaveShortcut } from './shortcuts';

const key = (code: string, extra: Partial<{ repeat: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) =>
  ({ code, repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra });

describe('octaveShortcut', () => {
  it('uses the Ableton keys by physical position (Z/X on QWERTY, W/X on AZERTY)', () => {
    expect(octaveShortcut(key('KeyZ'))).toBe(-1);
    expect(octaveShortcut(key('KeyX'))).toBe(1);
  });
  it('ignores other keys, auto-repeat and shortcuts with modifiers', () => {
    expect(octaveShortcut(key('KeyW'))).toBeNull();
    expect(octaveShortcut(key('KeyX', { repeat: true }))).toBeNull();
    expect(octaveShortcut(key('KeyZ', { metaKey: true }))).toBeNull(); // Cmd+Z stays undo
    expect(octaveShortcut(key('KeyX', { ctrlKey: true }))).toBeNull();
  });
});
