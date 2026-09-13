import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextStyle, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Path } from 'react-native-svg';
import { BrandHeader } from '../src/components/BrandHeader/BrandHeader';
import { CallInfoBar } from '../src/components/CallInfoBar/CallInfoBar';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
import { CALL_SCRIPT, ScriptLine, TextDir } from '../src/data/callScript';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

// Same pacing as the prototype: a new transcript line every 2.6s (held
// while muted), and the keeper's mouth stays open 1.1s after each line.
const LINE_INTERVAL_MS = 2600;
const TALK_MS = 1100;

const YOU_COLOUR = '#6cc2b3';
const HANDSET_PATH =
  'M14 44 C 6 44 4 30 12 24 L 40 6 C 46 2 52 6 50 13 L 46 24 C 62 14 88 14 104 24 L 100 13 C 98 6 104 2 110 6 L 138 24 C 146 30 144 44 136 44 C 130 44 128 40 122 36 C 106 26 44 26 28 36 C 22 40 20 44 14 44 Z';

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Each script line carries its own direction (Arabic lines right-aligned,
// English left-aligned) regardless of the UI language.
function dirStyle(dir: TextDir): TextStyle {
  return { writingDirection: dir, textAlign: dir === 'rtl' ? 'right' : 'left' };
}

interface CallControlProps {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  // Toggles (Mute, Clarity) report on/off; End is a plain action.
  checked?: boolean;
  variant?: 'end';
  children: (color: string) => React.ReactNode;
}

function CallControl({ label, accessibilityLabel, onPress, checked, variant, children }: CallControlProps) {
  const { colours } = usePalette();
  const isToggle = checked !== undefined;
  const on = checked === true;
  const color = variant === 'end' ? '#f6ece7' : on ? colours.highlight : '#c9bfa9';

  return (
    <Pressable
      onPress={onPress}
      role={isToggle ? 'switch' : 'button'}
      aria-checked={isToggle ? on : undefined}
      aria-label={accessibilityLabel}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        styles.control,
        on && { backgroundColor: `${colours.metal2}38`, borderColor: `${colours.metal2}66` },
        variant === 'end' && styles.controlEnd,
        variant === 'end' && (pressed || hovered) && styles.controlEndActive,
      ]}
    >
      {children(color)}
      <Text style={[styles.controlLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

// Ported from the prototype's .call-screen: caller header with a running
// timer, the keeper's face (mouth opens as each line arrives), Mute /
// Clarity / End controls, and a live transcript where every line shows the
// original speech and its translation. Only reachable by answering a call.
export default function CallScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { callState, setCallState, ringerIdx, mood, sky, muted, toggleMute } = useKeeperState();
  const { clunk } = useSettings();

  const [seconds, setSeconds] = useState(0);
  const [lines, setLines] = useState<ScriptLine[]>([]);
  const [clarityOn, setClarityOn] = useState(false);
  const [talking, setTalking] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const caller = ringerIdx !== null ? t.callers[ringerIdx] : null;
  const live = callState === 'active' && caller !== null;
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const uiAlign: TextStyle = { textAlign: isRtl ? 'right' : 'left' };

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [live]);

  useEffect(() => {
    if (!live) return;
    let index = 0;
    let talkTimer: ReturnType<typeof setTimeout> | undefined;
    const id = setInterval(() => {
      if (mutedRef.current) return;
      if (index >= CALL_SCRIPT.length) {
        clearInterval(id);
        return;
      }
      const next = CALL_SCRIPT[index];
      index += 1;
      setLines((prev) => [...prev, next]);
      setTalking(true);
      clearTimeout(talkTimer);
      talkTimer = setTimeout(() => setTalking(false), TALK_MS);
    }, LINE_INTERVAL_MS);
    return () => {
      clearInterval(id);
      clearTimeout(talkTimer);
    };
  }, [live]);

  // Hanging up (or landing here without a live call) sends you back to the
  // dial — this screen only exists for the length of an answered call.
  // dismissTo rather than a <Redirect>: a redirect replaces this screen with
  // a fresh dial, which stacks a second dial on top of the one underneath.
  useEffect(() => {
    if (!live || !caller) router.dismissTo('/');
  }, [live, caller, router]);
  if (!live || !caller) return null;

  const endCall = () => {
    clunk(false);
    setCallState('idle');
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <BrandHeader />

        <View style={[styles.infoRow, { flexDirection: rowDir }]}>
          {/* Includes the "Line in use" pill while the call is live. */}
          <CallInfoBar />
        </View>

        <View style={[styles.head, { flexDirection: rowDir }]}>
          <View style={[styles.headText, { alignItems: isRtl ? 'flex-end' : 'flex-start' }]}>
            <Text style={[styles.name, uiAlign]}>{caller.name}</Text>
            <Text style={[styles.meta, uiAlign]}>{caller.meta}</Text>
          </View>
          <Text style={[styles.timer, { color: colours.highlight }]} accessibilityLabel={formatDuration(seconds)}>
            {formatDuration(seconds)}
          </Text>
        </View>

        {/* The keeper on the line: handset to their ear, dressed for the
            caller's weather, mouth moving as each transcript line lands. */}
        <View style={styles.stage}>
          <KeeperAvatar
            size={104}
            colours={colours}
            callState="active"
            mood={mood}
            sky={sky}
            variant="room"
            talking={talking}
            callerActivity={caller.activity}
          />
        </View>

        <View style={[styles.controls, { flexDirection: rowDir }]}>
          <CallControl label={t.mute} accessibilityLabel={t.muteAria} checked={muted} onPress={toggleMute}>
            {(color) => (
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M9 5.5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0z" stroke={color} strokeWidth={1.8} fill="none" strokeLinejoin="round" />
                <Path d="M6 11a6 6 0 0 0 12 0M12 17v3" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
                {muted && <Line x1={4} y1={4} x2={20} y2={20} stroke="#e6a49c" strokeWidth={1.8} strokeLinecap="round" />}
              </Svg>
            )}
          </CallControl>
          <CallControl
            label={t.clarity}
            accessibilityLabel={t.clarityAria}
            checked={clarityOn}
            onPress={() => setClarityOn((c) => !c)}
          >
            {(color) => (
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path d="M5 14V10M9 17V7M13 15V9M17 13v-2M21 14v-4" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
              </Svg>
            )}
          </CallControl>
          <CallControl label={t.end} accessibilityLabel={t.endAria} variant="end" onPress={endCall}>
            {(color) => (
              <Svg width={16} height={16} viewBox="0 0 150 150" style={{ transform: [{ rotate: '135deg' }] }}>
                <Path d={HANDSET_PATH} fill={color} transform="translate(0 43)" />
              </Svg>
            )}
          </CallControl>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.transcript}
          contentContainerStyle={styles.transcriptContent}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={styles.note}>{t.exampleNote}</Text>
          {lines.map((line, i) => {
            const isYou = line.who === 'you';
            return (
              <View key={i} style={styles.row}>
                <Text style={[styles.speaker, uiAlign, { color: isYou ? YOU_COLOUR : colours.metal1 }]}>
                  {isYou ? t.youLabel : caller.name}
                </Text>
                {/* The caller's side sounds muddy until Clarity cleans it up. */}
                <Text style={[styles.original, dirStyle(line.originalDir), !isYou && !clarityOn && styles.noisy]}>
                  {line.original}
                </Text>
                <Text style={[styles.tag, dirStyle(line.translatedDir)]}>{t.translatedLabel}</Text>
                <Text style={[styles.translated, dirStyle(line.translatedDir)]}>{line.translated}</Text>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0a08' },
  safe: { flex: 1 },
  infoRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  head: {
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  headText: { flex: 1, minWidth: 0 },
  name: { color: '#f3ecdd', fontSize: 17, fontWeight: '800' },
  meta: { color: 'rgba(239,230,211,.6)', fontSize: 10, fontFamily: 'monospace', marginTop: 2 },
  timer: { fontSize: 13, fontFamily: 'monospace', fontVariant: ['tabular-nums'] },
  stage: { alignItems: 'center', paddingTop: 2, paddingBottom: 8 },
  controls: { justifyContent: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10 },
  control: {
    alignItems: 'center',
    gap: 4,
    width: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.08)',
    backgroundColor: 'rgba(255,255,255,.05)',
  },
  controlEnd: { backgroundColor: '#7a3630', borderColor: 'rgba(255,255,255,.12)' },
  controlEndActive: { backgroundColor: '#8f423b' },
  controlLabel: { fontSize: 9, letterSpacing: 0.6, textTransform: 'uppercase' },
  transcript: { flex: 1, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,.06)' },
  transcriptContent: { paddingTop: 10, paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  note: {
    textAlign: 'center',
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.4)',
    marginBottom: 2,
  },
  row: { borderBottomWidth: 1, borderBottomColor: 'rgba(239,230,211,.08)', paddingBottom: 8 },
  speaker: { fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'monospace', marginBottom: 3 },
  original: { color: '#f3ecdd', fontSize: 14, lineHeight: 20 },
  noisy: { opacity: 0.6 },
  tag: {
    fontSize: 8,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.32)',
    marginTop: 4,
    marginBottom: 2,
  },
  translated: { color: 'rgba(239,230,211,.55)', fontSize: 11, lineHeight: 16, fontFamily: 'monospace' },
});
