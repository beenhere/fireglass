import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { CornerDownLeft } from 'lucide-react-native';
import { haptic } from '@/lib/haptics';
import { friendlyError } from '@/lib/execute';
import { activeClient } from '@/state/store';
import { Button } from './Controls';
import { Glass } from './Glass';
import { Sheet } from './Sheet';
import { Txt } from './Txt';
import { C, F, R } from './theme';

/**
 * Types on the TV as you type: new characters go over after a short pause. The TV's text API only
 * adds characters, so deleting here can't remove what was already sent.
 */
export function KeyboardSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sending = useRef(Promise.resolve());
  const sentRef = useRef(0);

  useEffect(() => { if (visible) { setText(''); setSent(0); sentRef.current = 0; setErr(null); setNote(null); } }, [visible]);

  const flush = (value: string, submit: boolean) => {
    sending.current = sending.current.then(async () => {
      const c = activeClient();
      if (!c) return;
      const delta = value.length > sentRef.current && value.startsWith(value.slice(0, sentRef.current)) ? value.slice(sentRef.current) : '';
      if (!delta && !submit) return;
      try {
        const r = await c.text(delta, submit);
        if (!r.ok) throw new Error(r.error.replace(/_/g, ' '));
        sentRef.current = value.length;
        setSent(value.length);
        setErr(null);
      } catch (e) {
        setErr(friendlyError(e));
      }
    });
    return sending.current;
  };

  const onChange = (v: string) => {
    if (v.length < sentRef.current) {
      // can't un-type on the TV; let the user keep going from here
      sentRef.current = v.length;
      setSent(v.length);
      setNote('Deleting here doesn’t delete on the TV yet. Use the TV’s keyboard to fix it.');
    }
    setText(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => flush(v, false), 260);
  };

  const submit = async () => {
    if (timer.current) clearTimeout(timer.current);
    haptic.press();
    await flush(text, true);
    setText('');
    sentRef.current = 0;
    setSent(0);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title="Type on TV">
      <Txt v="body" color={C.dim} style={{ marginBottom: 14 }}>
        Select a search box on the TV first. Letters appear there as you type.
      </Txt>
      <Glass radius={R.lg} style={styles.field}>
        <TextInput
          autoFocus value={text} onChangeText={onChange} placeholder="Search or type" placeholderTextColor={C.ghost}
          style={styles.input} selectionColor={C.glow} returnKeyType="send" onSubmitEditing={submit}
          autoCorrect={false} autoCapitalize="none" blurOnSubmit={false} accessibilityLabel="Text to type on the TV"
        />
        <View style={styles.sentRow}>
          {text.length ? (
            <Animated.View entering={FadeIn} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={[styles.dot, { backgroundColor: sent >= text.length ? C.live : C.warn }]} />
              <Txt v="caption" color={C.faint}>{sent >= text.length ? 'On the TV' : 'Sending'}</Txt>
            </Animated.View>
          ) : null}
        </View>
      </Glass>
      {err ? <Txt v="caption" color={C.bad} style={{ marginTop: 8 }}>{err}</Txt> : null}
      {note && !err ? <Txt v="caption" color={C.warn} style={{ marginTop: 8 }}>{note}</Txt> : null}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
        <Button title="Done" kind="secondary" style={{ flex: 1 }} onPress={async () => { if (timer.current) clearTimeout(timer.current); await flush(text, false); onClose(); }} />
        <Button title="Enter" icon={CornerDownLeft} style={{ flex: 1.4 }} onPress={submit} />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  field: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10 },
  input: { color: C.text, fontFamily: F.medium, fontSize: 20, padding: 0, minHeight: 32 },
  sentRow: { height: 20, justifyContent: 'center', marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});
