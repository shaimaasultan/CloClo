import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandHeader } from '../src/components/BrandHeader/BrandHeader';
import { Dock } from '../src/components/Dock/Dock';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
import { PhoneHandset } from '../src/components/PhoneHandset/PhoneHandset';
import { RotaryDial } from '../src/components/RotaryDial/RotaryDial';
import { TopBar } from '../src/components/TopBar/TopBar';
import { WeatherLayer } from '../src/components/WeatherLayer/WeatherLayer';
import { useKeeperState } from '../src/state/KeeperStateContext';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

const CHROME_HEIGHT = 275; // rough budget for the brand header + topBar + dock + readout row above the stage

export default function DialScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const [dialed, setDialed] = useState('');
  const { callState, setCallState, sky, mood } = useKeeperState();
  const { privacyMode, tick, clunk } = useSettings();
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const rowDir = isRtl ? 'row-reverse' : 'row';
  const awake = callState !== 'idle';

  // Same responsive intent as the prototype's min(80vw,400px) dial sizing,
  // plus a check against remaining vertical space so the handset (which
  // peeks above the dial) never gets pushed into the chrome above it.
  const dialSize = Math.max(220, Math.min(340, winWidth * 0.86, (winHeight - CHROME_HEIGHT) * 0.85));
  // Prototype proportions (400px dial): a 220px handset whose top sits 42px
  // above the dial, so its horns rest down over the brass bezel like a
  // receiver sitting in its cradle rather than floating above the phone.
  const handsetWidth = dialSize * (220 / 400);
  const handsetRise = dialSize * (42 / 400);
  const handleHandsetPress = () => {
    const opening = callState !== 'active';
    clunk(opening);
    if (callState === 'ringing') setCallState('active'); // answer
    else if (callState === 'active') setCallState('idle'); // hang up
    else setCallState('active'); // tap-to-call a dialled number
  };

  const handleDigit = (digit: string) => {
    tick();
    setDialed((prev) => (prev + digit).slice(0, 15));
  };

  // Privacy mode masks the readout digit-for-digit, as the prototype does.
  const readout = dialed ? (privacyMode ? '•'.repeat(dialed.length) : dialed) : '—';

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={winWidth} height={winHeight} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <BrandHeader />

        <Dock active="dial" />

        <TopBar />

        <View style={[styles.readoutRow, { flexDirection: rowDir }]}>
          <View style={styles.readout}>
            <Text style={styles.readoutLabel}>{t.readoutLabel}</Text>
            <Text style={[styles.readoutDigits, { color: colours.highlight }]}>
              {readout}
            </Text>
            {dialed.length > 0 && (
              <Pressable onPress={() => setDialed('')} style={styles.clearBtn}>
                <Text style={styles.clearBtnLabel}>×</Text>
              </Pressable>
            )}
          </View>
          <View style={{ flex: 1 }} />
          {callState === 'idle' && (
            <Pressable onPress={() => setCallState('ringing')} style={styles.demoBtn}>
              <Text style={styles.demoBtnLabel}>Preview an incoming call</Text>
            </Pressable>
          )}
          {callState === 'ringing' && (
            <Pressable onPress={() => setCallState('idle')} style={styles.demoBtn}>
              <Text style={styles.demoBtnLabel}>Decline</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.stage}>
          <View style={{ width: dialSize, height: dialSize + handsetRise }}>
            <View style={{ position: 'absolute', top: handsetRise, left: 0 }}>
              <RotaryDial
                size={dialSize}
                colours={colours}
                onDigit={handleDigit}
                centerContent={
                  <KeeperAvatar
                    // 48-unit avatar at the prototype's 2.32x hub scale
                    size={dialSize * ((48 * 2.32) / 400)}
                    colours={colours}
                    awake={awake}
                    mood={mood}
                    showUmbrella={sky === 'rain' || sky === 'snow' || sky === 'storm'}
                    onPress={() => router.navigate('/room')}
                  />
                }
              />
            </View>
            {/* Rendered after the dial so it layers over the bezel, as the
                prototype's .handset-hit (z-index 7) does over .dial-wrap. */}
            <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: (dialSize - handsetWidth) / 2 }}>
              <PhoneHandset
                width={handsetWidth}
                colours={colours}
                isRinging={callState === 'ringing'}
                isOpen={callState === 'active'}
                onPress={handleHandsetPress}
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  readoutRow: { alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(11,10,8,.55)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  readoutLabel: { color: 'rgba(239,230,211,.5)', fontSize: 10, letterSpacing: 1 },
  readoutDigits: { fontSize: 16, letterSpacing: 2, fontWeight: '600' },
  clearBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239,230,211,.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearBtnLabel: { color: '#efe6d3', fontSize: 12, lineHeight: 14 },
  demoBtn: {
    backgroundColor: 'rgba(239,230,211,.1)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  demoBtnLabel: { color: 'rgba(239,230,211,.8)', fontSize: 10, fontWeight: '600' },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
