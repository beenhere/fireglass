import { create } from 'zustand';
import { haptic } from '@/lib/haptics';
import { MODELS, type ModelSpec } from '@/lib/models';
import { unloadModel } from '@/native/llm';
import { deleteModel, isDownloaded, ModelDownload, pausedBytes } from '@/native/modelFiles';
import { useAssistant } from './assistant';
import { useStore } from './store';

export type DlState =
  | { kind: 'none' }
  | { kind: 'paused'; written: number }
  | { kind: 'active'; written: number; total: number }
  | { kind: 'done' }
  | { kind: 'error'; message: string };

const tasks = new Map<string, ModelDownload>();

type D = {
  states: Record<string, DlState>;
  refresh: () => void;
  start: (m: ModelSpec) => void;
  pause: (m: ModelSpec) => Promise<void>;
  cancel: (m: ModelSpec) => void;
  remove: (m: ModelSpec) => Promise<void>;
};

const initial = (m: ModelSpec): DlState => {
  try {
    if (isDownloaded(m)) return { kind: 'done' };
    const p = pausedBytes(m);
    return p != null ? { kind: 'paused', written: p } : { kind: 'none' };
  } catch {
    return { kind: 'none' };
  }
};

export const useDownloads = create<D>((set, get) => {
  const put = (id: string, s: DlState) => set({ states: { ...get().states, [id]: s } });
  let lastPaint = 0;
  return {
    states: Object.fromEntries(MODELS.map((m) => [m.id, initial(m)])),
    refresh: () => set({ states: Object.fromEntries(MODELS.map((m) => [m.id, tasks.has(m.id) ? get().states[m.id] : initial(m)])) }),

    start: (m) => {
      if (tasks.has(m.id)) return;
      const prior = get().states[m.id];
      const task = new ModelDownload(m, ({ written, total }) => {
        const now = Date.now();
        if (now - lastPaint < 120 && written < total) return; // keep re-renders calm
        lastPaint = now;
        put(m.id, { kind: 'active', written, total });
      });
      tasks.set(m.id, task);
      put(m.id, { kind: 'active', written: prior.kind === 'paused' ? prior.written : 0, total: m.bytes });
      task.run().then((finished) => {
        tasks.delete(m.id);
        if (finished) {
          haptic.ok();
          put(m.id, { kind: 'done' });
          // first model downloaded becomes the one in use
          if (!useStore.getState().modelId || !MODELS.some((x) => x.id === useStore.getState().modelId && isDownloaded(x))) {
            useStore.getState().setModel(m.id);
            useAssistant.getState().warmUp();
          }
        }
      }).catch((e) => {
        tasks.delete(m.id);
        const s = get().states[m.id];
        if (s.kind === 'none' || s.kind === 'paused') return; // cancelled or paused
        haptic.err();
        put(m.id, { kind: 'error', message: e?.message?.includes('cancel') ? 'Download stopped.' : 'The download stopped. Check your connection and try again.' });
      });
    },

    pause: async (m) => {
      const t = tasks.get(m.id);
      if (!t) return;
      const s = get().states[m.id];
      put(m.id, { kind: 'paused', written: s.kind === 'active' ? s.written : 0 });
      await t.pause();
    },

    cancel: (m) => {
      const t = tasks.get(m.id);
      put(m.id, { kind: 'none' });
      if (t) { tasks.delete(m.id); t.cancel(); } else deleteModel(m);
    },

    remove: async (m) => {
      if (useStore.getState().modelId === m.id) {
        await unloadModel();
        useStore.getState().setModel(MODELS.find((x) => x.id !== m.id && isDownloaded(x))?.id ?? null);
        useAssistant.setState({ modelStatus: 'none' });
      }
      deleteModel(m);
      put(m.id, { kind: 'none' });
    },
  };
});
