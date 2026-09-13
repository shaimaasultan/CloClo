// Web: the browser's Notification API. A web page can't schedule alerts to
// arrive while it's closed, so alerts fire only while CloClo is open (see
// ReminderNotifier's due-time check). Phones use scheduler.native.ts.
import type { PlannedAlert } from './plan';

import type { ActionLabels, NotificationResponseEvent, PermissionState } from './types';

export type { PermissionState } from './types';

// Phones hand alerts to the OS ahead of time; the web can't.
export const canScheduleAhead = false;

type BrowserPermission = 'default' | 'granted' | 'denied';
interface BrowserNotification {
  onclick: (() => void) | null;
  close(): void;
}
interface BrowserNotificationApi {
  permission: BrowserPermission;
  requestPermission(): Promise<BrowserPermission>;
  new (title: string, options?: { body?: string; tag?: string }): BrowserNotification;
}

const api = (): BrowserNotificationApi | null =>
  (globalThis as { Notification?: BrowserNotificationApi }).Notification ?? null;
const toState = (p: BrowserPermission): PermissionState => (p === 'default' ? 'undetermined' : p);

export async function setupNotifications(): Promise<void> {}

export async function getPermission(): Promise<PermissionState> {
  const n = api();
  return n ? toState(n.permission) : 'unsupported';
}

export async function requestPermission(): Promise<PermissionState> {
  const n = api();
  if (!n) return 'unsupported';
  try {
    return toState(await n.requestPermission());
  } catch {
    return toState(n.permission);
  }
}

export async function syncScheduled(_alerts: PlannedAlert[]): Promise<void> {}

export function showSystemNotification(title: string, body: string, onClick: () => void): void {
  const n = api();
  if (!n || n.permission !== 'granted') return;
  try {
    const notification = new n(title, { body, tag: title });
    notification.onclick = () => {
      (globalThis as { focus?: () => void }).focus?.();
      onClick();
      notification.close();
    };
  } catch {
    // Some browsers only allow notifications from a service worker.
  }
}

// Browser notifications have no buttons; clicking one just opens CloClo
// (see showSystemNotification), and snoozing happens in the in-app banner.
export async function configureActions(_labels: ActionLabels): Promise<void> {}

export function onNotificationResponse(_onResponse: (event: NotificationResponseEvent) => void): () => void {
  return () => {};
}
