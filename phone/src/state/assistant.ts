import { create } from 'zustand';
import { describeAction, parseAction, planAction } from '@/lib/actions';
import { shortNames } from '@/lib/apps';
import { executeCalls, friendlyError, type Outcome } from '@/lib/execute';
import { buildGrammar } from '@/lib/grammar';
import { haptic } from '@/lib/haptics';
import { modelById } from '@/lib/models';
import { systemPrompt } from '@/lib/prompt';
import { parseRules } from '@/lib/rules';
import { isTitle, type AssistantAction, type Title } from '@/lib/types';
import { complete, loadedModelPath, loadModel, llmAvailable } from '@/native/llm';
import { isDownloaded, modelPath } from '@/native/modelFiles';
import { activeClient, useStore } from './store';

export type Msg =
  | { id: string; role: 'user'; text: string; via: 'voice' | 'text' }
  | {
      id: string; role: 'action'; action: AssistantAction; summary: string; source: 'rules' | 'model'; ms?: number;
      status: 'running' | 'done' | 'choose' | 'confirm' | 'failed'; note?: string; titles?: Title[];
    }
  | { id: string; role: 'note'; text: string; tone: 'info' | 'error' };

type ModelStatus = 'none' | 'loading' | 'ready' | 'error';

type A = {
  msgs: Msg[];
  busy: boolean;
  thinking: boolean;
  modelStatus: ModelStatus;
  modelPct: number;
  modelError: string | null;
  send: (text: string, via?: 'voice' | 'text') => Promise<void>;
  pick: (msgId: string, t: Title) => Promise<void>;
  clear: () => void;
  warmUp: () => Promise<boolean>;
};

// What the TV says was watched, for the model's context and for "continue". Refreshed per request.
let history: Title[] = [];
const YES = /^(yes|yeah|yep|yup|sure|ok(ay)?|go( ahead)?|do it|play it|that one|continue|resume)[.!]?$/i;

let seq = 0;
const id = () => `${Date.now().toString(36)}${(++seq).toString(36)}`;

export const useAssistant = create<A>((set, get) => {
  const push = (m: Msg) => set({ msgs: [...get().msgs, m] });
  const patch = (mid: string, p: Partial<Msg>) =>
    set({ msgs: get().msgs.map((m) => (m.id === mid ? ({ ...m, ...p } as Msg) : m)) });

  const apply = (mid: string, o: Outcome) => {
    patch(mid, { status: o.status, note: o.note, titles: 'titles' in o ? o.titles : undefined });
    if (o.status === 'failed') haptic.err(); else haptic.ok();
    if (o.status === 'done') setTimeout(() => useStore.getState().refreshNow(), 1500);
  };

  return {
    msgs: [], busy: false, thinking: false, modelStatus: 'none', modelPct: 0, modelError: null,

    /** Loads the chosen model if it's downloaded. True when ready. */
    warmUp: async () => {
      const spec = modelById(useStore.getState().modelId);
      if (!llmAvailable || !spec || !isDownloaded(spec)) { set({ modelStatus: 'none' }); return false; }
      const path = modelPath(spec);
      if (loadedModelPath() === path) { set({ modelStatus: 'ready' }); return true; }
      set({ modelStatus: 'loading', modelPct: 0, modelError: null });
      try {
        await loadModel(path, (p) => set({ modelPct: p }));
        set({ modelStatus: 'ready' });
        return true;
      } catch (e: any) {
        set({ modelStatus: 'error', modelError: e?.message ?? 'The model failed to load.' });
        return false;
      }
    },

    send: async (raw, via = 'text') => {
      const text = raw.trim();
      if (!text || get().busy) return;
      const client = activeClient();
      push({ id: id(), role: 'user', text, via });
      set({ busy: true });
      try {
        const apps = useStore.getState().apps;
        // "Yes" to an open "continue …?" question: play its first suggestion.
        const open = [...get().msgs].reverse().find((m) => m.role === 'action') as Extract<Msg, { role: 'action' }> | undefined;
        if (open?.status === 'confirm' && open.titles?.length && YES.test(text)) {
          await get().pick(open.id, open.titles[0]);
          return;
        }
        if (client) client.recent().then((r) => { history = r.filter(isTitle); }).catch(() => {});
        let action: AssistantAction | null = parseRules(text, apps);
        let source: 'rules' | 'model' = 'rules';
        let ms: number | undefined;

        if (!action) {
          const ready = get().modelStatus === 'ready' || (await get().warmUp());
          if (!ready) {
            push({
              id: id(), role: 'note', tone: 'info',
              text: get().modelStatus === 'error'
                ? `The assistant model didn’t load (${get().modelError}). Simple commands like “open Netflix” or “down twice” still work.`
                : 'I can do simple commands like “open Netflix”, “play Dark” or “down twice”. For anything looser, download a model in Settings.',
            });
            return;
          }
          set({ thinking: true });
          try {
            const names = shortNames(apps);
            const out = await complete(systemPrompt(names, history.slice(0, 6), apps), text, buildGrammar(names));
            ms = out.ms;
            action = parseAction(out.text);
            source = 'model';
          } finally {
            set({ thinking: false });
          }
          if (!action) {
            push({ id: id(), role: 'note', tone: 'error', text: 'I didn’t catch that. Try saying it another way.' });
            return;
          }
        }

        const mid = id();
        const summary = describeAction(action, apps);
        if (action.action === 'reply') {
          push({ id: mid, role: 'action', action, summary, source, ms, status: 'done' });
          return;
        }
        push({ id: mid, role: 'action', action, summary, source, ms, status: 'running' });
        if (!client) { patch(mid, { status: 'failed', note: 'No TV is paired.' }); return; }
        apply(mid, await executeCalls(planAction(action, apps), client, apps));
      } catch (e) {
        push({ id: id(), role: 'note', tone: 'error', text: friendlyError(e) });
      } finally {
        set({ busy: false });
      }
    },

    pick: async (mid, t) => {
      const client = activeClient();
      if (!client) return;
      patch(mid, { status: 'running', note: `Opening ${t.title}…`, titles: undefined });
      const apps = useStore.getState().apps;
      // History items reopen on the app they were watched on.
      apply(mid, await executeCalls([{ kind: 'play', title: t.title, pkg: t.watchedPkg ?? t.offers?.[0]?.pkg ?? null, id: t.id }], client, apps));
    },

    clear: () => set({ msgs: [] }),
  };
});
