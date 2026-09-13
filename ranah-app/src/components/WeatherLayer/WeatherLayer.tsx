import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';
import { pointer } from '../../theme/pointer';

export type WeatherKind = 'clear' | 'rain' | 'snow' | 'storm';

interface WeatherLayerProps {
  width: number;
  height: number;
  kind: WeatherKind;
  /** Height of the chrome (top bar + dock + readout row) sitting above the
   * phone stage. The sun renders just below this, in the open sky beside
   * the phone, instead of at a fixed offset from the very top of the
   * window where it would sit over the nav bar. */
  topInset?: number;
}

// Animated.createAnimatedComponent injects `collapsable={false}` on the
// wrapped native component (a perf hint the real RN View consumes). Native
// SVG primitives don't strip it, and on web react-native-svg forwards it
// straight to the DOM, where React warns: non-boolean attribute
// "collapsable". Drop it here so it never reaches G/Rect at all — SVG
// shapes have no such concept regardless of platform.
function stripCollapsable<P extends object>(Comp: React.ComponentType<P>) {
  return React.forwardRef<unknown, P & { collapsable?: boolean }>((props, ref) => {
    const { collapsable, ...rest } = props;
    return <Comp ref={ref as never} {...(rest as P)} />;
  });
}

const AnimatedG = Animated.createAnimatedComponent(stripCollapsable(G));
const AnimatedRect = Animated.createAnimatedComponent(stripCollapsable(Rect));

function useFallLoop(duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    value.setValue(Math.random());
    const anim = Animated.loop(
      Animated.timing(value, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false })
    );
    anim.start();
    return () => anim.stop();
  }, [value, duration]);
  return value;
}

function useSwayLoop(duration: number) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(value, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [value, duration]);
  return value;
}

function Raindrop({ width, height, x, len, duration, opacity }: { width: number; height: number; x: number; len: number; duration: number; opacity: number }) {
  const fall = useFallLoop(duration);
  // react-native-svg's Animated transform prop only interpolates a single
  // numeric slot per template string reliably on web (RN-style transform
  // arrays serialize to "[object Object]" there) — so each animated axis
  // gets its own template string with one number in it.
  const transform = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [`translate(0, ${-len - 20})`, `translate(0, ${height + 20})`],
  });
  return (
    <AnimatedG transform={transform} opacity={opacity}>
      <Line x1={x} y1={0} x2={x - len * 0.22} y2={len} stroke="#cfe3f7" strokeWidth={1.6} strokeLinecap="round" />
    </AnimatedG>
  );
}

function Snowflake({ width, height, x, r, duration, swayDuration, swayAmount, opacity }: { width: number; height: number; x: number; r: number; duration: number; swayDuration: number; swayAmount: number; opacity: number }) {
  const fall = useFallLoop(duration);
  const sway = useSwayLoop(swayDuration);
  const fallTransform = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [`translate(${x}, ${-r - 20})`, `translate(${x}, ${height + 20})`],
  });
  const swayTransform = sway.interpolate({
    inputRange: [0, 1],
    outputRange: [`translate(${-swayAmount}, 0)`, `translate(${swayAmount}, 0)`],
  });
  return (
    <AnimatedG transform={fallTransform} opacity={opacity}>
      <AnimatedG transform={swayTransform}>
        <Circle cx={0} cy={0} r={r} fill="#f5f0e4" />
      </AnimatedG>
    </AnimatedG>
  );
}

function StormFlash({ width, height }: { width: number; height: number }) {
  const flash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let cancelled = false;
    const cycle = () => {
      if (cancelled) return;
      const wait = 1800 + Math.random() * 3200;
      Animated.sequence([
        Animated.delay(wait),
        Animated.timing(flash, { toValue: 0.35, duration: 60, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0, duration: 90, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0.22, duration: 60, useNativeDriver: false }),
        Animated.timing(flash, { toValue: 0, duration: 140, useNativeDriver: false }),
      ]).start(() => cycle());
    };
    cycle();
    return () => {
      cancelled = true;
      flash.stopAnimation();
    };
  }, [flash]);
  return <AnimatedRect x={0} y={0} width={width} height={height} fill="#f3f6ff" opacity={flash} />;
}

function Sun({ width, topInset }: { width: number; topInset: number }) {
  // Sits in the open sky beside the phone stage, not pinned to the raw
  // window's top-right corner (which lands on the nav chrome on short
  // screens). A little right-of-centre reads as "sun over the phone's
  // shoulder" rather than dead-centre, which would compete with the dial.
  const cx = width * 0.68;
  const cy = topInset + 36;
  const rays = Array.from({ length: 8 });
  return (
    <G opacity={0.85}>
      <Circle cx={cx} cy={cy} r={16} fill="#f3d78b" />
      {rays.map((_, i) => {
        const a = (i / rays.length) * Math.PI * 2;
        const x1 = cx + Math.cos(a) * 22;
        const y1 = cy + Math.sin(a) * 22;
        const x2 = cx + Math.cos(a) * 30;
        const y2 = cy + Math.sin(a) * 30;
        return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f3d78b" strokeWidth={2} strokeLinecap="round" />;
      })}
    </G>
  );
}

export function WeatherLayer({ width, height, kind, topInset = 0 }: WeatherLayerProps) {
  const rainDrops = useMemo(() => {
    if (kind !== 'rain' && kind !== 'storm') return [];
    const count = kind === 'storm' ? 34 : 22;
    return Array.from({ length: count }, () => ({
      x: Math.random() * width,
      len: 14 + Math.random() * 12,
      duration: (kind === 'storm' ? 450 : 650) + Math.random() * 350,
      opacity: 0.35 + Math.random() * 0.4,
    }));
  }, [kind, width]);

  const snowflakes = useMemo(() => {
    if (kind !== 'snow') return [];
    return Array.from({ length: 20 }, () => ({
      x: Math.random() * width,
      r: 1.6 + Math.random() * 2.4,
      duration: 3200 + Math.random() * 3200,
      swayDuration: 1400 + Math.random() * 1400,
      swayAmount: 10 + Math.random() * 16,
      opacity: 0.5 + Math.random() * 0.4,
    }));
  }, [kind, width]);

  if (width <= 0 || height <= 0) return null;

  return (
    <Svg width={width} height={height} style={[pointer.none, { position: 'absolute', left: 0, top: 0 }]}>
      {kind === 'clear' && <Sun width={width} topInset={topInset} />}
      {rainDrops.map((d, i) => (
        <Raindrop key={i} width={width} height={height} x={d.x} len={d.len} duration={d.duration} opacity={d.opacity} />
      ))}
      {snowflakes.map((s, i) => (
        <Snowflake
          key={i}
          width={width}
          height={height}
          x={s.x}
          r={s.r}
          duration={s.duration}
          swayDuration={s.swayDuration}
          swayAmount={s.swayAmount}
          opacity={s.opacity}
        />
      ))}
      {kind === 'storm' && <StormFlash width={width} height={height} />}
    </Svg>
  );
}
