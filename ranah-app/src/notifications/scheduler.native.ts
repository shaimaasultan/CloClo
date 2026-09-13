// iOS / Android: local notifications scheduled with the OS, so they arrive
// even when CloClo is closed.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannedAlert } from './plan';

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export const canScheduleAhead = true;

const CHANNEL_ID = 'reminders';
let setUp = false;

export async function setupNotifications(): Promise<void> {
  if (setUp) return;
  setUp = true;
  // While CloClo is open, its own in-app banner shows the reminder, so the
  // system banner is skipped; the notification still lands in the list.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

function toState(p: Notifications.NotificationPermissionsStatus): PermissionState {
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<PermissionState> {
  return toState(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }));
}

// Replace everything scheduled with the current plan.
export async function syncScheduled(alerts: PlannedAlert[]): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const alert of alerts) {
    await Notifications.scheduleNotificationAsync({
      content: { title: alert.title, body: alert.body, data: { url: '/reminders', reminderId: alert.reminderId } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alert.fireAt, channelId: CHANNEL_ID },
    });
  }
}

// Foreground alerts use the in-app banner instead.
export function showSystemNotification(_title: string, _body: string, _onClick: () => void): void {}

export function onNotificationTap(onTap: () => void): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener(() => onTap());
  return () => subscription.remove();
}
