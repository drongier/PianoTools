import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { BeatsPerBar, Take, TranscriptionSettings } from './take';

export interface Transport {
  tempo: number;
  beatsPerBar: BeatsPerBar;
  metronome: boolean;
}

export type RecordingStatus = 'idle' | 'countIn' | 'recording';

export const STORAGE_FULL_MESSAGE = 'Plus de place pour sauvegarder les prises dans le navigateur. Supprime d’anciennes prises : la dernière reste disponible tant que la page est ouverte.';

interface StudioState {
  transport: Transport;
  takes: Take[];
  selectedId: string | null;
  status: RecordingStatus;
  message: string | null;

  setTransport: (patch: Partial<Transport>) => void;
  setStatus: (status: RecordingStatus) => void;
  setMessage: (message: string | null) => void;
  addTake: (take: Take) => void;
  renameTake: (id: string, name: string) => void;
  deleteTake: (id: string) => void;
  selectTake: (id: string) => void;
  updateSettings: (id: string, patch: Partial<TranscriptionSettings>) => void;
}

export function clampTempo(n: number): number {
  return Number.isFinite(n) ? Math.round(Math.min(240, Math.max(40, n))) : 90;
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED');
}

/** localStorage that reports a full quota instead of throwing. */
const safeStorage: StateStorage = {
  getItem: (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key, value) => {
    try {
      // Even reading `localStorage` throws when the browser blocks storage.
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(key, value);
    } catch (error) {
      // Blocked storage: takes just aren't remembered. Full storage: tell the user, once,
      // since setting state triggers another save.
      if (!isQuotaError(error) || useStudioStore.getState().message === STORAGE_FULL_MESSAGE) return;
      queueMicrotask(() => useStudioStore.setState({ message: STORAGE_FULL_MESSAGE }));
    }
  },
  removeItem: (key) => {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
};

export const useStudioStore = create<StudioState>()(
  persist(
    (set, get) => ({
      transport: { tempo: 90, beatsPerBar: 4, metronome: true },
      takes: [],
      selectedId: null,
      status: 'idle',
      message: null,

      setTransport: (patch) => set({ transport: { ...get().transport, ...patch } }),
      setStatus: (status) => set({ status }),
      setMessage: (message) => set({ message }),
      addTake: (take) => set({ takes: [take, ...get().takes], selectedId: take.id }),
      renameTake: (id, name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set({ takes: get().takes.map((t) => (t.id === id ? { ...t, name: trimmed } : t)) });
      },
      deleteTake: (id) => {
        const { takes, selectedId } = get();
        const index = takes.findIndex((t) => t.id === id);
        const rest = takes.filter((t) => t.id !== id);
        const nextSelected = selectedId === id ? (rest[Math.min(index, rest.length - 1)]?.id ?? null) : selectedId;
        set({ takes: rest, selectedId: nextSelected });
      },
      selectTake: (id) => set({ selectedId: id }),
      updateSettings: (id, patch) =>
        set({ takes: get().takes.map((t) => (t.id === id ? { ...t, settings: { ...t.settings, ...patch } } : t)) }),
    }),
    {
      name: 'pianotools.studio.v1',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ transport: s.transport, takes: s.takes, selectedId: s.selectedId }),
    },
  ),
);
