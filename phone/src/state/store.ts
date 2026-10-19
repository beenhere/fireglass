import { create } from 'zustand';
import { TvClient, ApiError } from '@/lib/api';
import type { NowPlaying, TvApp, TvInfo } from '@/lib/types';
import { readJson, secure, writeJson } from '@/native/storage';
import { bootstrapKeys, type BootstrapStatus } from '@/native/keysBootstrap';

export type SavedTv = { id: string; name: string; host: string; port: number; model?: string; pairedAt: number };

type Persisted = { tvs: SavedTv[]; activeId: string | null; modelId: string | null; padMode: 'dpad' | 'touch' };
const FILE = 'state.json';
const tokenKey = (id: string) => `tvtoken.${id}`;
export const tvId = (host: string, port: number) => `${host}:${port}`;

type State = Persisted & {
  hydrated: boolean;
  tokens: Record<string, string>;
  // live data for the active TV
  info: TvInfo | null;
  apps: TvApp[];
  now: NowPlaying | null;
  online: boolean | null;
  hydrate: () => Promise<void>;
  addTv: (tv: Omit<SavedTv, 'id' | 'pairedAt'>, token: string) => Promise<string>;
  forgetTv: (id: string) => Promise<void>;
  renameTv: (id: string, name: string) => void;
  setActive: (id: string) => void;
  setModel: (id: string | null) => void;
  setPadMode: (m: 'dpad' | 'touch') => void;
  refreshInfo: () => Promise<void>;
  refreshApps: () => Promise<void>;
  refreshNow: () => Promise<void>;
  /** Starting the TV's key sender over adb: progress, or the error to show. */
  keysStatus: BootstrapStatus | 'error' | null;
  keysError: string | null;
  startKeys: () => Promise<void>;
};

// Start the key sender by ourselves once per TV per app run; after that only on request.
const autoStarted = new Set<string>();

const persist = (s: Persisted) => writeJson(FILE, { tvs: s.tvs, activeId: s.activeId, modelId: s.modelId, padMode: s.padMode });

export const useStore = create<State>((set, get) => {
  const save = () => { const s = get(); persist(s); };
  const markOffline = (e: unknown) => {
    if (e instanceof ApiError && (e.code === 'offline' || e.code === 'timeout')) set({ online: false });
  };
  return {
    tvs: [], activeId: null, modelId: null, padMode: 'dpad',
    hydrated: false, tokens: {}, info: null, apps: [], now: null, online: null,
    keysStatus: null, keysError: null,

    hydrate: async () => {
      const p = readJson<Partial<Persisted>>(FILE, {});
      const tvs = p.tvs ?? [];
      const tokens: Record<string, string> = {};
      await Promise.all(tvs.map(async (t) => { const v = await secure.get(tokenKey(t.id)); if (v) tokens[t.id] = v; }));
      const usable = tvs.filter((t) => tokens[t.id]);
      const activeId = usable.some((t) => t.id === p.activeId) ? p.activeId! : usable[0]?.id ?? null;
      set({ tvs: usable, tokens, activeId, modelId: p.modelId ?? null, padMode: p.padMode ?? 'dpad', hydrated: true });
    },

    addTv: async (tv, token) => {
      const id = tvId(tv.host, tv.port);
      await secure.set(tokenKey(id), token);
      // same TV seen under a new address replaces its old entry
      const tvs = get().tvs.filter((t) => t.id !== id && t.name !== tv.name);
      for (const old of get().tvs) if (old.id !== id && old.name === tv.name) await secure.del(tokenKey(old.id));
      const entry: SavedTv = { ...tv, id, pairedAt: Date.now() };
      set({ tvs: [...tvs, entry], tokens: { ...get().tokens, [id]: token }, activeId: id, info: null, apps: [], now: null, online: true });
      save();
      return id;
    },

    forgetTv: async (id) => {
      await secure.del(tokenKey(id));
      const tvs = get().tvs.filter((t) => t.id !== id);
      const tokens = { ...get().tokens };
      delete tokens[id];
      const activeId = get().activeId === id ? tvs[0]?.id ?? null : get().activeId;
      set({ tvs, tokens, activeId, ...(get().activeId === id ? { info: null, apps: [], now: null, online: null } : {}) });
      save();
    },

    renameTv: (id, name) => {
      set({ tvs: get().tvs.map((t) => (t.id === id ? { ...t, name: name.trim() || t.name } : t)) });
      save();
    },

    setActive: (id) => {
      if (id === get().activeId) return;
      set({ activeId: id, info: null, apps: [], now: null, online: null });
      save();
    },

    setModel: (modelId) => { set({ modelId }); save(); },
    setPadMode: (padMode) => { set({ padMode }); save(); },

    refreshInfo: async () => {
      const c = activeClient();
      if (!c) return;
      try {
        const info = await c.info(4000);
        set({ info, online: true });
        const id = get().activeId;
        if (info.keys === 'needs_bootstrap' && id && !autoStarted.has(id) && !get().keysStatus) {
          autoStarted.add(id);
          get().startKeys();
        }
      } catch (e) { markOffline(e); }
    },
    startKeys: async () => {
      const c = activeClient();
      const tv = get().tvs.find((t) => t.id === get().activeId);
      if (!c || !tv || (get().keysStatus && get().keysStatus !== 'error')) return;
      set({ keysStatus: 'connecting', keysError: null });
      try {
        const { adb_port, cmd } = await c.keysBootstrap();
        // Two goes: approving a new phone on the TV drops that first connection.
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            await bootstrapKeys(tv.host, adb_port, cmd, (s) => set({ keysStatus: s }));
          } catch (e) {
            if (attempt === 1) throw e;
            continue;
          }
          // The sender takes about a second to come up.
          for (let i = 0; i < 8; i++) {
            await new Promise((r) => setTimeout(r, 500));
            const info = await c.info(4000);
            set({ info });
            if (info.keys === 'ready') { set({ keysStatus: null }); return; }
          }
        }
        throw new Error('The TV didn’t start its key sender.');
      } catch (e) {
        set({ keysStatus: 'error', keysError: e instanceof Error ? e.message : String(e) });
      }
    },
    refreshApps: async () => {
      const c = activeClient();
      if (!c) return;
      try { set({ apps: await c.apps(), online: true }); } catch (e) { markOffline(e); }
    },
    refreshNow: async () => {
      const c = activeClient();
      if (!c) return;
      try { set({ now: await c.now(), online: true }); } catch (e) { markOffline(e); }
    },
  };
});

let cached: { key: string; client: TvClient } | null = null;

/** Client for the TV in use, or null before pairing. */
export function activeClient(): TvClient | null {
  const { tvs, activeId, tokens } = useStore.getState();
  const tv = tvs.find((t) => t.id === activeId);
  if (!tv) return null;
  const key = `${tv.id}|${tokens[tv.id]}`;
  if (cached?.key !== key) cached = { key, client: new TvClient(tv.host, tv.port, tokens[tv.id] ?? null) };
  return cached.client;
}

export const useActiveTv = () => useStore((s) => s.tvs.find((t) => t.id === s.activeId) ?? null);
export const useClient = () => {
  useStore((s) => `${s.activeId}|${s.activeId ? s.tokens[s.activeId] : ''}`);
  return activeClient();
};
