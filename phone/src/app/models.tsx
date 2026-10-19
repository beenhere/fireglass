import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Check, Cpu, Download, Pause, Play, Trash2, X } from 'lucide-react-native';
import { formatBytes, MODELS, type ModelSpec } from '@/lib/models';
import { llmAvailable } from '@/native/llm';
import { freeSpace } from '@/native/modelFiles';
import { useAssistant } from '@/state/assistant';
import { useDownloads, type DlState } from '@/state/downloads';
import { useStore } from '@/state/store';
import { Button, RoundButton } from '@/ui/Controls';
import { Glass } from '@/ui/Glass';
import { Sheet } from '@/ui/Sheet';
import { Shimmer } from '@/ui/Shimmer';
import { Txt } from '@/ui/Txt';
import { C, R, S, SPRING } from '@/ui/theme';

export default function Models() {
  const insets = useSafeAreaInsets();
  const states = useDownloads((s) => s.states);
  const modelId = useStore((s) => s.modelId);
  const [confirmDelete, setConfirmDelete] = useState<ModelSpec | null>(null);
  const free = freeSpace();
  useEffect(() => { useDownloads.getState().refresh(); }, []);

  return (
    <View style={{ flex: 1, paddingTop: insets.top + 6 }}>
      <View style={{ paddingHorizontal: S.gutter, height: 52, justifyContent: 'center' }}>
        <RoundButton icon={ArrowLeft} size={44} label="Back" feedback="tap" onPress={() => router.back()} />
      </View>
      <ScrollView contentContainerStyle={{ padding: S.gutter, paddingTop: 8, paddingBottom: insets.bottom + 40 }}>
        <Animated.View entering={FadeInDown.duration(450)}>
          <Txt v="display">Assistant models</Txt>
          <Txt v="body" color={C.dim} style={{ marginTop: 8 }}>
            The assistant runs on this phone, so what you say never leaves it. Pick one model; you can switch any time.
          </Txt>
          {free != null ? (
            <Txt v="caption" color={C.faint} style={{ marginTop: 8 }}>{formatBytes(free)} free on this phone</Txt>
          ) : null}
          {!llmAvailable ? (
            <Txt v="caption" color={C.warn} style={{ marginTop: 8 }}>Models only run in the phone app.</Txt>
          ) : null}
        </Animated.View>

        <View style={{ gap: 14, marginTop: 22 }}>
          {MODELS.map((m, i) => (
            <Animated.View key={m.id} entering={FadeInDown.delay(100 + i * 80).springify().damping(18)}>
              <ModelCard m={m} st={states[m.id] ?? { kind: 'none' }} inUse={modelId === m.id} free={free}
                onDelete={() => setConfirmDelete(m)} />
            </Animated.View>
          ))}
        </View>

        <Txt v="caption" color={C.faint} style={{ marginTop: 22 }}>
          Without a model, simple commands still work: “open Netflix”, “play Dark”, “down twice”, “type lofi and enter”.
        </Txt>
      </ScrollView>

      <Sheet visible={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete this model?">
        <Txt v="body" color={C.dim}>
          {confirmDelete ? `${confirmDelete.name} frees ${formatBytes(confirmDelete.bytes)}. You can download it again later.` : ''}
        </Txt>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <Button title="Keep" kind="secondary" style={{ flex: 1 }} onPress={() => setConfirmDelete(null)} />
          <Button title="Delete" kind="danger" icon={Trash2} style={{ flex: 1 }}
            onPress={async () => { const m = confirmDelete!; setConfirmDelete(null); await useDownloads.getState().remove(m); }} />
        </View>
      </Sheet>
    </View>
  );
}

function ModelCard({ m, st, inUse, free, onDelete }: { m: ModelSpec; st: DlState; inUse: boolean; free: number | null; onDelete: () => void }) {
  const dl = useDownloads.getState();
  const lowSpace = free != null && st.kind === 'none' && free < m.bytes * 1.1;
  return (
    <Glass radius={R.lg} style={{ padding: 18 }} tint={inUse ? 'rgba(169,184,255,0.14)' : undefined}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
        <View style={styles.icon}><Cpu size={20} color={C.text} strokeWidth={1.9} /></View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Txt v="heading">{m.name}</Txt>
            {m.recommended ? <View style={styles.tag}><Txt v="caption" color="#0B1030">Recommended</Txt></View> : null}
            {inUse ? (
              <View style={[styles.tag, { backgroundColor: C.live }]}>
                <Check size={12} color="#08251D" strokeWidth={3} />
                <Txt v="caption" color="#08251D">In use</Txt>
              </View>
            ) : null}
          </View>
          <Txt v="caption" color={C.faint} style={{ marginTop: 2 }}>{m.maker} · {formatBytes(m.bytes)} · {m.license}</Txt>
          <Txt v="body" color={C.dim} style={{ marginTop: 8 }}>{m.blurb}</Txt>
          <Txt v="caption" color={C.faint} style={{ marginTop: 4 }}>{m.ramHint}</Txt>
        </View>
      </View>

      {st.kind === 'active' || st.kind === 'paused' ? (
        <Progress written={st.written} total={st.kind === 'active' ? st.total : m.bytes} paused={st.kind === 'paused'} />
      ) : null}
      {st.kind === 'error' ? <Txt v="caption" color={C.bad} style={{ marginTop: 12 }}>{st.message}</Txt> : null}
      {lowSpace ? <Txt v="caption" color={C.warn} style={{ marginTop: 12 }}>Not enough free space for this one.</Txt> : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        {st.kind === 'none' || st.kind === 'error' ? (
          <Button small title={`Download ${formatBytes(m.bytes)}`} icon={Download} onPress={() => dl.start(m)} disabled={!llmAvailable || lowSpace} />
        ) : null}
        {st.kind === 'active' ? (
          <>
            <Button small title="Pause" icon={Pause} kind="secondary" onPress={() => dl.pause(m)} />
            <Button small title="Cancel" icon={X} kind="secondary" onPress={() => dl.cancel(m)} />
          </>
        ) : null}
        {st.kind === 'paused' ? (
          <>
            <Button small title="Resume" icon={Play} onPress={() => dl.start(m)} />
            <Button small title="Cancel" icon={X} kind="secondary" onPress={() => dl.cancel(m)} />
          </>
        ) : null}
        {st.kind === 'done' ? (
          <>
            {!inUse ? (
              <Button small title="Use this" icon={Check} onPress={async () => {
                useStore.getState().setModel(m.id);
                useAssistant.setState({ modelStatus: 'none' });
                useAssistant.getState().warmUp();
              }} />
            ) : null}
            <Button small title="Delete" icon={Trash2} kind="secondary" onPress={onDelete} />
          </>
        ) : null}
      </View>
    </Glass>
  );
}

function Progress({ written, total, paused }: { written: number; total: number; paused: boolean }) {
  const pct = total > 0 ? Math.min(1, written / total) : 0;
  const bar = useAnimatedStyle(() => ({ width: withSpring(`${pct * 100}%`, SPRING.soft) }), [pct]);
  return (
    <View style={{ marginTop: 16 }}>
      <View style={styles.track}>
        {!paused ? <Shimmer style={StyleSheet.absoluteFill} radius={4} /> : null}
        <Animated.View style={[styles.fill, paused && { backgroundColor: C.faint }, bar]} />
      </View>
      <Txt v="caption" color={C.faint} style={{ marginTop: 6 }}>
        {paused ? 'Paused, ' : ''}{formatBytes(written)} of {formatBytes(total)} · {Math.round(pct * 100)}%
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(169,184,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.glow, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4, backgroundColor: C.glow },
});
