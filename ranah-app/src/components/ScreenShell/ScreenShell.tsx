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

// Same chrome budget the Keeper's room uses, so the weather's sun never
// lands under the header rows.
const CHROME_HEIGHT = 310;

interface ScreenShellProps {
  active: DockKey;
  title: string;
  backLabel: string;
  onBack: () => void;
  children: React.ReactNode;
}

// Shared frame for the prototype's list screens (.contacts-screen): the
// .keeper-room__head back/title row sits between the brand header and the
// dock, matching the Keeper's room layout, with the caller's sky still
// drifting behind the list.
export function ScreenShell({ active, title, backLabel, onBack, children }: ScreenShellProps) {
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

        <View style={[styles.head, { flexDirection: rowDir }]}>
          <Pressable onPress={onBack} style={[styles.backBtn, { flexDirection: rowDir }]} accessibilityRole="button">
            <ChevronIcon color="rgba(239,230,211,.75)" direction="back" isRtl={isRtl} />
            <Text style={styles.backLabel}>{backLabel}</Text>
          </Pressable>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </View>

        <Dock active={active} />

        <TopBar />

        <View style={styles.body}>{children}</View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  head: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: { alignItems: 'center', gap: 5, paddingVertical: 4, paddingHorizontal: 6 },
  backLabel: { color: 'rgba(239,230,211,.75)', fontSize: 11, fontWeight: '600' },
  title: { color: '#f3ecdd', fontSize: 15, fontWeight: '800' },
  body: { flex: 1, minHeight: 0 },
});
