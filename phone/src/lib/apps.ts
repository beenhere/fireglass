import type { TvApp } from './types';

/**
 * Short app names the assistant speaks in (docs/remote-api.md), and how to recognise each one
 * from a TV app's label or package.
 */
const CANONICAL: { name: string; match: RegExp }[] = [
  { name: 'netflix', match: /netflix/ },
  { name: 'prime', match: /prime ?video|amazon ?video|com\.amazon\.avod|primevideo/ },
  { name: 'hotstar', match: /hotstar|disney/ },
  { name: 'youtube', match: /^youtube$|youtube(?![ .]?(music|kids))|com\.amazon\.firetv\.youtube$|youtube\.tv$/ },
  { name: 'jiocinema', match: /jio ?cinema/ },
  { name: 'apple tv', match: /apple ?tv/ },
  { name: 'zee5', match: /zee ?5/ },
  { name: 'sonyliv', match: /sony ?liv/ },
  { name: 'crunchyroll', match: /crunchyroll/ },
];

/** What people say, mapped to a canonical short name. */
const SPOKEN: Record<string, string> = {
  'amazon': 'prime', 'amazon prime': 'prime', 'prime video': 'prime', 'amazon prime video': 'prime',
  'disney': 'hotstar', 'disney plus': 'hotstar', 'disney+': 'hotstar', 'disney hotstar': 'hotstar',
  'jiohotstar': 'hotstar', 'jio hotstar': 'hotstar', 'disney+ hotstar': 'hotstar',
  'you tube': 'youtube', 'yt': 'youtube', 'utube': 'youtube',
  'sony liv': 'sonyliv', 'sony': 'sonyliv', 'zee 5': 'zee5', 'zee': 'zee5', 'z5': 'zee5',
  'apple': 'apple tv', 'appletv': 'apple tv', 'apple tv plus': 'apple tv', 'apple tv+': 'apple tv',
  'jio cinema': 'jiocinema', 'jio': 'jiocinema', 'crunchy roll': 'crunchyroll',
};

export const norm = (s: string) =>
  s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9+ ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** The lowercase short name for a TV app, e.g. "Prime Video" -> "prime". */
export function shortName(app: Pick<TvApp, 'pkg' | 'label'>): string {
  const label = norm(app.label);
  const pkg = app.pkg.toLowerCase();
  for (const c of CANONICAL) if (c.match.test(label) || c.match.test(pkg)) return c.name;
  return label;
}

/** Unique short names for the TV's apps, pinned (shelf) apps first. */
export function shortNames(apps: TvApp[]): string[] {
  const sorted = [...apps].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned));
  const out: string[] = [];
  for (const a of sorted) {
    const n = shortName(a);
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Finds the TV app someone means by "netflix", "amazon prime", "you tube"… or null. */
export function resolveApp(spoken: string | null | undefined, apps: TvApp[]): TvApp | null {
  if (!spoken) return null;
  let q = norm(spoken).replace(/^the /, '').replace(/ app$/, '');
  if (!q) return null;
  q = SPOKEN[q] ?? q;
  const named = apps.map((a) => ({ a, short: shortName(a), label: norm(a.label) }));
  const pinnedFirst = (xs: typeof named) => xs.sort((x, y) => Number(!!y.a.pinned) - Number(!!x.a.pinned));

  const exact = named.find((x) => x.short === q || x.label === q);
  if (exact) return exact.a;
  const canon = CANONICAL.find((c) => c.name === q || c.match.test(q));
  if (canon) {
    const hit = pinnedFirst(named.filter((x) => x.short === canon.name));
    if (hit.length) return hit[0].a;
  }
  const partial = pinnedFirst(named.filter((x) => x.label.startsWith(q) || (q.length >= 4 && x.label.includes(q))));
  if (partial.length) return partial[0].a;
  if (q.length >= 5) {
    const close = named
      .map((x) => ({ x, d: Math.min(lev(q, x.short), lev(q, x.label)) }))
      .filter((c) => c.d <= 2)
      .sort((p, r) => p.d - r.d);
    if (close.length) return close[0].x.a;
  }
  return null;
}
