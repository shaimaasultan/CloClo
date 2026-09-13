import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeeperStateProvider } from '../src/state/KeeperStateContext';
import { LangProvider } from '../src/state/LangContext';
import { PaletteProvider } from '../src/state/PaletteContext';
import { SettingsProvider } from '../src/state/SettingsContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LangProvider>
          <PaletteProvider>
            <SettingsProvider>
              <KeeperStateProvider>
                <Stack screenOptions={{ headerShown: false }} />
              </KeeperStateProvider>
            </SettingsProvider>
          </PaletteProvider>
        </LangProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
