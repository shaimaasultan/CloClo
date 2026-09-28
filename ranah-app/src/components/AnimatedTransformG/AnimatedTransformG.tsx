import React, { useEffect, useState } from 'react';
import type { Animated } from 'react-native';
import { G } from 'react-native-svg';

type Animatable<T extends string | number> = T | Animated.AnimatedInterpolation<T>;

// Follows an Animated value as plain React state.
function useAnimatedValue<T extends string | number>(node: Animatable<T> | undefined): T | undefined {
  const isNode = typeof node === 'object' && node !== null;
  const [value, setValue] = useState<T | undefined>(() =>
    isNode ? (node as unknown as { __getValue(): T }).__getValue() : (node as T | undefined)
  );
  useEffect(() => {
    if (!isNode) {
      setValue(node as T | undefined);
      return;
    }
    const interpolation = node as Animated.AnimatedInterpolation<T>;
    setValue((interpolation as unknown as { __getValue(): T }).__getValue());
    const id = interpolation.addListener(({ value: next }) => setValue(next));
    return () => interpolation.removeListener(id);
  }, [node, isNode]);
  return value;
}

// A <G> whose `transform` (and optionally `opacity`) follow an Animated value.
// Android's native SVG can't take an Animated transform string — it expects
// a matrix array, so Fabric rejects the raw string ("String cannot be cast
// to ReadableArray"). Passing the current value as an ordinary prop lets
// react-native-svg parse it in JS, as it does for a static transform.
export function AnimatedTransformG({
  transform,
  opacity,
  children,
}: {
  transform: Animatable<string>;
  opacity?: Animatable<number>;
  children?: React.ReactNode;
}) {
  const t = useAnimatedValue(transform);
  const o = useAnimatedValue(opacity);
  return (
    <G transform={t} opacity={o}>
      {children}
    </G>
  );
}
