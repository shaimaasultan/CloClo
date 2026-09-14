// iOS / Android: local notifications scheduled with the OS, so they arrive
// even when CloClo is closed.
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PlannedAlert } from './plan';
import { ActionLabels, NotificationResponseEvent, PermissionState, SNOOZE_ACTION_MINUTES } from './types';

export type { PermissionState } from './types';

export const canScheduleAhead = true;

const CHANNEL_ID = 'reminders';
// The notification category that carries the Snooze / Done buttons.
const CATEGORY_ID = 'reminder';
const ACTION = { snoozeShort: 'snooze-short', snoozeLong: 'snooze-long', done: 'done' } as const;
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

// The buttons on a reminder's notification. Each opens CloClo so the choice
// is applied straight away (acting without opening the app would need a
// background task).
export async function configureActions(labels: ActionLabels): Promise<void> {
  const opens = { opensAppToForeground: true };
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION.snoozeShort, buttonTitle: labels.snoozeShort, options: opens },
    { identifier: ACTION.snoozeLong, buttonTitle: labels.snoozeLong, options: opens },
    { identifier: ACTION.done, buttonTitle: labels.done, options: opens },
  ]);
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
      content: {
        title: alert.title,
        body: alert.body,
        data: { url: '/reminders', reminderId: alert.reminderId, day: alert.day },
        // Only a first alert can be snoozed; a snooze repeat has no buttons.
        ...(alert.snoozed ? {} : { categoryIdentifier: CATEGORY_ID }),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alert.fireAt, channelId: CHANNEL_ID },
    });
  }
}

// Foreground alerts use the in-app banner instead.
export function showSystemNotification(_title: string, _body: string, _onClick: () => void): void {}

// A notification right now (a new message). While CloClo is open the in-app
// banner shows it and this lands in the phone's notification list; tapping
// it arrives through onNotificationResponse.
export async function presentNow(title: string, body: string, data: Record<string, string>, _onClick: () => void): Promise<void> {
  await Notifications.scheduleNotificationAsync({ content: { title, body, data }, trigger: null });
}

function toEvent(response: Notifications.NotificationResponse): NotificationResponseEvent {
  const data = response.notification.request.content.data as
    | { reminderId?: unknown; day?: unknown; kind?: unknown; peerId?: unknown }
    | null;
  // A new-message notification opens that conversation.
  if (data?.kind === 'message' && typeof data.peerId === 'string') return { kind: 'openChat', peerId: data.peerId };
  const reminderId = typeof data?.reminderId === 'string' ? data.reminderId : null;
  const day = typeof data?.day === 'string' ? data.day : null;
  if (!reminderId || !day) return { kind: 'open' };
  switch (response.actionIdentifier) {
    case ACTION.done:
      return { kind: 'done', reminderId, day };
    case ACTION.snoozeShort:
      return { kind: 'snooze', reminderId, day, minutes: SNOOZE_ACTION_MINUTES.short };
    case ACTION.snoozeLong:
      return { kind: 'snooze', reminderId, day, minutes: SNOOZE_ACTION_MINUTES.long };
    default:
      return { kind: 'open' };
  }
}

// Each response is handled once, whether it arrives while CloClo is running
// or is the one that launched it.
const handled = new Set<string>();

export function onNotificationResponse(onResponse: (event: NotificationResponseEvent) => void): () => void {
  const handle = (response: Notifications.NotificationResponse) => {
    const key = `${response.notification.request.identifier}|${response.actionIdentifier}`;
    if (handled.has(key)) return;
    handled.add(key);
    // A button was used, so the notification has done its job.
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      Notifications.dismissNotificationAsync(response.notification.request.identifier).catch(() => {});
    }
    onResponse(toEvent(response));
  };

  Notifications.getLastNotificationResponseAsync()
    .then((response) => {
      if (!response) return;
      handle(response);
      Notifications.clearLastNotificationResponseAsync().catch(() => {});
    })
    .catch(() => {});
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
