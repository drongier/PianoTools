import { create } from 'zustand';
import type { Layout, LayoutItem } from 'react-grid-layout';

export const GRID_COLS = 12;
const STORAGE_KEY = 'pianotools.layout.v1';

export const DEFAULT_LAYOUT: LayoutItem[] = [
  { i: 'picker', x: 0, y: 0, w: 3, h: 14, minW: 2, minH: 5 },
  { i: 'current', x: 3, y: 0, w: 6, h: 6, minW: 3, minH: 4 },
  { i: 'history', x: 9, y: 0, w: 3, h: 6, minW: 2, minH: 3 },
  { i: 'progression', x: 3, y: 6, w: 9, h: 3, minW: 3, minH: 3 },
  { i: 'piano', x: 3, y: 9, w: 9, h: 5, minW: 4, minH: 3 },
];

/** Saved layout merged onto the defaults, so new modules still appear. Storage may be unavailable. */
export function loadLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as LayoutItem[];
    return DEFAULT_LAYOUT.map((d) => {
      const s = saved.find((item) => item.i === d.i);
      return s ? { ...d, x: s.x, y: s.y, w: s.w, h: s.h } : d;
    });
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveLayout(layout: Layout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout.map(({ i, x, y, w, h }) => ({ i, x, y, w, h }))));
  } catch {
    // Storage blocked: the layout just won't be remembered.
  }
}

interface LayoutState {
  layout: Layout;
  setLayout: (layout: Layout) => void;
  reset: () => void;
}

/** Training-page layout, shared with the top bar's reset button. */
export const useLayoutStore = create<LayoutState>()((set) => ({
  layout: loadLayout(),
  setLayout: (layout) => {
    saveLayout(layout);
    set({ layout });
  },
  reset: () => {
    saveLayout(DEFAULT_LAYOUT);
    set({ layout: DEFAULT_LAYOUT });
  },
}));
