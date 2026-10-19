import { describeAction, parseAction, planAction } from './actions';
import { resolveApp, shortNames } from './apps';
import { executeCalls } from './execute';
import { buildGrammar } from './grammar';
import { APPS } from './testApps';

describe('parseAction', () => {
  it('accepts every contract shape', () => {
    expect(parseAction('{"action":"play","title":"Stranger Things","app":"netflix"}')).toEqual({ action: 'play', title: 'Stranger Things', app: 'netflix' });
    expect(parseAction({ action: 'launch', app: 'YouTube' })).toEqual({ action: 'launch', app: 'youtube' });
    expect(parseAction('{"action":"keys","keys":["down","down","select"]}')).toEqual({ action: 'keys', keys: ['down', 'down', 'select'] });
    expect(parseAction('{"action":"type","text":"lofi beats","submit":true}')).toEqual({ action: 'type', text: 'lofi beats', submit: true });
    expect(parseAction('{"action":"search","query":"new malayalam thrillers"}')).toEqual({ action: 'search', query: 'new malayalam thrillers' });
    expect(parseAction('{"action":"reply","text":"I can\'t do that yet."}')).toEqual({ action: 'reply', text: "I can't do that yet." });
  });

  it('finds the JSON inside chatter', () => {
    expect(parseAction('Sure! {"action":"launch","app":"netflix"} Enjoy')).toEqual({ action: 'launch', app: 'netflix' });
  });

  it('rejects bad output', () => {
    expect(parseAction('not json')).toBeNull();
    expect(parseAction('{"action":"keys","keys":["up","jump"]}')).toBeNull();
    expect(parseAction('{"action":"play"}')).toBeNull();
    expect(parseAction('{"action":"dance"}')).toBeNull();
  });
});

describe('apps', () => {
  it('gives the contract short names', () => {
    expect(shortNames(APPS)).toEqual(['netflix', 'prime', 'youtube', 'hotstar', 'sonyliv', 'zee5', 'spotify', 'youtube music']);
  });
  it('resolves spoken names', () => {
    expect(resolveApp('amazon prime', APPS)?.pkg).toBe('com.amazon.avod');
    expect(resolveApp('disney plus', APPS)?.pkg).toBe('in.startv.hotstar');
    expect(resolveApp('you tube', APPS)?.pkg).toBe('com.amazon.firetv.youtube');
    expect(resolveApp('youtube music', APPS)?.pkg).toBe('com.amazon.firetv.youtube.music');
    expect(resolveApp('netflx', APPS)?.pkg).toBe('com.netflix.ninja');
    expect(resolveApp('crunchyroll', APPS)).toBeNull();
  });
});

describe('planAction', () => {
  it('maps model JSON to API calls', () => {
    expect(planAction({ action: 'play', title: 'Stranger Things', app: 'netflix' }, APPS))
      .toEqual([{ kind: 'play', title: 'Stranger Things', pkg: 'com.netflix.ninja', id: null }]);
    expect(planAction({ action: 'play', title: 'Dark' }, APPS)).toEqual([{ kind: 'play', title: 'Dark', pkg: null, id: null }]);
    expect(planAction({ action: 'launch', app: 'prime' }, APPS)).toEqual([{ kind: 'launch', pkg: 'com.amazon.avod', label: 'Prime Video' }]);
    expect(planAction({ action: 'keys', keys: ['down', 'select'] }, APPS)).toEqual([{ kind: 'key', key: 'down' }, { kind: 'key', key: 'select' }]);
    expect(planAction({ action: 'type', text: 'lofi', submit: true }, APPS)).toEqual([{ kind: 'text', text: 'lofi', submit: true }]);
    expect(planAction({ action: 'search', query: 'thrillers' }, APPS)).toEqual([{ kind: 'search', query: 'thrillers' }]);
  });

  it('explains apps the TV lacks', () => {
    expect(planAction({ action: 'launch', app: 'crunchyroll' }, APPS)).toEqual([{ kind: 'say', text: "I couldn't find Crunchyroll on your TV." }]);
    const calls = planAction({ action: 'play', title: 'One Piece', app: 'crunchyroll' }, APPS);
    expect(calls[0].kind).toBe('say');
    expect(calls[1]).toEqual({ kind: 'play', title: 'One Piece', pkg: null, id: null });
  });

  it('describes actions in plain words', () => {
    expect(describeAction({ action: 'keys', keys: ['down', 'down', 'down', 'select'] })).toBe('Press down ×3, select');
    expect(describeAction({ action: 'play', title: 'Dune', app: 'prime' }, APPS)).toBe('Play Dune on Prime Video');
  });
});

describe('executeCalls', () => {
  const ok = { ok: true as const };
  const client = () => ({
    key: jest.fn(async () => ok),
    text: jest.fn(async () => ok),
    launch: jest.fn(async () => ok),
    search: jest.fn(async () => []),
    play: jest.fn(async () => ({ ok: true as const, opened: { title: 'Dark', pkg: 'com.netflix.ninja', how: 'deeplink' as const } })),
    recent: jest.fn(async () => HISTORY),
  });

  const HISTORY = [
    { id: 'a', title: 'Koffee with Karan', watchedPkg: 'in.startv.hotstar', episode: 'S8 E3' },
    { id: 'b', title: 'Dark', watchedPkg: 'com.netflix.ninja' },
  ];

  it('continue with no title asks about the latest, offering the rest', async () => {
    const out = await executeCalls([{ kind: 'continue', title: null, pkg: null }], client(), APPS);
    expect(out.status).toBe('confirm');
    expect(out.note).toContain('Koffee with Karan');
    expect('titles' in out && out.titles?.map((t) => t.id)).toEqual(['a', 'b']);
  });

  it('continue with a title opens it on the app it was watched on', async () => {
    const c = client();
    const out = await executeCalls([{ kind: 'continue', title: 'dark', pkg: null }], c, APPS);
    expect(out.status).toBe('done');
    expect(c.play.mock.calls[0]).toEqual([{ title: 'Dark', pkg: 'com.netflix.ninja', id: 'b' }]);
  });

  it('presses keys in order', async () => {
    const c = client();
    const out = await executeCalls([{ kind: 'key', key: 'down' }, { kind: 'key', key: 'select' }], c, APPS, 0);
    expect(c.key.mock.calls).toEqual([['down'], ['select']]);
    expect(out).toEqual({ status: 'done', note: 'Pressed 2 keys.', titles: undefined });
  });

  it('offers candidates when the title is ambiguous', async () => {
    const c = client();
    const cand = [{ id: 'tv:1', title: 'Dark' }];
    c.play.mockResolvedValueOnce({ ok: false, error: 'not_found', candidates: cand } as any);
    const out = await executeCalls([{ kind: 'play', title: 'Darc', pkg: null, id: null }], c, APPS);
    expect(out.status).toBe('choose');
    expect((out as any).titles).toBe(cand);
  });

  it('reports what opened', async () => {
    const out = await executeCalls([{ kind: 'play', title: 'Dark', pkg: null, id: null }], client(), APPS);
    expect(out).toEqual({ status: 'done', note: 'Opening Dark on Netflix, straight to it.', titles: undefined });
  });
});

describe('buildGrammar', () => {
  it('limits apps and keys', () => {
    const g = buildGrammar(shortNames(APPS));
    expect(g).toContain('app ::= "\\"netflix\\""');
    expect(g).toContain('"\\"youtube music\\""');
    expect(g).toContain('"\\"crunchyroll\\""'); // contract names always allowed
    expect(g).toContain('"\\"volume_up\\""');
    expect(g.split('\n')[0].startsWith('root ::=')).toBe(true);
  });
});
