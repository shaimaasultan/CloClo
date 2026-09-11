import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DockIcon } from '../src/components/DockIcon/DockIcon';
import { KeeperAvatar } from '../src/components/KeeperAvatar/KeeperAvatar';
import { PhoneHandset } from '../src/components/PhoneHandset/PhoneHandset';
import { RotaryDial } from '../src/components/RotaryDial/RotaryDial';
import { SkyIcon } from '../src/components/SkyIcon/SkyIcon';
import { WeatherLayer, WeatherKind } from '../src/components/WeatherLayer/WeatherLayer';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { PaletteName } from '../src/theme/tokens';

const PALETTE_ORDER: PaletteName[] = ['oxblood', 'verdigris', 'ivory', 'graphite'];
const DOCK_KEYS = ['dial', 'contacts', 'recents', 'keeper', 'sounds', 'settings'] as const;
const SKY_ORDER: WeatherKind[] = ['clear', 'rain', 'snow', 'storm'];
const CHROME_HEIGHT = 230; // rough budget for topBar + dock + readout row above the stage

type CallState = 'idle' | 'ringing' | 'active';

export default function DialScreen() {
  const { t, lang, setLang, isRtl } = useLang();
  const { paletteName, colours, setPalette } = usePalette();
  const [dialed, setDialed] = useState('');
  const [callState, setCallState] = useState<CallState>('idle');
  const [sky, setSky] = useState<WeatherKind>('clear');
  const { width: winWidth, height: winHeight } = useWindowDimensions();

  const rowDir = isRtl ? 'row-reverse' : 'row';
  const awake = callState !== 'idle';

  // Same responsive intent as the prototype's min(80vw,400px) dial sizing,
  // plus a check against remaining vertical space so the handset (which
  // peeks above the dial) never gets pushed into the chrome above it.
  const dialSize = Math.max(220, Math.min(320, winWidth * 0.8, (winHeight - CHROME_HEIGHT) * 0.78));
  const handsetWidth = dialSize * 0.7;
  const handsetOverlap = handsetWidth * (94 / 220) * 0.55;

  const handleHandsetPress = () => {
    if (callState === 'ringing') setCallState('active'); // answer
    else if (callState === 'active') setCallState('idle'); // hang up
    else setCallState('active'); // tap-to-call, until Contacts/dialing wires a real target
  };

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={winWidth} height={winHeight} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <View style={[styles.topBar, { flexDirection: rowDir }]}>
          <View style={[styles.skyPicker, { flexDirection: rowDir }]}>
            {SKY_ORDER.map((kind) => {
              const active = sky === kind;
              return (
                <Pressable
                  key={kind}
                  onPress={() => setSky(kind)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.skyPrefix}: ${t.skyNames[kind]}`}
                  style={[styles.skyBtn, active && { backgroundColor: 'rgba(243,215,139,.22)' }]}
                >
                  <SkyIcon kind={kind} size={15} color={active ? colours.highlight : '#c9bfa9'} />
                </Pressable>
              );
            })}
          </View>
          {PALETTE_ORDER.map((name) => (
            <Pressable
              key={name}
              onPress={() => setPalette(name)}
              style={[
                styles.swatch,
                { backgroundColor: `#${paletteSwatchHex(name)}` },
                paletteName === name && styles.swatchActive,
              ]}
            />
          ))}
          <View style={{ flex: 1 }} />
          <Pressable onPress={() => setLang(lang === 'en' ? 'ar' : 'en')} style={styles.langToggle}>
            <Text style={[styles.langLabel, lang === 'en' && styles.langLabelActive]}>EN</Text>
            <Text style={[styles.langLabel, lang === 'ar' && styles.langLabelActive]}>عربي</Text>
          </Pressable>
        </View>

        <View style={[styles.dock, { flexDirection: rowDir }]}>
          {DOCK_KEYS.map((key) => {
            const active = key === 'dial';
            const iconColor = active ? colours.highlight : '#c9bfa9';
            return (
              <View key={key} style={[styles.dockBtn, active && styles.dockBtnActive]}>
                <DockIcon name={key} color={iconColor} />
                <Text style={[styles.dockLabel, active && { color: iconColor }]}>{t.dockNames[key]}</Text>
              </View>
            );
          })}
        </View>

        <View style={[styles.readoutRow, { flexDirection: rowDir }]}>
          <View style={styles.readout}>
            <Text style={styles.readoutLabel}>{t.readoutLabel}</Text>
            <Text style={[styles.readoutDigits, { color: colours.highlight }]}>
              {dialed || '—'}
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
          <View style={{ alignItems: 'center' }}>
            <PhoneHandset
              width={handsetWidth}
              colours={colours}
              isRinging={callState === 'ringing'}
              isOpen={callState === 'active'}
              onPress={handleHandsetPress}
            />
            <View style={{ marginTop: -handsetOverlap }}>
              <RotaryDial
                size={dialSize}
                colours={colours}
                onDigit={(d) => setDialed((prev) => (prev + d).slice(0, 15))}
                centerContent={
                  <KeeperAvatar
                    size={dialSize * 0.47}
                    colours={colours}
                    awake={awake}
                    showUmbrella={sky === 'rain' || sky === 'snow' || sky === 'storm'}
                  />
                }
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function paletteSwatchHex(name: PaletteName) {
  switch (name) {
    case 'oxblood':
      return '6b2b26';
    case 'verdigris':
      return '1f3d34';
    case 'ivory':
      return 'cbb994';
    case 'graphite':
      return '2b2b2e';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  topBar: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#f3d78b' },
  skyPicker: { gap: 4, marginRight: 4 },
  skyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggle: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,.08)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  langLabel: { color: 'rgba(239,230,211,.5)', fontSize: 12, fontWeight: '600' },
  langLabelActive: { color: '#efe6d3' },
  dock: {
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  dockBtn: { alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 12 },
  dockBtnActive: { backgroundColor: 'rgba(201,162,75,.18)' },
  dockLabel: { color: '#c9bfa9', fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },
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
