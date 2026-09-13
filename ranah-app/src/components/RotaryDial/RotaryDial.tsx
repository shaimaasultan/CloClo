import React, { useCallback, useId, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, G, Path, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { CaseColours } from '../../theme/tokens';
import {
  DIGIT_LETTERS,
  DIGIT_SEQUENCE,
  STOP_ANGLE_DEG,
  degToRad,
  digitRestAngle,
  maxRotationForDigit,
} from './geometry';

// Dimensions ported from #dialSvg in dial-hollow.html (same 400 viewBox).
const VB = 400;
const CENTER = 200;
const DIAL_R = 196;
const FACE_R = 180;
const RIM_R = 176;
const HOLE_ORBIT = 130;
const HOLE_R = 19;
const HUB_R = 104;
const DIGIT_FONT = 'sans-serif';

interface RotaryDialProps {
  size: number;
  colours: CaseColours;
  onDigit: (digit: string) => void;
  onDragStateChange?: (dragging: boolean) => void;
  centerContent?: React.ReactNode;
  hubNote?: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function RotaryDial({ size, colours, onDigit, onDragStateChange, centerContent, hubNote }: RotaryDialProps) {
  // react-native-svg's <Defs> ids are real DOM ids on web — if two RotaryDial
  // instances are ever mounted at once (e.g. a stale screen still in the
  // navigation stack), a shared literal id makes url(#brass) resolve
  // unpredictably and the gradient fill can vanish on the visible one.
  const uid = useId();
  const brassGradientId = `brass-${uid}`;
  const bodyGradientId = `body-${uid}`;
  const hubGradientId = `hub-${uid}`;
  const containerRef = useRef<View>(null);
  const centerScreen = useRef({ x: 0, y: 0 });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);
  const activeIndexRef = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);
  const releaseAnimRef = useRef<number | null>(null);
  const endedRef = useRef(true);

  const measureCenter = useCallback(() => {
    containerRef.current?.measureInWindow((x, y, w, h) => {
      centerScreen.current = { x: x + w / 2, y: y + h / 2 };
    });
  }, []);

  // Same thin brass spike as the prototype's #fingerStop wedge: tip out on
  // the rim at r=178, a 12-unit-wide base down at r=150 between "0" and "1".
  const stopPath = useMemo(() => {
    const rad = degToRad(STOP_ANGLE_DEG);
    const perp = degToRad(STOP_ANGLE_DEG + 90);
    const tipX = CENTER + 178 * Math.cos(rad);
    const tipY = CENTER + 178 * Math.sin(rad);
    const baseX = CENTER + 150 * Math.cos(rad);
    const baseY = CENTER + 150 * Math.sin(rad);
    const px = 6 * Math.cos(perp);
    const py = 6 * Math.sin(perp);
    return `M${tipX} ${tipY} L${baseX + px} ${baseY + py} L${baseX - px} ${baseY - py} Z`;
  }, []);

  const cancelReleaseAnim = useCallback(() => {
    if (releaseAnimRef.current !== null) {
      cancelAnimationFrame(releaseAnimRef.current);
      releaseAnimRef.current = null;
    }
  }, []);

  const setDelta = useCallback((v: number) => {
    dragDeltaRef.current = v;
    setDragDelta(v);
  }, []);

  const springBack = useCallback((fromDelta: number) => {
    const duration = 260 + fromDelta * 1.2;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - easeOutCubic(t);
      setDelta(fromDelta * eased);
      if (t < 1) {
        releaseAnimRef.current = requestAnimationFrame(tick);
      } else {
        releaseAnimRef.current = null;
        activeIndexRef.current = null;
        setActiveIndex(null);
        setDelta(0);
      }
    };
    releaseAnimRef.current = requestAnimationFrame(tick);
  }, [setDelta]);

  const computeDelta = useCallback((restAngle: number, maxRot: number, absX: number, absY: number) => {
    const dx = absX - centerScreen.current.x;
    const dy = absY - centerScreen.current.y;
    const pointerAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const normalized = (pointerAngle + 360) % 360;
    let delta = (normalized - restAngle + 360) % 360;
    if (delta > maxRot) {
      // Past the valid [0, maxRot] pull range: decide whether the user
      // overshot just beyond the stop (clamp up to the stop) or dragged
      // backward past the rest position (clamp down to 0), using the
      // midpoint between maxRot and a full turn as the dividing line —
      // a fixed 180deg threshold breaks digits like "0" that legitimately
      // need to travel past 180deg to reach the stop.
      const midpoint = (maxRot + 360) / 2;
      delta = delta > midpoint ? 0 : maxRot;
    }
    return delta;
  }, []);

  const beginDrag = useCallback(
    (index: number, absX: number, absY: number) => {
      cancelReleaseAnim();
      endedRef.current = false;
      activeIndexRef.current = index;
      setActiveIndex(index);
      setDelta(computeDelta(digitRestAngle(index), maxRotationForDigit(index), absX, absY));
      onDragStateChange?.(true);
    },
    [cancelReleaseAnim, onDragStateChange, setDelta, computeDelta]
  );

  const updateDrag = useCallback(
    (index: number, absX: number, absY: number) => {
      setDelta(computeDelta(digitRestAngle(index), maxRotationForDigit(index), absX, absY));
    },
    [setDelta, computeDelta]
  );

  const endDrag = useCallback(
    (index: number, absX: number, absY: number) => {
      if (endedRef.current) return; // onEnd + onFinalize can both fire; only act once
      endedRef.current = true;
      const maxRot = maxRotationForDigit(index);
      const finalDelta = computeDelta(digitRestAngle(index), maxRot, absX, absY);
      const dialed = finalDelta > maxRot * 0.55;
      if (dialed) onDigit(DIGIT_SEQUENCE[index]);
      onDragStateChange?.(false);
      springBack(finalDelta);
    },
    [computeDelta, onDigit, onDragStateChange, springBack]
  );

  const gestures = useMemo(
    () =>
      DIGIT_SEQUENCE.map((_, index) =>
        Gesture.Pan()
          .runOnJS(true)
          .minDistance(0)
          .shouldCancelWhenOutside(false)
          .onBegin((e) => beginDrag(index, e.absoluteX, e.absoluteY))
          .onUpdate((e) => updateDrag(index, e.absoluteX, e.absoluteY))
          .onFinalize((e) => endDrag(index, e.absoluteX, e.absoluteY))
      ),
    [beginDrag, updateDrag, endDrag]
  );

  return (
    <View ref={containerRef} onLayout={measureCenter} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
        <Defs>
          <RadialGradient id={brassGradientId} cx="35%" cy="30%" r="75%">
            <Stop offset="0%" stopColor={colours.metal1} />
            <Stop offset="55%" stopColor={colours.metal2} />
            <Stop offset="100%" stopColor={colours.metal3} />
          </RadialGradient>
          <RadialGradient id={bodyGradientId} cx="40%" cy="30%" r="75%">
            <Stop offset="0%" stopColor={colours.body1} />
            <Stop offset="100%" stopColor={colours.body2} />
          </RadialGradient>
          <RadialGradient id={hubGradientId} cx="40%" cy="35%" r="70%">
            <Stop offset="0%" stopColor={colours.hub1} />
            <Stop offset="100%" stopColor={colours.hub2} />
          </RadialGradient>
        </Defs>

        <Circle cx={CENTER} cy={CENTER} r={DIAL_R} fill={`url(#${brassGradientId})`} />
        <Circle cx={CENTER} cy={CENTER} r={FACE_R} fill={`url(#${bodyGradientId})`} />
        <Circle cx={CENTER} cy={CENTER} r={RIM_R} fill="none" stroke={colours.metal1} strokeOpacity={0.25} strokeWidth={1.5} />

        <Path d={stopPath} fill={colours.metal1} stroke={colours.metal3} strokeWidth={1} />

        {/* The whole numbered ring is one rigid disk — pulling any hole
            rotates all of them together (a real dial's holes don't move
            independently of each other), clamped by whichever digit is
            currently being pulled. */}
        <G transform={`rotate(${dragDelta} ${CENTER} ${CENTER})`}>
          {DIGIT_SEQUENCE.map((digit, i) => {
            const rad = degToRad(digitRestAngle(i));
            const hx = CENTER + HOLE_ORBIT * Math.cos(rad);
            const hy = CENTER + HOLE_ORBIT * Math.sin(rad);
            const letters = DIGIT_LETTERS[digit];
            return (
              <G key={digit}>
                <Circle cx={hx} cy={hy} r={HOLE_R} fill={colours.face} stroke={colours.metal3} strokeWidth={1} />
                <SvgText
                  x={hx}
                  y={hy + (letters ? 2 : 6)}
                  fontSize={17}
                  fontWeight="700"
                  fontFamily={DIGIT_FONT}
                  fill={colours.ink}
                  textAnchor="middle"
                >
                  {digit}
                </SvgText>
                {letters ? (
                  <SvgText
                    x={hx}
                    y={hy + 13}
                    fontSize={5.4}
                    letterSpacing={0.6}
                    fontFamily={DIGIT_FONT}
                    fill={colours.inkMuted}
                    textAnchor="middle"
                  >
                    {letters}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </G>

        {/* The fixed hub — the keeper's little room. It doesn't turn with
            the disk, same as #hubGroup sitting outside .dial-face's ring. */}
        <Circle cx={CENTER} cy={CENTER} r={HUB_R} fill={`url(#${hubGradientId})`} stroke={colours.metal2} strokeWidth={2} />
        {hubNote ? (
          <SvgText
            x={CENTER}
            y={126}
            fontSize={10.7}
            fontFamily="monospace"
            fill={colours.inkMuted}
            textAnchor="middle"
          >
            {hubNote}
          </SvgText>
        ) : null}
      </Svg>

      {/* Invisible touch targets sit over each hole's rest position — only the
          visual disk (above) rotates under the active finger, matching how a
          real dial's finger holes stay put while the disk turns beneath them. */}
      {DIGIT_SEQUENCE.map((digit, i) => {
        const rad = degToRad(digitRestAngle(i));
        const hx = CENTER + HOLE_ORBIT * Math.cos(rad);
        const hy = CENTER + HOLE_ORBIT * Math.sin(rad);
        const hit = (HOLE_R / VB) * size * 2.8;
        const left = (hx / VB) * size - hit / 2;
        const top = (hy / VB) * size - hit / 2;
        return (
          <GestureDetector key={digit} gesture={gestures[i]}>
            <View
              style={{
                position: 'absolute',
                left,
                top,
                width: hit,
                height: hit,
                borderRadius: hit / 2,
              }}
            />
          </GestureDetector>
        );
      })}

      {centerContent ? (
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {centerContent}
        </View>
      ) : null}
    </View>
  );
}
