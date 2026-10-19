import type { Call } from './actions';
import { ApiError, type TvClient } from './api';
import { isTitle, type Title, type TvApp } from './types';

export type Outcome =
  | { status: 'done'; note: string; titles?: Title[] }
  | { status: 'choose'; note: string; titles: Title[] }
  | { status: 'confirm'; note: string; titles: Title[] }
  | { status: 'failed'; note: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const HOW: Record<string, string> = { deeplink: 'straight to it', search: 'via the app’s search', app: 'in the app' };

export function friendlyError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'needs_bootstrap') return 'The TV’s key sender isn’t running yet. Open the remote tab to start it.';
    if (e.code === 'offline') return 'Can’t reach the TV. Is it on and on the same Wi-Fi?';
    if (e.code === 'timeout') return 'The TV took too long to answer.';
    if (e.unpaired) return 'This phone isn’t paired with the TV any more. Pair again in Settings.';
    return `The TV said: ${e.code.replace(/_/g, ' ')}`;
  }
  return e instanceof Error ? e.message : 'Something went wrong.';
}

type Client = Pick<TvClient, 'key' | 'text' | 'launch' | 'play' | 'search' | 'recent'>;

const loose = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** History entries matching a spoken title (either contains the other) and/or an app. */
export function matchHistory(history: Title[], title: string | null, pkg: string | null): Title[] {
  const q = title ? loose(title) : '';
  return history.filter((t) => (!pkg || t.watchedPkg === pkg)
    && (!q || loose(t.title).includes(q) || q.includes(loose(t.title))));
}

const onApp = (t: Title, apps: TvApp[]) => apps.find((a) => a.pkg === t.watchedPkg)?.label;

/** Runs planned calls in order against the TV and sums up what happened for the chat. */
export async function executeCalls(calls: Call[], client: Client, apps: TvApp[], keyGap = 140): Promise<Outcome> {
  const notes: string[] = [];
  let titles: Title[] | undefined;
  try {
    let pressed = 0;
    for (const c of calls) {
      switch (c.kind) {
        case 'say':
          notes.push(c.text);
          break;
        case 'key': {
          if (pressed++) await sleep(keyGap);
          const r = await client.key(c.key);
          if (!r.ok) return { status: 'failed', note: `The TV didn’t take the key press (${r.error.replace(/_/g, ' ')}).` };
          break;
        }
        case 'text': {
          const r = await client.text(c.text, c.submit);
          if (!r.ok) return { status: 'failed', note: `Typing didn’t work (${r.error.replace(/_/g, ' ')}).` };
          notes.push(c.submit ? 'Typed and entered.' : 'Typed.');
          break;
        }
        case 'launch': {
          const r = await client.launch(c.pkg);
          if (!r.ok) return { status: 'failed', note: `Couldn’t open ${c.label} (${r.error.replace(/_/g, ' ')}).` };
          notes.push(`Opened ${c.label}.`);
          break;
        }
        case 'play': {
          const r = await client.play({ title: c.title, pkg: c.pkg, id: c.id });
          if (r.ok) {
            const label = apps.find((a) => a.pkg === r.opened.pkg)?.label ?? r.opened.pkg;
            notes.push(`Opening ${r.opened.title} on ${label}, ${HOW[r.opened.how] ?? r.opened.how}.`);
          } else if (r.candidates?.length) {
            const why = r.error === 'not_on_your_apps' ? 'isn’t on your apps' : 'wasn’t an exact match';
            return { status: 'choose', note: `“${c.title}” ${why}. Did you mean one of these?`, titles: r.candidates };
          } else {
            return { status: 'failed', note: r.error === 'not_on_your_apps' ? `“${c.title}” isn’t on any of your apps.` : `I couldn’t find “${c.title}”.` };
          }
          break;
        }
        case 'continue': {
          const history = (await client.recent()).filter(isTitle);
          const found = matchHistory(history, c.title, c.pkg);
          if (c.title && found.length) {
            // Named it: go straight there, on the app it was watched on.
            const t = found[0];
            const r = await client.play({ title: t.title, pkg: t.watchedPkg ?? null, id: t.id });
            if (!r.ok) return { status: 'failed', note: `Couldn’t open ${t.title} (${r.error.replace(/_/g, ' ')}).` };
            notes.push(`Back to ${t.title}${onApp(t, apps) ? ` on ${onApp(t, apps)}` : ''}${t.episode ? `, ${t.episode}` : ''}.`);
            break;
          }
          if (c.title) {
            // Not in history: treat it as a plain play.
            const r = await client.play({ title: c.title, pkg: c.pkg, id: null });
            if (r.ok) { notes.push(`You haven’t watched ${c.title} here yet, so opening it on ${apps.find((a) => a.pkg === r.opened.pkg)?.label ?? r.opened.pkg}.`); break; }
            return { status: 'failed', note: `I couldn’t find “${c.title}” in what you’ve watched or on your apps.` };
          }
          if (!found.length) return { status: 'failed', note: c.pkg ? 'Nothing watched on that app yet.' : 'Nothing in your watch history yet.' };
          // Not named: ask, with the last few to pick from.
          const t = found[0];
          return {
            status: 'confirm',
            note: `Last time: ${t.title}${onApp(t, apps) ? ` on ${onApp(t, apps)}` : ''}${t.episode ? `, ${t.episode}` : ''}. Say “yes” or tap it to continue, or pick another.`,
            titles: found.slice(0, 6),
          };
        }
        case 'search': {
          titles = await client.search(c.query);
          notes.push(titles.length ? `${titles.length === 1 ? 'One match' : `${titles.length} matches`}. Tap one to play it.` : `Nothing found for “${c.query}”.`);
          break;
        }
      }
    }
    if (pressed && !notes.length) notes.push(pressed === 1 ? 'Pressed.' : `Pressed ${pressed} keys.`);
    return { status: 'done', note: notes.join(' '), titles };
  } catch (e) {
    return { status: 'failed', note: friendlyError(e) };
  }
}
