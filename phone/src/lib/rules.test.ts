import { parseKeys, parseRules } from './rules';
import { APPS } from './testApps';

describe('parseKeys', () => {
  it.each([
    ['up', ['up']],
    ['down down select', ['down', 'down', 'select']],
    ['down 3 times', ['down', 'down', 'down']],
    ['go left twice then ok', ['left', 'left', 'select']],
    ['3 right', ['right', 'right', 'right']],
    ['volume up', ['volume_up']],
    ['pause', ['play_pause']],
    ['fast forward', ['fast_forward']],
    ['go back', ['back']],
  ])('%s', (input, keys) => expect(parseKeys(input)).toEqual(keys));

  it('rejects words that are not keys', () => {
    expect(parseKeys('down to the kitchen')).toBeNull();
    expect(parseKeys('play stranger things')).toBeNull();
  });
});

describe('continue', () => {
  it('reads continue phrases', () => {
    expect(parseRules('continue watching', APPS)).toEqual({ action: 'continue' });
    expect(parseRules('what was I watching', APPS)).toEqual({ action: 'continue' });
    expect(parseRules('resume koffee with karan', APPS)).toMatchObject({ action: 'continue', title: 'Koffee With Karan' });
  });
});

describe('parseRules', () => {
  it('maps simple presses', () => {
    expect(parseRules('Back', APPS)).toEqual({ action: 'keys', keys: ['back'] });
    expect(parseRules('please go home', APPS)).toEqual({ action: 'keys', keys: ['home'] });
    expect(parseRules('Pause.', APPS)).toEqual({ action: 'keys', keys: ['play_pause'] });
  });

  it('opens apps by spoken name', () => {
    expect(parseRules('open netflix', APPS)).toEqual({ action: 'launch', app: 'netflix' });
    expect(parseRules('launch amazon prime', APPS)).toEqual({ action: 'launch', app: 'amazon prime' });
    expect(parseRules('youtube', APPS)).toEqual({ action: 'launch', app: 'youtube' });
  });

  it('plays titles, with or without an app', () => {
    expect(parseRules('Play Stranger Things', APPS)).toEqual({ action: 'play', title: 'Stranger Things' });
    expect(parseRules('play the last of us', APPS)).toEqual({ action: 'play', title: 'The Last Of Us' });
    expect(parseRules('watch the boys on prime', APPS)).toEqual({ action: 'play', title: 'The Boys', app: 'prime' });
    expect(parseRules('open YouTube and search lofi', APPS)).toEqual({ action: 'play', title: 'Lofi', app: 'youtube' });
    expect(parseRules('search lofi beats on youtube', APPS)).toEqual({ action: 'play', title: 'Lofi Beats', app: 'youtube' });
  });

  it('keeps titles that contain "on" intact', () => {
    expect(parseRules('play once upon a time in hollywood', APPS)).toEqual({ action: 'play', title: 'Once Upon A Time In Hollywood' });
  });

  it('types and searches', () => {
    expect(parseRules('type lofi beats and press enter', APPS)).toEqual({ action: 'type', text: 'lofi beats', submit: true });
    expect(parseRules('type hello', APPS)).toEqual({ action: 'type', text: 'hello', submit: false });
    expect(parseRules('search for new malayalam thrillers', APPS)).toEqual({ action: 'search', query: 'new malayalam thrillers' });
  });

  it('leaves vague requests to the model', () => {
    expect(parseRules('play something funny', APPS)).toBeNull();
    expect(parseRules('what should I watch tonight', APPS)).toBeNull();
  });
});
