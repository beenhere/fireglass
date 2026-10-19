// Web build is only for design previews; localStorage stands in for files and the keychain.
const ls = () => (typeof localStorage === 'undefined' ? null : localStorage);

export function readJson<T>(name: string, fallback: T): T {
  try {
    const v = ls()?.getItem(`doc:${name}`);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown) {
  ls()?.setItem(`doc:${name}`, JSON.stringify(value));
}

export const secure = {
  get: async (k: string) => ls()?.getItem(`secure:${k}`) ?? null,
  set: async (k: string, v: string) => { ls()?.setItem(`secure:${k}`, v); },
  del: async (k: string) => { ls()?.removeItem(`secure:${k}`); },
};

// Design previews: `?seedTv=127.0.0.1:8090&seedToken=<token>&seedName=Living%20Room%20TV` pairs the
// preview with a mock TV without going through the PIN screen.
try {
  const q = typeof location === 'undefined' ? null : new URLSearchParams(location.search);
  const tv = q?.get('seedTv');
  const token = q?.get('seedToken');
  if (tv && token) {
    const [host, port = '8090'] = tv.split(':');
    const id = `${host}:${port}`;
    const prev = JSON.parse(ls()?.getItem('doc:state.json') ?? '{}');
    ls()?.setItem('doc:state.json', JSON.stringify({ ...prev, tvs: [{ id, name: q?.get('seedName') ?? 'Living Room TV', host, port: Number(port), pairedAt: Date.now() }], activeId: id }));
    ls()?.setItem(`secure:tvtoken.${id}`, token);
  }
} catch {}
