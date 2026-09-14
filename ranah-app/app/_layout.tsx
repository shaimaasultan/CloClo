import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InboxBanner } from '../src/components/InboxBanner/InboxBanner';
import { IncomingRinger } from '../src/components/IncomingRinger/IncomingRinger';
import { InboxProvider } from '../src/state/InboxContext';
import { LateCallPrompt } from '../src/components/LateCallPrompt/LateCallPrompt';
import { ReminderNotifier } from '../src/components/ReminderNotifier/ReminderNotifier';
import { ContactsProvider } from '../src/state/ContactsContext';
import { KeeperStateProvider } from '../src/state/KeeperStateContext';
import { LangProvider } from '../src/state/LangContext';
import { MessagesProvider } from '../src/state/MessagesContext';
import { PaletteProvider } from '../src/state/PaletteContext';
import { PersistGate } from '../src/state/PersistGate';
import { RemindersProvider } from '../src/state/RemindersContext';
import { SettingsProvider } from '../src/state/SettingsContext';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PersistGate>
        <LangProvider>
          <ContactsProvider>
          <RemindersProvider>
          <InboxProvider>
          <MessagesProvider>
            <PaletteProvider>
              <SettingsProvider>
                <KeeperStateProvider>
                  <IncomingRinger />
                  <Stack screenOptions={{ headerShown: false }} />
                  <ReminderNotifier />
                  <InboxBanner />
                  <LateCallPrompt />
                </KeeperStateProvider>
              </SettingsProvider>
            </PaletteProvider>
          </MessagesProvider>
          </InboxProvider>
          </RemindersProvider>
          </ContactsProvider>
        </LangProvider>
        </PersistGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
