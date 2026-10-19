import { useMemo } from 'react';
import { useZeroconf } from 'react-native-zeroconf';

export type FoundTv = { name: string; host: string; port: number };

/** TVs advertising `_tvhome._tcp.` on this network. */
export function useTvDiscovery(enabled: boolean) {
  const { services, isScanning, error, restart } = useZeroconf({ type: 'tvhome', protocol: 'tcp', domain: 'local.', enabled, resolveTimeout: 5 });
  const tvs = useMemo<FoundTv[]>(
    () => services
      .map((s) => ({ name: s.name, host: s.ipv4?.[0] ?? s.addresses?.[0] ?? s.host.replace(/\.$/, ''), port: s.port || 8090 }))
      .filter((t) => !!t.host),
    [services],
  );
  return { tvs, scanning: isScanning, error: error ? error.message || String(error.code) : null, restart };
}
