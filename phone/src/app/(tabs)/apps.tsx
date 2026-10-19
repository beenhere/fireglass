import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { friendlyError } from '@/lib/execute';
import { haptic } from '@/lib/haptics';
import type { TvApp } from '@/lib/types';
import { useClient, useStore } from '@/state/store';
import { Banner } from '@/ui/Media';
import { Press } from '@/ui/Press';
import { Shimmer } from '@/ui/Shimmer';
import { toast } from '@/ui/Toast';
import { Txt } from '@/ui/Txt';
import { C, R, S } from '@/ui/theme';

const COLS = 3;
const GAP = 14;

export default function Apps() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const apps = useStore((s) => s.apps);
  const nowPkg = useStore((s) => s.now?.pkg);
  const client = useClient();
  const [refreshing, setRefreshing] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const tile = (width - S.gutter * 2 - GAP * (COLS - 1)) / COLS;

  const { shelf, rest } = useMemo(() => ({
    shelf: apps.filter((a) => a.pinned),
    rest: apps.filter((a) => !a.pinned).sort((a, b) => a.label.localeCompare(b.label)),
  }), [apps]);

  const launch = async (a: TvApp) => {
    if (!client) return;
    setOpening(a.pkg);
    try {
      const r = await client.launch(a.pkg);
      if (!r.ok) throw new Error(r.error.replace(/_/g, ' '));
      haptic.ok();
      toast(`Opening ${a.label}`);
      setTimeout(() => useStore.getState().refreshNow(), 1200);
    } catch (e) {
      haptic.err();
      toast(friendlyError(e), 'error');
    } finally {
      setOpening(null);
    }
  };

  const grid = (list: TvApp[], offset: number) => (
    <View style={styles.grid}>
      {list.map((a, i) => (
        <Animated.View key={a.pkg} entering={FadeInDown.delay(Math.min((offset + i) * 40, 500)).springify().damping(18)} style={{ width: tile }}>
          <Press onPress={() => launch(a)} feedback="press" scaleTo={0.95} accessibilityRole="button" accessibilityLabel={`Open ${a.label}`}>
            <View style={[styles.tileWrap, nowPkg === a.pkg && styles.tileOn, opening === a.pkg && { opacity: 0.6 }]}>
              <Banner client={client} app={a} radius={R.md} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 2 }}>
              <Txt v="label" numberOfLines={1} style={{ flexShrink: 1 }}>{a.label}</Txt>
              {nowPkg === a.pkg ? <Txt v="caption" color={C.live}>Open</Txt> : null}
            </View>
          </Press>
        </Animated.View>
      ))}
    </View>
  );

  return (
    <ScrollView
      contentContainerStyle={{ paddingTop: insets.top + 6, paddingHorizontal: S.gutter, paddingBottom: insets.bottom + 120 }}
      refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.glow} colors={[C.glow]} progressBackgroundColor="#141A3A"
        onRefresh={async () => { setRefreshing(true); await useStore.getState().refreshApps(); setRefreshing(false); }} />}
    >
      <Txt v="display">Apps</Txt>
      <Txt v="body" color={C.dim} style={{ marginTop: 4, marginBottom: 22 }}>Tap one to open it on the TV.</Txt>

      {!apps.length ? (
        <View style={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={{ width: tile }}>
              <Shimmer style={{ aspectRatio: 16 / 9 }} radius={R.md} />
              <Shimmer style={{ height: 12, width: '55%', marginTop: 10 }} radius={6} />
            </View>
          ))}
        </View>
      ) : (
        <>
          {shelf.length ? (
            <>
              <Txt v="serif" style={{ marginBottom: 12 }}>On your shelf</Txt>
              {grid(shelf, 0)}
            </>
          ) : null}
          {rest.length ? (
            <>
              <Txt v="serif" style={{ marginTop: shelf.length ? 28 : 0, marginBottom: 12 }}>All apps</Txt>
              {grid(rest, shelf.length)}
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tileWrap: {
    borderRadius: R.md, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)',
  },
  tileOn: {
    borderColor: C.live, borderWidth: 1.5,
    shadowColor: C.live, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
});
