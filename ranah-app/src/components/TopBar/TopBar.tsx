import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { PALETTE_ORDER, PALETTE_SWATCH_HEX } from '../../theme/tokens';
import { SkyIcon } from '../SkyIcon/SkyIcon';
import { WeatherKind } from '../WeatherLayer/WeatherLayer';

const SKY_ORDER: WeatherKind[] = ['clear', 'rain', 'snow', 'storm'];

// The caller's-sky and case-colour pickers sit right under the dock, so
// they're reachable from every screen the dock renders on, same as the
// prototype's statusbar sitting just below its own dock.
export function TopBar() {
  const { t, isRtl } = useLang();
  const { paletteName, colours, setPalette } = usePalette();
  const { sky, setSky } = useKeeperState();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
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
      <View style={[styles.palettePicker, { flexDirection: rowDir }]}>
        {PALETTE_ORDER.map((name) => (
          <Pressable
            key={name}
            onPress={() => setPalette(name)}
            style={[
              styles.swatch,
              { backgroundColor: PALETTE_SWATCH_HEX[name] },
              paletteName === name && styles.swatchActive,
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  skyPicker: { gap: 4 },
  skyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  palettePicker: { gap: 8 },
  swatch: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: { borderColor: '#f3d78b' },
});
