import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { IncomingRinger } from '../src/components/IncomingRinger/IncomingRinger';
import { ContactsProvider } from '../src/state/ContactsContext';
import { KeeperStateProvider } from '../src/state/KeeperStateContext';
import { LangProvider } from '../src/state/LangContext';
import { PaletteProvider } from '../src/state/PaletteContext';
import { SettingsProvider } from '../src/state/SettingsContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <LangProvider>
          <ContactsProvider>
            <PaletteProvider>
              <SettingsProvider>
                <KeeperStateProvider>
                  <IncomingRinger />
                  <Stack screenOptions={{ headerShown: false }} />
                </KeeperStateProvider>
              </SettingsProvider>
            </PaletteProvider>
          </ContactsProvider>
        </LangProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
