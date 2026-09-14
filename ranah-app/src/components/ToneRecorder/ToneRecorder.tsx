import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { previewSound } from '../../audio/tones';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';

// Recordings stop by themselves at this length.
const MAX_MS = 10000;

type Phase = 'idle' | 'recording' | 'recorded' | 'saving' | 'denied' | 'failed';

interface ToneRecorderProps {
  contactName: string;
  // Save the take (its temporary uri) as the contact's ringtone.
  onKeep: (tempUri: string) => Promise<void>;
  onClose: () => void;
}

// Record a ringtone with the microphone: Record, Stop (or wait for the
// 10-second limit), Play it back, then keep it or record again.
export function ToneRecorder({ contactName, onKeep, onClose }: ToneRecorderProps) {
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [phase, setPhase] = useState<Phase>('idle');
  const [takeUri, setTakeUri] = useState<string | null>(null);
  const rowDir = isRtl ? 'row-reverse' : 'row';

  const start = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setPhase('denied');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setTakeUri(null);
      setPhase('recording');
    } catch {
      setPhase('failed');
    }
  };

  const stop = useCallback(async () => {
    try {
      await recorder.stop();
    } catch {
      // Stopped already.
    }
    // Recording mode routes sound to the earpiece on iPhones; switch back so
    // the playback is loud.
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (recorder.uri) {
      setTakeUri(recorder.uri);
      setPhase('recorded');
    } else {
      setPhase('failed');
    }
  }, [recorder]);

  // Stop at the limit.
  useEffect(() => {
    if (phase === 'recording' && recorderState.durationMillis >= MAX_MS) void stop();
  }, [phase, recorderState.durationMillis, stop]);

  // Closing the panel mid-recording lets go of the microphone.
  useEffect(
    () => () => {
      if (recorder.isRecording) recorder.stop().catch(() => {});
      setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    },
    [recorder]
  );

  const keep = async () => {
    if (!takeUri) return;
    setPhase('saving');
    try {
      await onKeep(takeUri);
      onClose();
    } catch {
      setPhase('failed');
    }
  };

  const seconds = Math.min(MAX_MS, recorderState.durationMillis) / 1000;
  const hint = phase === 'denied' ? t.micDenied : phase === 'failed' ? t.recordFailed : t.recordHint;

  const button = (label: string, onPress: () => void, primary = false, disabled = false) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      role="button"
      style={[
        styles.btn,
        primary ? { backgroundColor: colours.metal2 } : styles.btnQuiet,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.btnLabel, { color: primary ? colours.ink : '#f3ecdd' }]}>{label}</Text>
    </Pressable>
  );

  return (
    <View style={[styles.panel, { borderColor: `${colours.metal2}66` }]} role="group" aria-label={t.recordToneFor(contactName)}>
      <Text style={[styles.title, { textAlign: isRtl ? 'right' : 'left' }]}>🎙 {t.recordToneFor(contactName)}</Text>
      <Text
        style={[
          styles.hint,
          { textAlign: isRtl ? 'right' : 'left' },
          (phase === 'denied' || phase === 'failed') && styles.error,
        ]}
      >
        {hint}
      </Text>

      {phase === 'recording' && (
        <View style={[styles.meter, { flexDirection: rowDir }]}>
          <View style={styles.dot} />
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${(seconds / (MAX_MS / 1000)) * 100}%`, backgroundColor: colours.highlight }]} />
          </View>
          <Text style={styles.time}>{t.recordSeconds(Math.floor(seconds))}</Text>
        </View>
      )}

      <View style={[styles.buttons, { flexDirection: rowDir }]}>
        {(phase === 'idle' || phase === 'denied' || phase === 'failed') && (
          <>
            {button(t.recordStart, start, true)}
            {button(t.recordCancel, onClose)}
          </>
        )}
        {phase === 'recording' && button(t.recordStop, stop, true)}
        {(phase === 'recorded' || phase === 'saving') && takeUri && (
          <>
            {button(t.recordPlay, () => previewSound(takeUri), false, phase === 'saving')}
            {button(t.recordKeep, keep, true, phase === 'saving')}
            {button(t.recordAgain, start, false, phase === 'saving')}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: 8, borderWidth: 1, borderRadius: 14, padding: 12, backgroundColor: 'rgba(11,10,8,.35)' },
  title: { color: '#f3ecdd', fontSize: 13, fontWeight: '700' },
  hint: { color: 'rgba(239,230,211,.6)', fontSize: 10, fontFamily: 'monospace' },
  error: { color: '#e6a49c' },
  meter: { alignItems: 'center', gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#e0584c' },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.1)', overflow: 'hidden' },
  fill: { height: '100%' },
  time: { color: '#f3ecdd', fontSize: 11, fontFamily: 'monospace', minWidth: 34, textAlign: 'center' },
  buttons: { flexWrap: 'wrap', gap: 8 },
  btn: { borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  btnQuiet: { backgroundColor: 'rgba(255,255,255,.08)' },
  btnLabel: { fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
