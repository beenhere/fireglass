import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Star } from 'lucide-react-native';
import type { TvClient } from '@/lib/api';
import type { Title, TvApp } from '@/lib/types';
import { Press } from './Press';
import { Shimmer } from './Shimmer';
import { Txt } from './Txt';
import { C, R, withAlpha } from './theme';

type Src = ReturnType<TvClient['bannerSource']>;

/** Browsers can't send auth headers with <img>, so the web preview fetches the banner itself. */
function useWebSafeSource(src: Src | null): Src | { uri: string } | null {
  const [blob, setBlob] = useState<string | null>(null);
  const web = Platform.OS === 'web';
  useEffect(() => {
    if (!web || !src) return;
    let url: string | null = null;
    let live = true;
    fetch(src.uri, { headers: src.headers }).then((r) => (r.ok ? r.blob() : Promise.reject())).then((b) => {
      url = URL.createObjectURL(b);
      if (live) setBlob(url);
    }).catch(() => { if (live) setBlob('error'); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [web, src?.uri]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!web) return src;
  return blob ? { uri: blob === 'error' ? 'about:invalid' : blob } : null;
}

/** An app's TV banner (320x180) from the TV, with its colour and name as a fallback. */
export function Banner({ client, app, style, radius = R.md }: {
  client: TvClient | null; app: Pick<TvApp, 'pkg' | 'label' | 'color'>; style?: StyleProp<ViewStyle>; radius?: number;
}) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  const color = app.color ?? C.indigo;
  const source = useWebSafeSource(client ? client.bannerSource(app.pkg) : null);
  return (
    <View style={[{ aspectRatio: 16 / 9, borderRadius: radius, overflow: 'hidden' }, style]}>
      <LinearGradient colors={[withAlpha(color, 0.85), withAlpha(color, 0.45)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, styles.center]}>
        {state === 'failed' ? <Txt v="heading" numberOfLines={2} style={{ textAlign: 'center', paddingHorizontal: 8 }}>{app.label}</Txt> : null}
      </LinearGradient>
      {state === 'loading' ? <Shimmer style={StyleSheet.absoluteFill} radius={0} /> : null}
      {source && state !== 'failed' ? (
        <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" transition={250}
          onLoad={() => setState('ok')} onError={() => setState('failed')} cachePolicy="memory-disk" />
      ) : null}
    </View>
  );
}

function Rating({ value }: { value?: number }) {
  if (!value) return null;
  return (
    <View style={styles.rating}>
      <Star size={11} color={C.warn} fill={C.warn} />
      <Txt v="caption" color={C.text}>{value.toFixed(1)}</Txt>
    </View>
  );
}

/** Portrait poster card. */
export function PosterCard({ t, width = 128, onPress, onLongPress }: { t: Title; width?: number; onPress?: () => void; onLongPress?: () => void }) {
  return (
    <Press onPress={onPress} onLongPress={onLongPress} delayLongPress={350} scaleTo={0.95} style={{ width }} accessibilityRole="button" accessibilityLabel={`${t.title}${t.year ? `, ${t.year}` : ''}`}>
      <View style={[styles.poster, { width, height: width * 1.5 }]}>
        <Shimmer style={StyleSheet.absoluteFill} radius={0} />
        {t.poster ? <Image source={{ uri: t.poster }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} cachePolicy="memory-disk" /> : null}
        <View style={{ position: 'absolute', top: 8, left: 8 }}><Rating value={t.rating} /></View>
      </View>
      <Txt v="label" numberOfLines={1} style={{ marginTop: 8 }}>{t.title}</Txt>
      <Txt v="caption" color={C.faint} numberOfLines={1}>{[t.year, t.offers?.[0]?.label].filter(Boolean).join(' · ') || ' '}</Txt>
    </Press>
  );
}

/** Wide backdrop card with the title over a soft fade. */
export function BackdropCard({ t, width, onPress, onLongPress }: { t: Title; width: number; onPress?: () => void; onLongPress?: () => void }) {
  const img = t.backdrop ?? t.poster;
  return (
    <Press onPress={onPress} onLongPress={onLongPress} delayLongPress={350} scaleTo={0.97} style={{ width }} accessibilityRole="button" accessibilityLabel={t.title}>
      <View style={[styles.backdrop, { width, height: width * 0.5625 }]}>
        <Shimmer style={StyleSheet.absoluteFill} radius={0} />
        {img ? <Image source={{ uri: img }} style={StyleSheet.absoluteFill} contentFit="cover" transition={300} cachePolicy="memory-disk" /> : null}
        <LinearGradient colors={['rgba(7,11,31,0)', 'rgba(7,11,31,0.15)', 'rgba(7,11,31,0.88)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
        <View style={styles.backdropText}>
          <Txt v="serif" numberOfLines={1} style={{ fontSize: 26, lineHeight: 30 }}>{t.title}</Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Rating value={t.rating} />
            <Txt v="caption" color={C.dim} numberOfLines={1} style={{ flexShrink: 1 }}>
              {[t.year, t.genres?.slice(0, 2).join(', '), t.offers?.[0]?.label].filter(Boolean).join(' · ')}
            </Txt>
          </View>
        </View>
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  poster: { borderRadius: R.md, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  backdrop: { borderRadius: R.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  backdropText: { position: 'absolute', left: 16, right: 16, bottom: 14 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(7,11,31,0.6)', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 3 },
});
