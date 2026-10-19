import { useCallback, useRef, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { readJson, writeJson } from './storage';

export type SpeechState = {
  listening: boolean;
  transcript: string;
  level: number; // 0..1 mic level while listening
  error: string | null;
  onDevice: boolean;
  hint: string | null; // how-to, after a tap instead of a hold
};

const ERRORS: Record<string, string> = {
  'not-allowed': 'Allow the microphone in Settings to talk to your TV.',
  'no-speech': "I didn't hear anything. Hold the mic and speak.",
  'speech-timeout': "I didn't hear anything. Hold the mic and speak.",
  'network': 'Speech needs the internet until your phone has its offline English pack.',
  'language-not-supported': 'Your phone’s speech service doesn’t know English. Check its voice settings.',
  'service-not-allowed': 'Speech recognition is turned off on this phone.',
  'client': 'Voice didn’t start. Hold the mic and try again, or type it.',
};

let service: string | undefined;
let askedPack = false;

/**
 * Which recogniser to use. Phones like OnePlus default to "Speech Services by Google", which
 * refuses these requests ("client" error); the Google app's recogniser works everywhere it's
 * installed and goes on-device by itself once it has the offline pack, which we ask for once.
 */
function pickService(): string | undefined {
  if (service !== undefined) return service || undefined;
  service = '';
  try {
    const all = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
    if (all.includes('com.google.android.googlequicksearchbox')) service = 'com.google.android.googlequicksearchbox';
    if (!askedPack && !readJson('speech.json', { asked: false }).asked) {
      askedPack = true;
      writeJson('speech.json', { asked: true });
      // Only if no English pack is on the phone yet; Android shows a download dialog otherwise.
      ExpoSpeechRecognitionModule.getSupportedLocales({}).then(({ installedLocales }) => {
        if (!installedLocales.some((l) => l.toLowerCase().startsWith('en'))) {
          return ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: 'en-US' });
        }
      }).catch(() => {});
    }
  } catch {}
  return service || undefined;
}

/**
 * Push-to-talk speech to text. Prefers on-device recognition when the phone supports it.
 * `onFinal` gets the final transcript when the user lets go.
 */
export function useSpeech(onFinal: (text: string) => void) {
  const [s, set] = useState<SpeechState>({ listening: false, transcript: '', level: 0, error: null, onDevice: false, hint: null });
  const latest = useRef('');
  const wantFinal = useRef(false);
  const hintsRef = useRef<string[]>([]);
  const triedOnline = useRef(false);

  useSpeechRecognitionEvent('start', () => set((p) => ({ ...p, listening: true, error: null })));
  useSpeechRecognitionEvent('end', () => {
    set((p) => ({ ...p, listening: false, level: 0 }));
    if (wantFinal.current && latest.current.trim()) onFinal(latest.current.trim());
    wantFinal.current = false;
  });
  useSpeechRecognitionEvent('result', (e) => {
    latest.current = e.results[0]?.transcript ?? latest.current;
    set((p) => ({ ...p, transcript: latest.current }));
  });
  useSpeechRecognitionEvent('volumechange', (e) => {
    // value is roughly -2..10
    set((p) => ({ ...p, level: Math.max(0, Math.min(1, (e.value + 2) / 12)) }));
  });
  useSpeechRecognitionEvent('error', (e) => {
    if (e.error === 'aborted') return;
    // First go failed for a reason other than silence or permission: once more, plainest settings.
    const retryable = !['no-speech', 'speech-timeout', 'not-allowed'].includes(e.error);
    if (retryable && !triedOnline.current && wantFinal.current) {
      triedOnline.current = true;
      setTimeout(() => begin(hintsRef.current, true), 250); // let the failed session close first
      return;
    }
    wantFinal.current = false;
    set((p) => ({ ...p, listening: false, error: ERRORS[e.error] ?? e.message ?? 'Speech stopped working. Try again.' }));
  });

  const start = useCallback(async (hints: string[]) => {
    latest.current = '';
    wantFinal.current = true;
    set((p) => ({ ...p, transcript: '', error: null }));
    try {
      if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
        set((p) => ({ ...p, error: 'This phone has no speech recognition.' }));
        return;
      }
      const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perm.granted) {
        set((p) => ({ ...p, error: ERRORS['not-allowed'] }));
        return;
      }
      hintsRef.current = hints;
      triedOnline.current = false;
      begin(hints, false);
    } catch (e: any) {
      set((p) => ({ ...p, error: e?.message ?? 'Speech failed to start.' }));
    }
  }, []);

  const begin = (hints: string[], plain: boolean) => {
    ExpoSpeechRecognitionModule.start({
      // Indian English hears local titles and names best.
      lang: plain ? 'en-US' : 'en-IN',
      interimResults: true,
      continuous: !plain,
      maxAlternatives: 1,
      androidRecognitionServicePackage: plain ? undefined : pickService(),
      contextualStrings: plain ? undefined : hints.slice(0, 50),
      iosTaskHint: 'search',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 80 },
    });
  };

  /** Let go: finish and deliver the transcript. */
  const stop = useCallback(() => { try { ExpoSpeechRecognitionModule.stop(); } catch {} }, []);
  /** Drag away to cancel: drop the transcript. */
  const cancel = useCallback(() => {
    wantFinal.current = false;
    try { ExpoSpeechRecognitionModule.abort(); } catch {}
  }, []);
  const clearError = useCallback(() => set((p) => ({ ...p, error: null, hint: null })), []);
  /** A tap on the mic: say how it works instead of listening. */
  const tapHint = useCallback(() => set((p) => ({ ...p, hint: 'Hold the mic while you talk, then let go to send.' })), []);

  return { ...s, start, stop, cancel, clearError, tapHint };
}
