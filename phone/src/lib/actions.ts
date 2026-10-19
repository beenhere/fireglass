import { resolveApp } from './apps';
import { KEYS, type AssistantAction, type Key, type TvApp } from './types';

/** One API call (or a line for the user) an assistant action turns into. */
export type Call =
  | { kind: 'key'; key: Key }
  | { kind: 'text'; text: string; submit: boolean }
  | { kind: 'launch'; pkg: string; label: string }
  | { kind: 'play'; title: string; pkg: string | null; id: string | null }
  | { kind: 'search'; query: string }
  | { kind: 'continue'; title: string | null; pkg: string | null }
  | { kind: 'say'; text: string };

const MAX_KEYS = 12;
const isKey = (k: unknown): k is Key => typeof k === 'string' && (KEYS as readonly string[]).includes(k);
const str = (v: unknown, max = 200) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * Validates model output (a JSON string, possibly with chatter around it, or an object) as one of
 * the contract's assistant actions. Returns null when it isn't one.
 */
export function parseAction(raw: unknown): AssistantAction | null {
  let o: any = raw;
  if (typeof raw === 'string') {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try { o = JSON.parse(raw.slice(start, end + 1)); } catch { return null; }
  }
  if (!o || typeof o !== 'object') return null;
  switch (o.action) {
    case 'play': {
      const title = str(o.title);
      if (!title) return null;
      const app = str(o.app, 40);
      return app ? { action: 'play', title, app: app.toLowerCase() } : { action: 'play', title };
    }
    case 'launch': {
      const app = str(o.app, 40);
      return app ? { action: 'launch', app: app.toLowerCase() } : null;
    }
    case 'keys': {
      if (!Array.isArray(o.keys)) return null;
      const keys = o.keys.filter(isKey).slice(0, MAX_KEYS);
      return keys.length && keys.length === Math.min(o.keys.length, MAX_KEYS) ? { action: 'keys', keys } : null;
    }
    case 'type': {
      const text = typeof o.text === 'string' && o.text.length ? o.text.slice(0, 200) : null;
      return text ? { action: 'type', text, submit: o.submit === true } : null;
    }
    case 'search': {
      const query = str(o.query);
      return query ? { action: 'search', query } : null;
    }
    case 'reply': {
      const text = str(o.text, 400);
      return text ? { action: 'reply', text } : null;
    }
    case 'continue': {
      const title = str(o.title);
      const app = str(o.app, 40);
      return { action: 'continue', title, app: app ? app.toLowerCase() : null };
    }
    default:
      return null;
  }
}

/** Turns an action into the API calls that carry it out, using the TV's app list for names. */
export function planAction(a: AssistantAction, apps: TvApp[]): Call[] {
  switch (a.action) {
    case 'play': {
      const app = a.app ? resolveApp(a.app, apps) : null;
      const calls: Call[] = [];
      if (a.app && !app) calls.push({ kind: 'say', text: `${titleCase(a.app)} isn't on your TV, so I'll look in your other apps.` });
      calls.push({ kind: 'play', title: a.title, pkg: app?.pkg ?? null, id: null });
      return calls;
    }
    case 'launch': {
      const app = resolveApp(a.app, apps);
      return app
        ? [{ kind: 'launch', pkg: app.pkg, label: app.label }]
        : [{ kind: 'say', text: `I couldn't find ${titleCase(a.app)} on your TV.` }];
    }
    case 'keys':
      return a.keys.slice(0, MAX_KEYS).map((key) => ({ kind: 'key', key }));
    case 'type':
      return [{ kind: 'text', text: a.text, submit: a.submit }];
    case 'search':
      return [{ kind: 'search', query: a.query }];
    case 'reply':
      return [{ kind: 'say', text: a.text }];
    case 'continue': {
      const app = a.app ? resolveApp(a.app, apps) : null;
      return [{ kind: 'continue', title: a.title ?? null, pkg: app?.pkg ?? null }];
    }
  }
}

const KEY_WORDS: Record<Key, string> = {
  up: 'up', down: 'down', left: 'left', right: 'right', select: 'select', back: 'back', home: 'home',
  menu: 'menu', play_pause: 'play/pause', rewind: 'rewind', fast_forward: 'fast forward', next: 'next',
  previous: 'previous', volume_up: 'volume up', volume_down: 'volume down', mute: 'mute',
};
export const keyWord = (k: Key) => KEY_WORDS[k];

export function titleCase(s: string) {
  return s.replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

/** A short sentence for the chat, e.g. "Play Stranger Things on Netflix". */
export function describeAction(a: AssistantAction, apps: TvApp[] = []): string {
  const label = (n?: string | null) => (n ? resolveApp(n, apps)?.label ?? titleCase(n) : null);
  switch (a.action) {
    case 'play': {
      const on = label(a.app);
      return on ? `Play ${a.title} on ${on}` : `Play ${a.title}`;
    }
    case 'launch':
      return `Open ${label(a.app)}`;
    case 'keys': {
      // "down ×3, select"
      const parts: string[] = [];
      for (let i = 0; i < a.keys.length; ) {
        let j = i;
        while (j < a.keys.length && a.keys[j] === a.keys[i]) j++;
        parts.push(j - i > 1 ? `${keyWord(a.keys[i])} ×${j - i}` : keyWord(a.keys[i]));
        i = j;
      }
      const s = parts.join(', ');
      return `Press ${s}`;
    }
    case 'type':
      return a.submit ? `Type “${a.text}” and enter` : `Type “${a.text}”`;
    case 'search':
      return `Search for ${a.query}`;
    case 'reply':
      return a.text;
    case 'continue': {
      const on = label(a.app);
      return a.title ? `Continue ${a.title}${on ? ` on ${on}` : ''}` : on ? `Continue watching on ${on}` : 'Continue watching';
    }
  }
}
