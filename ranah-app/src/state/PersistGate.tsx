import React, { useEffect, useState } from 'react';
import { hydratePersisted } from './persist';

// Holds the app back for the moment it takes to load saved contacts and
// settings, so nothing renders with defaults and then jumps.
export function PersistGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    hydratePersisted().then(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);
  return ready ? <>{children}</> : null;
}
