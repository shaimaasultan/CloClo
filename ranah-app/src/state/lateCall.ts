import { useEffect, useState } from 'react';

// Their local time counts as late between 10 PM and 7 AM.
export const isLateHour = (hour: number) => hour >= 22 || hour < 7;

// The contact we're asking "call anyway?" about, shared with the root
// LateCallPrompt; null when no question is open.
let pending: string | null = null;
const listeners = new Set<(id: string | null) => void>();

export function askLateCall(id: string | null) {
  pending = id;
  listeners.forEach((listener) => listener(id));
}

export function usePendingLateCall(): string | null {
  const [id, setId] = useState<string | null>(pending);
  useEffect(() => {
    listeners.add(setId);
    setId(pending);
    return () => {
      listeners.delete(setId);
    };
  }, []);
  return id;
}
