import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, FadeIn, FadeInDown, FadeInUp, FadeOut, LinearTransition, useAnimatedStyle, useReducedMotion, useSharedValue,
  withDelay, withRepeat, withSequence, withSpring, withTiming, useAnimatedKeyboard,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AppWindow, ArrowUp, CircleAlert, CircleCheck, Keyboard as KeyboardIcon, MessageCircle, Mic, Move, Play, Search, Sparkles, Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import { shortNames } from '@/lib/apps';
import { haptic } from '@/lib/haptics';
import { modelById } from '@/lib/models';
import { useSpeech } from '@/native/speech';
import { useAssistant, type Msg } from '@/state/assistant';
import { useStore } from '@/state/store';
import { Chip } from '@/ui/Controls';
import { Glass } from '@/ui/Glass';
import { PosterCard } from '@/ui/Media';
import { Press } from '@/ui/Press';
import { Txt } from '@/ui/Txt';
import { useKeyboardShown } from '@/ui/useKeyboardShown';
import { C, F, R, S, SPRING } from '@/ui/theme';

const SUGGESTIONS = ['Play Stranger Things', 'Open YouTube', 'Pause', 'Open YouTube and search lofi', 'Down twice and select', 'Find Malayalam thrillers'];
const TAB_BAR = 92;

const ICON: Record<string, LucideIcon> = { play: Play, launch: AppWindow, keys: Move, type: KeyboardIcon, search: Search, reply: MessageCircle };

export default function Assistant() {
  const insets = useSafeAreaInsets();
  const msgs = useAssistant((s) => s.msgs);
  const busy = useAssistant((s) => s.busy);
  const thinking = useAssistant((s) => s.thinking);
  const apps = useStore((s) => s.apps);
  const kb = useKeyboardShown();
  const [text, setText] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  // Android 15+ draws edge to edge and no longer resizes the window for the keyboard, so the
  // screen lifts itself by the keyboard's live height (tracks the keyboard's own animation).
  const keyboard = useAnimatedKeyboard();
  const lift = useAnimatedStyle(() => ({ paddingBottom: keyboard.height.value }));

  const speech = useSpeech((t) => useAssistant.getState().send(t, 'voice'));
  const hints = useMemo(() => [...apps.map((a) => a.label), ...shortNames(apps), 'play', 'open', 'pause', 'search'], [apps]);

  useEffect(() => { useAssistant.getState().warmUp(); }, []);
  useEffect(() => { setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80); }, [msgs, thinking]);

  const submit = (t = text) => {
    if (!t.trim() || busy) return;
    haptic.tap();
    useAssistant.getState().send(t, 'text');
    setText('');
  };

  return (
    <Animated.View style={[{ flex: 1, paddingTop: insets.top + 6 }, lift]}>
      <Header />
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: S.gutter, paddingBottom: 20, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled">
        {!msgs.length ? <Empty onPick={submit} /> : null}
        {msgs.map((m) => <Bubble key={m.id} m={m} />)}
        {thinking ? <Thinking /> : null}
      </ScrollView>

      {speech.listening || speech.error || speech.hint ? <Listening speech={speech} /> : null}

      <View style={{ paddingBottom: kb ? 10 : insets.bottom + TAB_BAR + 6, paddingTop: 8 }}>
        {msgs.length && !text ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: S.gutter, paddingBottom: 10 }}
            keyboardShouldPersistTaps="handled">
            {SUGGESTIONS.slice(0, 4).map((s) => <Chip key={s} title={s} onPress={() => submit(s)} />)}
          </ScrollView>
        ) : null}
        <View style={styles.composer}>
          <Glass radius={R.pill} style={styles.inputWrap}>
            <TextInput value={text} onChangeText={setText} placeholder="Ask for a show, an app, a button" placeholderTextColor={C.ghost}
              style={styles.input} selectionColor={C.glow} returnKeyType="send" onSubmitEditing={() => submit()} accessibilityLabel="Message" />
            {text.trim() ? (
              <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
                <Press onPress={() => submit()} style={styles.send} accessibilityLabel="Send" disabled={busy}>
                  {busy ? <ActivityIndicator size="small" color="#0B1030" /> : <ArrowUp size={20} color="#0B1030" strokeWidth={2.4} />}
                </Press>
              </Animated.View>
            ) : null}
          </Glass>
          <MicButton onStart={() => speech.start(hints)} onStop={speech.stop} onCancel={speech.cancel} onTap={speech.tapHint}
            listening={speech.listening} level={speech.level} />
        </View>
      </View>
    </Animated.View>
  );
}

function Header() {
  const modelId = useStore((s) => s.modelId);
  const status = useAssistant((s) => s.modelStatus);
  const pct = useAssistant((s) => s.modelPct);
  const hasMsgs = useAssistant((s) => s.msgs.length > 0);
  const spec = modelById(modelId);
  const label = status === 'ready' && spec ? `${spec.name}, on this phone`
    : status === 'loading' ? `Loading the model ${Math.round(pct)}%`
    : status === 'error' ? 'Model didn’t load, simple commands only'
    : 'Simple commands only';
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Txt v="display">Assistant</Txt>
        <Press onPress={() => router.push('/models')} feedback="tap" scaleTo={0.97} style={{ alignSelf: 'flex-start', marginTop: 4 }}
          accessibilityRole="button" accessibilityLabel={`${label}. Manage models`}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {status === 'loading' ? <ActivityIndicator size="small" color={C.glow} /> : <Sparkles size={14} color={status === 'ready' ? C.live : C.faint} />}
            <Txt v="caption" color={C.dim}>{label}</Txt>
          </View>
        </Press>
      </View>
      {hasMsgs ? (
        <Press onPress={() => useAssistant.getState().clear()} hitSlop={10} accessibilityLabel="Clear the conversation" style={{ padding: 8 }}>
          <Trash2 size={20} color={C.faint} />
        </Press>
      ) : null}
    </View>
  );
}

function Empty({ onPick }: { onPick: (s: string) => void }) {
  return (
    <Animated.View entering={FadeInDown.duration(500)} style={{ flex: 1, justifyContent: 'center', paddingVertical: 30 }}>
      <Txt v="title" style={{ fontSize: 36, lineHeight: 40 }}>What would you{'\n'}like to watch?</Txt>
      <Txt v="body" color={C.dim} style={{ marginTop: 10, maxWidth: 320 }}>
        Hold the mic and say it, or type. Everything is worked out here on your phone.
      </Txt>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 22 }}>
        {SUGGESTIONS.map((s, i) => (
          <Animated.View key={s} entering={FadeInDown.delay(120 + i * 60).springify().damping(18)}>
            <Chip title={s} onPress={() => onPick(s)} />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

function Bubble({ m }: { m: Msg }) {
  if (m.role === 'user') {
    return (
      <Animated.View entering={FadeInUp.springify().damping(20)} layout={LinearTransition} style={{ alignSelf: 'flex-end', maxWidth: '82%', marginTop: 14 }}>
        <View style={styles.userBubble}>
          {m.via === 'voice' ? <Mic size={14} color="#0B1030" style={{ marginTop: 3 }} /> : null}
          <Txt v="body" color="#0B1030" style={{ flexShrink: 1 }}>{m.text}</Txt>
        </View>
      </Animated.View>
    );
  }
  if (m.role === 'note') {
    return (
      <Animated.View entering={FadeIn.duration(300)} layout={LinearTransition} style={{ marginTop: 12, maxWidth: '90%' }}>
        <Txt v="body" color={m.tone === 'error' ? C.bad : C.dim}>{m.text}</Txt>
      </Animated.View>
    );
  }
  const Icon = ICON[m.action.action] ?? Sparkles;
  const reply = m.action.action === 'reply';
  return (
    <Animated.View entering={FadeInUp.springify().damping(20)} layout={LinearTransition} style={{ marginTop: 14, maxWidth: '94%' }}>
      <Glass radius={R.lg} style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={styles.actIcon}><Icon size={18} color={C.text} strokeWidth={2} /></View>
          <View style={{ flex: 1 }}>
            <Txt v={reply ? 'body' : 'heading'}>{m.summary}</Txt>
            <Txt v="caption" color={C.faint} style={{ marginTop: 1 }}>
              {m.source === 'rules' ? 'Quick command' : `Understood on this phone${m.ms ? ` in ${(m.ms / 1000).toFixed(1)} s` : ''}`}
            </Txt>
          </View>
        </View>
        {!reply ? (
          <View style={styles.statusRow}>
            {m.status === 'running' ? <ActivityIndicator size="small" color={C.glow} />
              : m.status === 'failed' ? <CircleAlert size={16} color={C.bad} />
              : (m.status === 'choose' || m.status === 'confirm') ? <Search size={16} color={C.warn} />
              : <CircleCheck size={16} color={C.live} />}
            <Txt v="label" color={m.status === 'failed' ? C.bad : C.dim} style={{ flex: 1 }}>
              {m.status === 'running' ? (m.note ?? 'Sending to the TV…') : m.note}
            </Txt>
          </View>
        ) : null}
        {m.titles?.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, marginHorizontal: -14 }}
            contentContainerStyle={{ gap: 12, paddingHorizontal: 14 }}>
            {m.titles.map((t) => <PosterCard key={t.id} t={t} width={112} onPress={() => useAssistant.getState().pick(m.id, t)} />)}
          </ScrollView>
        ) : null}
      </Glass>
    </Animated.View>
  );
}

function Thinking() {
  return (
    <Animated.View entering={FadeIn} exiting={FadeOut} style={{ marginTop: 14, alignSelf: 'flex-start' }}>
      <Glass radius={R.pill} style={{ flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 14 }}>
        {[0, 1, 2].map((i) => <ThinkDot key={i} i={i} />)}
      </Glass>
    </Animated.View>
  );
}

function ThinkDot({ i }: { i: number }) {
  const v = useSharedValue(0.3);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return;
    v.value = withDelay(i * 160, withRepeat(withSequence(withTiming(1, { duration: 380 }), withTiming(0.3, { duration: 380 })), -1));
  }, [i, v, reduced]);
  const st = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ translateY: (1 - v.value) * 3 }] }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.text }, st]} />;
}

/** Push-and-hold: speak while holding, let go to send, slide up to cancel. */
const HOLD_MS = 280; // shorter than this is a tap: it doesn't listen, it shows how

function MicButton({ onStart, onStop, onCancel, onTap, listening, level }: {
  onStart: () => void; onStop: () => void; onCancel: () => void; onTap: () => void; listening: boolean; level: number;
}) {
  const scale = useSharedValue(1);
  const ring = useSharedValue(0);
  const cancelled = useRef(false);
  const started = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    ring.value = withTiming(listening ? 1 + level * 0.9 : 0, { duration: 90, easing: Easing.out(Easing.quad) });
  }, [listening, level, ring]);

  const g = Gesture.Pan().runOnJS(true).minDistance(0)
    .onBegin(() => {
      cancelled.current = false;
      started.current = false;
      if (!reduced) scale.value = withSpring(1.12, SPRING.press);
      timer.current = setTimeout(() => { started.current = true; haptic.press(); onStart(); }, HOLD_MS);
    })
    .onUpdate((e) => {
      if (started.current && !cancelled.current && e.translationY < -70) {
        cancelled.current = true;
        haptic.err();
        onCancel();
      }
    })
    .onFinalize(() => {
      scale.value = withSpring(1, SPRING.settle);
      if (timer.current) clearTimeout(timer.current);
      if (!started.current) { haptic.err(); onTap(); return; }
      if (!cancelled.current) { haptic.tap(); onStop(); }
    });

  const btn = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const halo = useAnimatedStyle(() => ({ opacity: ring.value ? 0.35 + ring.value * 0.25 : 0, transform: [{ scale: 1 + ring.value * 0.45 }] }));

  return (
    <GestureDetector gesture={g}>
      <View accessible accessibilityRole="button" accessibilityLabel="Hold to talk" style={{ width: 60, height: 60 }}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.halo, halo]} pointerEvents="none" />
        <Animated.View style={[styles.mic, listening && styles.micOn, btn]}>
          <Mic size={24} color={listening ? '#0B1030' : C.text} strokeWidth={2.1} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

function Listening({ speech }: { speech: ReturnType<typeof useSpeech> }) {
  useEffect(() => {
    if (!speech.error && !speech.hint) return;
    const t = setTimeout(speech.clearError, speech.hint ? 2800 : 4500);
    return () => clearTimeout(t);
  }, [speech.error, speech.hint, speech.clearError]);
  return (
    <Animated.View entering={FadeInUp.springify().damping(18)} exiting={FadeOut.duration(160)} style={{ paddingHorizontal: S.gutter }}>
      <Glass radius={R.lg} style={{ padding: 16 }} tint={speech.error ? 'rgba(255,138,155,0.08)' : 'rgba(169,184,255,0.10)'}>
        {speech.error ? (
          <Txt v="body" color={C.bad}>{speech.error}</Txt>
        ) : speech.hint && !speech.listening ? (
          <Txt v="body" color={C.dim}>{speech.hint}</Txt>
        ) : (
          <>
            <Txt v="caption" color={C.faint}>{speech.onDevice ? 'Listening, on this phone' : 'Listening'}</Txt>
            <Txt v="serif" style={{ marginTop: 4, fontSize: 26, lineHeight: 30 }}>{speech.transcript || '…'}</Txt>
            <Txt v="caption" color={C.faint} style={{ marginTop: 8 }}>Let go to send. Slide up to cancel.</Txt>
          </>
        )}
      </Glass>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: S.gutter, marginBottom: 6 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: S.gutter },
  inputWrap: { flex: 1, height: 54, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6 },
  input: { flex: 1, color: C.text, fontFamily: F.medium, fontSize: 16, padding: 0 },
  send: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.glow, alignItems: 'center', justifyContent: 'center' },
  userBubble: {
    flexDirection: 'row', gap: 6, backgroundColor: C.glow, borderRadius: R.lg, borderBottomRightRadius: 8,
    paddingHorizontal: 15, paddingVertical: 10,
  },
  actIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(169,184,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.14)' },
  mic: {
    width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(169,184,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
  },
  micOn: { backgroundColor: C.glow, borderColor: '#fff' },
  halo: { borderRadius: 30, backgroundColor: C.glow },
});
