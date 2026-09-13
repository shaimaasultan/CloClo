import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { DockIcon, DockKey } from '../DockIcon/DockIcon';

const DOCK_KEYS: DockKey[] = ['dial', 'contacts', 'recents', 'keeper', 'sounds', 'settings'];

const DOCK_ROUTES: Record<DockKey, string> = {
  dial: '/',
  contacts: '/contacts',
  recents: '/recents',
  keeper: '/room',
  sounds: '/sounds',
  settings: '/settings',
};

interface DockProps {
  active: DockKey;
}

export function Dock({ active }: DockProps) {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <View style={[styles.dock, { flexDirection: rowDir }]}>
      {DOCK_KEYS.map((key) => {
        const isActive = key === active;
        const iconColor = isActive ? colours.highlight : '#c9bfa9';
        const content = (
          <View style={[styles.dockBtn, isActive && styles.dockBtnActive]}>
            <DockIcon name={key} color={iconColor} />
            <Text style={[styles.dockLabel, isActive && { color: iconColor }]}>{t.dockNames[key]}</Text>
          </View>
        );
        const route = DOCK_ROUTES[key];
        if (route && !isActive) {
          return (
            // navigate (not push): if the target screen is already sitting
            // in the stack, this pops back to that instance instead of
            // stacking a duplicate — two mounted copies of the same screen
            // would double up on that screen's <Defs> element ids.
            <Pressable key={key} onPress={() => router.navigate(route as never)} accessibilityRole="button">
              {content}
            </Pressable>
          );
        }
        return <View key={key}>{content}</View>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
