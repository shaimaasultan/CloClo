import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { DockIcon, DockKey } from '../DockIcon/DockIcon';

const DOCK_KEYS: DockKey[] = ['dial', 'contacts', 'recents', 'reminders', 'keeper', 'sounds', 'settings'];

const DOCK_ROUTES: Record<DockKey, string> = {
  dial: '/',
  contacts: '/contacts',
  recents: '/recents',
  reminders: '/reminders',
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
            // dismissTo, not navigate: in this Expo Router, navigate pushes a
            // new copy every time, so each dock tap stacked another mounted
            // screen. dismissTo pops back to the screen if it's already in the
            // stack and otherwise replaces the current one — the dock behaves
            // like tabs and the stack can't grow.
            <Pressable key={key} onPress={() => router.dismissTo(route as never)} accessibilityRole="button">
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
    paddingHorizontal: 6,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,.06)',
  },
  dockBtn: { alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 3, borderRadius: 12 },
  dockBtnActive: { backgroundColor: 'rgba(201,162,75,.18)' },
  dockLabel: { color: '#c9bfa9', fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase' },
});
