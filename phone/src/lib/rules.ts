import { norm, resolveApp } from './apps';
import type { AssistantAction, Key, TvApp } from './types';

/**
 * Rule-based parser for the commands people say most ("down twice", "open netflix",
 * "play stranger things on prime", "type lofi and enter"). Works with no model downloaded and
 * answers instantly; anything it isn't sure about returns null and goes to the model.
 */

const NUM: Record<string, number> = {
  once: 1, one: 1, twice: 2, two: 2, thrice: 3, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, to: 2, too: 2,
};

// Multi-word phrases first; each maps to a key.
const KEY_PHRASES: [string, Key][] = [
  ['volume up', 'volume_up'], ['turn it up', 'volume_up'], ['turn up', 'volume_up'], ['louder', 'volume_up'], ['vol up', 'volume_up'],
  ['volume down', 'volume_down'], ['turn it down', 'volume_down'], ['turn down', 'volume_down'], ['quieter', 'volume_down'], ['softer', 'volume_down'], ['vol down', 'volume_down'],
  ['unmute', 'mute'], ['mute', 'mute'],
  ['fast forward', 'fast_forward'], ['fastforward', 'fast_forward'], ['forward', 'fast_forward'], ['skip ahead', 'fast_forward'],
  ['rewind', 'rewind'], ['skip back', 'rewind'],
  ['next episode', 'next'], ['next', 'next'], ['previous', 'previous'], ['prev', 'previous'],
  ['play pause', 'play_pause'], ['pause', 'play_pause'], ['resume', 'play_pause'], ['play', 'play_pause'], ['stop', 'play_pause'],
  ['go back', 'back'], ['back', 'back'], ['go home', 'home'], ['home', 'home'],
  ['menu', 'menu'], ['options', 'menu'],
  ['ok', 'select'], ['okay', 'select'], ['select', 'select'], ['enter', 'select'], ['click', 'select'], ['center', 'select'],
  ['up', 'up'], ['down', 'down'], ['left', 'left'], ['right', 'right'],
];
const FILLER = new Set(['go', 'move', 'press', 'hit', 'scroll', 'then', 'and', 'times', 'time', 'the', 'button', 'key', 'a', 'bit']);

const PREFIX = /^(?:(?:hey|ok|okay)\s+(?:tv|remote)\s+|please\s+|can you\s+|could you\s+|would you\s+|i want to\s+|i wanna\s+|let'?s\s+|lets\s+)+/;
const SUFFIX = /\s+(?:please|for me|now)$/;

function clean(input: string) {
  let s = input.toLowerCase().replace(/[“”"]/g, '').replace(/[.!?,]+$/g, '').replace(/\s+/g, ' ').trim();
  for (let i = 0; i < 3; i++) s = s.replace(PREFIX, '').replace(SUFFIX, '').trim();
  return s;
}

/** "down down select", "down 3 times", "go left twice then ok" -> keys, or null if any word isn't a key. */
export function parseKeys(s: string): Key[] | null {
  const words = s.replace(/,/g, ' ').split(' ').filter(Boolean);
  const out: Key[] = [];
  let pendingCount: number | null = null;
  let prevWasKey = false;
  for (let i = 0; i < words.length; ) {
    const w = words[i];
    const n = /^\d+$/.test(w) ? Number(w) : NUM[w];
    if (n !== undefined) {
      if (prevWasKey) {
        // "down 3 (times)": repeat the key just pressed
        const last = out[out.length - 1];
        for (let k = 1; k < Math.min(n, 10); k++) out.push(last);
        prevWasKey = false;
      } else {
        if (pendingCount !== null) return null;
        pendingCount = n; // "3 down"
      }
      i++;
      continue;
    }
    if (FILLER.has(w)) { i++; continue; }
    const rest = words.slice(i).join(' ');
    const hit = KEY_PHRASES.find(([p]) => rest === p || rest.startsWith(p + ' '));
    if (!hit) return null;
    const count = Math.min(pendingCount ?? 1, 10);
    for (let k = 0; k < count; k++) out.push(hit[1]);
    pendingCount = null;
    prevWasKey = true;
    i += hit[0].split(' ').length;
  }
  if (pendingCount !== null || !out.length) return null;
  return out.slice(0, 12);
}

/** Splits "stranger things on netflix" into the title and an app the TV has, if it ends in one. */
function splitOnApp(s: string, apps: TvApp[]): { title: string; app: string | null } {
  const m = s.match(/^(.*?)\s+(?:on|in|from|using|with)\s+([a-z0-9+ ]{2,30})$/);
  if (m) {
    const app = resolveApp(m[2], apps);
    if (app || /^(netflix|prime|hotstar|youtube|jiocinema|apple tv|zee5|sonyliv|crunchyroll)$/.test(m[2])) {
      return { title: m[1].trim(), app: (app ? norm(m[2]) : m[2]).trim() };
    }
  }
  return { title: s, app: null };
}

/** Takes a fragment found in the lowercased input back to how it was written; speech (all lowercase) gets title case. */
function restore(input: string, fragment: string, title: boolean) {
  const i = input.toLowerCase().indexOf(fragment);
  const out = i >= 0 ? input.slice(i, i + fragment.length) : fragment;
  if (!title || out !== out.toLowerCase()) return out;
  return out.replace(/(^|\s)([a-z])/g, (_m, sp, ch) => sp + ch.toUpperCase());
}

export function parseRules(input: string, apps: TvApp[]): AssistantAction | null {
  const a = parseLower(input, apps);
  if (!a) return null;
  const src = input.replace(/\s+/g, ' ');
  if (a.action === 'play') return { ...a, title: restore(src, a.title, true) };
  if (a.action === 'search') return { ...a, query: restore(src, a.query, false) };
  if (a.action === 'type') return { ...a, text: restore(src, a.text, false) };
  if (a.action === 'continue' && a.title) return { ...a, title: restore(src, a.title, true) };
  return a;
}

function parseLower(input: string, apps: TvApp[]): AssistantAction | null {
  const s = clean(input);
  if (!s) return null;

  // continue / resume [watching] [X] [on Y], and "what was I watching"
  if (/^what (?:was|am) i watching\b/.test(s)) return { action: 'continue' };
  let c = s.match(/^(?:continue|resume|keep watching|carry on(?: with)?)(?: watching)?(?:\s+(.+))?$/);
  if (c) {
    if (!c[1]) return { action: 'continue' };
    const rest = c[1].replace(/^(?:with|my|the|that)\s+/, '');
    const { title, app } = splitOnApp(rest, apps);
    const bareApp = resolveApp(rest.replace(/\s+(?:show|series|one)$/, ''), apps);
    if (bareApp && !app) return { action: 'continue', app: norm(rest.replace(/\s+(?:show|series|one)$/, '')) };
    return { action: 'continue', title: title || null, app: app ?? null };
  }

  // Bare key presses.
  const keys = parseKeys(s);
  if (keys) return { action: 'keys', keys };

  // type …
  let m = s.match(/^(?:type|write|enter text)\s+(.+?)(\s+(?:and\s+)?(?:press\s+|hit\s+)?(?:enter|submit|search|go|send))?$/);
  if (m) return { action: 'type', text: m[1].trim(), submit: !!m[2] };

  // open X [and search/play Y]
  m = s.match(/^(?:open|launch|start|go to|switch to|run|fire up|bring up)\s+(.+?)(?:\s+and\s+(?:search(?: for)?|look for|find|play|watch|put on)\s+(.+))?$/);
  if (m) {
    const app = resolveApp(m[1], apps);
    if (m[2]) return { action: 'play', title: m[2].trim(), app: app ? norm(m[1]) : m[1] };
    if (app) return { action: 'launch', app: norm(m[1]) };
    if (!apps.length) return { action: 'launch', app: m[1] };
    // "open stranger things": not an app, so it's probably a title.
    return { action: 'play', title: m[1] };
  }

  // search for X [on Y]
  m = s.match(/^(?:search(?: for)?|look for|find|look up)\s+(.+)$/);
  if (m) {
    const { title, app } = splitOnApp(m[1], apps);
    if (app) return { action: 'play', title, app };
    return { action: 'search', query: m[1] };
  }

  // play X [on Y]
  m = s.match(/^(?:play|watch|put on|stream|start watching)\s+(.+)$/);
  if (m) {
    const target = m[1].replace(/^(?:the )?(?:show|movie|series|film)\s+/, '');
    if (/^(something|anything|a movie|a show|whatever)\b/.test(target)) return null; // vague: model's job
    const { title, app } = splitOnApp(target, apps);
    // "play netflix" means open it
    const asApp = !app ? resolveApp(title, apps) : null;
    if (asApp && norm(asApp.label).startsWith(norm(title))) return { action: 'launch', app: norm(title) };
    return app ? { action: 'play', title, app } : { action: 'play', title };
  }

  // Just an app's name.
  const app = resolveApp(s, apps);
  if (app && s.split(' ').length <= 3) return { action: 'launch', app: s };

  return null;
}
