import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Play, Star } from 'lucide-react-native';
import { friendlyError } from '@/lib/execute';
import { haptic } from '@/lib/haptics';
import { isTitle, type RecentItem, type Title, type TvApp } from '@/lib/types';
import { useClient, useStore } from '@/state/store';
import { Button } from '@/ui/Controls';
import { Glass } from '@/ui/Glass';
import { Banner, BackdropCard, PosterCard } from '@/ui/Media';
import { Press } from '@/ui/Press';
import { Sheet } from '@/ui/Sheet';
import { Shimmer } from '@/ui/Shimmer';
import { toast } from '@/ui/Toast';
import { Txt } from '@/ui/Txt';
import { C, R, S } from '@/ui/theme';

export default function Discover() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const client = useClient();
  const apps = useStore((s) => s.apps);
  const [recs, setRecs] = useState<Title[] | null>(null);
  const [recent, setRecent] = useState<RecentItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<Title | null>(null);
  const card = width - S.gutter * 2 - 28;

  const load = useCallback(async () => {
    if (!client) return;
    setErr(null);
    const [a, b] = await Promise.allSettled([client.recs(), client.recent()]);
    if (a.status === 'fulfilled') setRecs(a.value); else { setRecs([]); setErr(friendlyError(a.reason)); }
    if (b.status === 'fulfilled') setRecent(b.value); else setRecent([]);
  }, [client]);
  useEffect(() => { load(); }, [load]);

  const play = async (t: Title, pkg?: string) => {
    if (!client) return;
    haptic.press();
    setDetail(null);
    try {
      const r = await client.play({ id: t.id, title: t.title, pkg: pkg ?? null, kind: t.kind ?? null });
      if (r.ok) {
        haptic.ok();
        toast(`Opening ${r.opened.title} on ${apps.find((a) => a.pkg === r.opened.pkg)?.label ?? 'the TV'}`);
        setTimeout(() => { useStore.getState().refreshNow(); client.recent().then(setRecent).catch(() => {}); }, 1500);
      } else {
        haptic.err();
        toast(r.error === 'not_on_your_apps' ? `${t.title} isn’t on your apps` : `Couldn’t find ${t.title}`, 'error');
      }
    } catch (e) {
      haptic.err();
      toast(friendlyError(e), 'error');
    }
  };

  const launch = async (a: { pkg: string; label: string }) => {
    try { await client?.launch(a.pkg); haptic.ok(); toast(`Opening ${a.label}`); } catch (e) { toast(friendlyError(e), 'error'); }
  };

  const recentTitles = (recent ?? []).filter(isTitle);
  const recentApps = (recent ?? []).filter((x): x is { pkg: string; label: string } => !isTitle(x));

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} tintColor={C.glow} colors={[C.glow]} progressBackgroundColor="#141A3A"
          onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        <View style={{ paddingHorizontal: S.gutter }}>
          <Txt v="display">Discover</Txt>
          <Txt v="body" color={C.dim} style={{ marginTop: 4 }}>Trending on your apps. Tap to play on the TV, hold for details.</Txt>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={card + 12} decelerationRate="fast"
          contentContainerStyle={{ gap: 12, paddingHorizontal: S.gutter, paddingTop: 20 }}>
          {recs === null
            ? [0, 1].map((i) => <Shimmer key={i} style={{ width: card, height: card * 0.5625 }} radius={R.lg} />)
            : recs.map((t, i) => (
              <Animated.View key={t.id} entering={FadeInDown.delay(i * 70).springify().damping(18)}>
                <BackdropCard t={t} width={card} onPress={() => play(t)} onLongPress={() => { haptic.press(); setDetail(t); }} />
              </Animated.View>
            ))}
        </ScrollView>
        {recs && !recs.length ? (
          <Glass radius={R.lg} style={{ marginHorizontal: S.gutter, padding: 18 }}>
            <Txt v="body" color={C.dim}>{err ?? 'Nothing trending right now. Pull down to try again.'}</Txt>
          </Glass>
        ) : null}

        {recs && recs.length > 2 ? (
          <>
            <Txt v="serif" style={{ marginTop: 30, marginBottom: 12, paddingHorizontal: S.gutter }}>More to watch</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: S.gutter }}>
              {[...recs].reverse().map((t) => (
                <PosterCard key={t.id} t={t} onPress={() => play(t)} onLongPress={() => { haptic.press(); setDetail(t); }} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <Txt v="serif" style={{ marginTop: 30, marginBottom: 12, paddingHorizontal: S.gutter }}>Recently opened</Txt>
        {recent === null ? (
          <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: S.gutter }}>
            {[0, 1, 2].map((i) => <Shimmer key={i} style={{ width: 128, height: 192 }} radius={R.md} />)}
          </View>
        ) : !recent.length ? (
          <Txt v="body" color={C.faint} style={{ paddingHorizontal: S.gutter }}>Things you open from the TV home or this phone show up here.</Txt>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: S.gutter, alignItems: 'flex-start' }}>
            {recentTitles.map((t) => (
              <PosterCard key={t.id} t={t} onPress={() => play(t)} onLongPress={() => { haptic.press(); setDetail(t); }} />
            ))}
            {recentApps.map((a) => (
              <Press key={a.pkg} onPress={() => launch(a)} feedback="press" scaleTo={0.95} style={{ width: 170 }} accessibilityLabel={`Open ${a.label}`}>
                <Banner client={client} app={{ ...a, color: apps.find((x) => x.pkg === a.pkg)?.color }} radius={R.md} />
                <Txt v="label" numberOfLines={1} style={{ marginTop: 8 }}>{a.label}</Txt>
              </Press>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <Sheet visible={!!detail} onClose={() => setDetail(null)}>
        {detail ? <Detail t={detail} apps={apps} onPlay={(pkg) => play(detail, pkg)} /> : null}
      </Sheet>
    </>
  );
}

function Detail({ t, apps, onPlay }: { t: Title; apps: TvApp[]; onPlay: (pkg?: string) => void }) {
  return (
    <Animated.View entering={FadeIn.duration(250)}>
      <View style={{ flexDirection: 'row', gap: 16 }}>
        {t.poster ? <Image source={{ uri: t.poster }} style={styles.detailPoster} contentFit="cover" /> : null}
        <View style={{ flex: 1 }}>
          <Txt v="title">{t.title}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {t.rating ? <><Star size={13} color={C.warn} fill={C.warn} /><Txt v="label">{t.rating.toFixed(1)}</Txt></> : null}
            <Txt v="caption" color={C.dim}>{[t.year, t.kind === 'tv' ? 'Series' : t.kind === 'movie' ? 'Film' : null, t.genres?.slice(0, 2).join(', ')].filter(Boolean).join(' · ')}</Txt>
          </View>
          {t.overview ? <Txt v="body" color={C.dim} numberOfLines={6} style={{ marginTop: 10 }}>{t.overview}</Txt> : null}
        </View>
      </View>
      <View style={{ gap: 10, marginTop: 20 }}>
        {(t.offers?.length ? t.offers : [null]).map((o, i) => (
          <Button key={o?.pkg ?? 'any'} title={o ? `Play on ${apps.find((a) => a.pkg === o.pkg)?.label ?? o.label}` : 'Play'}
            icon={Play} kind={i === 0 ? 'primary' : 'secondary'} onPress={() => onPlay(o?.pkg)} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  detailPoster: { width: 110, height: 165, borderRadius: R.md },
});
