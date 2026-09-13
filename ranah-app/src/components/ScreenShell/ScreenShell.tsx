import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useKeeperState } from '../../state/KeeperStateContext';
import { useLang } from '../../state/LangContext';
import { usePalette } from '../../state/PaletteContext';
import { BrandHeader } from '../BrandHeader/BrandHeader';
import { Dock } from '../Dock/Dock';
import { DockKey } from '../DockIcon/DockIcon';
import { ChevronIcon } from '../Icons/Icons';
import { TopBar } from '../TopBar/TopBar';
import { WeatherLayer } from '../WeatherLayer/WeatherLayer';

// Brand header + dock + top bar budget, so the weather's sun never lands
// under the chrome.
const CHROME_HEIGHT = 270;

interface BackLink {
  label: string;
  title: string;
  onPress: () => void;
}

interface ScreenShellProps {
  active: DockKey;
  // Only for screens the dock can't reach on its own (e.g. Advanced
  // settings, a level below Settings). Dock screens don't get a back row —
  // the dock already shows where you are and gets you anywhere.
  back?: BackLink;
  children: React.ReactNode;
}

// Shared frame for the prototype's list screens (.contacts-screen), with the
// caller's sky still drifting behind the list.
export function ScreenShell({ active, back, children }: ScreenShellProps) {
  const { isRtl } = useLang();
  const { colours } = usePalette();
  const { sky } = useKeeperState();
  const { width, height } = useWindowDimensions();
  const rowDir = isRtl ? 'row-reverse' : 'row';

  return (
    <View style={[styles.root, { backgroundColor: colours.body2 }]}>
      <WeatherLayer width={width} height={height} kind={sky} topInset={CHROME_HEIGHT} />
      <SafeAreaView style={styles.safe}>
        <BrandHeader />

        <Dock active={active} />

        <TopBar />

        {back && (
          <View style={[styles.head, { flexDirection: rowDir }]}>
            <Pressable onPress={back.onPress} style={[styles.backBtn, { flexDirection: rowDir }]} accessibilityRole="button">
              <ChevronIcon color="rgba(239,230,211,.75)" direction="back" isRtl={isRtl} />
              <Text style={styles.backLabel}>{back.label}</Text>
            </Pressable>
            <Text style={styles.title} accessibilityRole="header">
              {back.title}
            </Text>
          </View>
        )}

        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  // The weather layer is absolutely positioned, and on web a positioned
  // element paints above unpositioned siblings regardless of DOM order —
  // so without its own stacking level the sun would sit on top of the
  // list rows. This keeps the sky drifting *behind* the content.
  safe: { flex: 1, position: 'relative', zIndex: 1 },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 2,
  },
  backBtn: { alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 6 },
  backLabel: { color: 'rgba(239,230,211,.75)', fontSize: 11, fontWeight: '600' },
  title: { color: '#f3ecdd', fontSize: 15, fontWeight: '800' },
  body: { flex: 1, minHeight: 0 },
});
