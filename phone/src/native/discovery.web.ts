export type FoundTv = { name: string; host: string; port: number };
// Browsers can't do mDNS; the web preview uses manual entry only.
export function useTvDiscovery(_enabled: boolean) {
  return { tvs: [] as FoundTv[], scanning: false, error: null as string | null, restart: () => {} };
}
