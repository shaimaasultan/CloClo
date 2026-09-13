import { useCallback, useEffect, useState } from 'react';
import { getPermission, PermissionState, requestPermission } from './scheduler';

// Notification permission, shared by every screen that shows or asks for it.
let current: PermissionState | null = null;
const listeners = new Set<(state: PermissionState) => void>();

function publish(state: PermissionState) {
  current = state;
  listeners.forEach((listener) => listener(state));
}

export function useNotificationPermission(): [PermissionState, () => Promise<PermissionState>] {
  const [state, setState] = useState<PermissionState>(current ?? 'undetermined');

  useEffect(() => {
    listeners.add(setState);
    if (current === null) {
      getPermission()
        .then(publish)
        .catch(() => publish('unsupported'));
    } else {
      setState(current);
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const request = useCallback(async () => {
    const next = await requestPermission().catch((): PermissionState => 'unsupported');
    publish(next);
    return next;
  }, []);

  return [state, request];
}
