// Shared by the web and phone notification schedulers.

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unsupported';

// The snooze lengths offered as buttons on a phone notification, in minutes.
export const SNOOZE_ACTION_MINUTES = { short: 10, long: 60 } as const;

// Button titles for a reminder notification, in the app's language.
export interface ActionLabels {
  snoozeShort: string;
  snoozeLong: string;
  done: string;
}

// What someone did with a reminder notification.
export type NotificationResponseEvent =
  | { kind: 'open' }
  | { kind: 'done'; reminderId: string; day: string }
  | { kind: 'snooze'; reminderId: string; day: string; minutes: number };
