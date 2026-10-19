import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from './theme';
import { Txt } from './Txt';

/** Bottom sheet over a dimmed sky: springs up, drops away. */
export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      {visible ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, { backgroundColor: C.scrim }]}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
          </Animated.View>
          <View style={{ flex: 1 }} pointerEvents="box-none" />
          <Animated.View
            entering={reduced ? FadeIn : SlideInDown.springify().damping(20).stiffness(170)}
            exiting={reduced ? FadeOut : SlideOutDown.duration(220)}
            style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 16) + 8 }]}
          >
            <View style={styles.handle} />
            {title ? <Txt v="title" style={{ marginBottom: 14 }}>{title}</Txt> : null}
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: '#141A3A',
    borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl,
    borderTopWidth: 1, borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 22, paddingTop: 10,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', marginBottom: 16 },
});
