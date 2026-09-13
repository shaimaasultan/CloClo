import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// True when the OS asks apps to minimise motion. Decorative loops (glows,
// buzzes, the keeper's breathing and fidgets) should hold still when it is.
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (alive) setReduce(value);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  return reduce;
}
