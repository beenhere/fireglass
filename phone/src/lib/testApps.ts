import type { TvApp } from './types';

/** A Fire TV's app list as /api/apps returns it, for tests. */
export const APPS: TvApp[] = [
  { pkg: 'com.netflix.ninja', label: 'Netflix', color: '#E50914', pinned: true },
  { pkg: 'com.amazon.avod', label: 'Prime Video', color: '#00A8E1', pinned: true },
  { pkg: 'com.amazon.firetv.youtube', label: 'YouTube', color: '#FF0000', pinned: true },
  { pkg: 'in.startv.hotstar', label: 'JioHotstar', color: '#1F80E0', pinned: true },
  { pkg: 'com.sonyliv', label: 'Sony LIV', color: '#F5A623' },
  { pkg: 'com.graymatrix.did', label: 'ZEE5', color: '#8230C6' },
  { pkg: 'com.spotify.tv.android', label: 'Spotify', color: '#1DB954' },
  { pkg: 'com.amazon.firetv.youtube.music', label: 'YouTube Music', color: '#FF0033' },
];
