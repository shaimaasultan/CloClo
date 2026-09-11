import React, { useCallback, useMemo, useRef, useState } from 'react';
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

const VB = 400;
const CENTER = 200;
const DIAL_R = 196;
const FACE_R = 180;
const HOLE_ORBIT = 148;
const HOLE_R = 24;

interface RotaryDialProps {
  size: number;
  colours: CaseColours;
  onDigit: (digit: string) => void;
  onDragStateChange?: (dragging: boolean) => void;
  centerContent?: React.ReactNode;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export function RotaryDial({ size, colours, onDigit, onDragStateChange, centerContent }: RotaryDialProps) {
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

  const stopEnd = useMemo(() => {
    const rad = degToRad(STOP_ANGLE_DEG);
    return {
      x1: CENTER + (FACE_R - 4) * Math.cos(rad),
      y1: CENTER + (FACE_R - 4) * Math.sin(rad),
      x2: CENTER + (FACE_R + 14) * Math.cos(degToRad(STOP_ANGLE_DEG - 6)),
      y2: CENTER + (FACE_R + 14) * Math.sin(degToRad(STOP_ANGLE_DEG - 6)),
      x3: CENTER + (FACE_R + 14) * Math.cos(degToRad(STOP_ANGLE_DEG + 6)),
      y3: CENTER + (FACE_R + 14) * Math.sin(degToRad(STOP_ANGLE_DEG + 6)),
    };
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
          <RadialGradient id="brass" cx="35%" cy="30%" r="75%">
            <Stop offset="0%" stopColor={colours.metal1} />
            <Stop offset="55%" stopColor={colours.metal2} />
            <Stop offset="100%" stopColor={colours.metal3} />
          </RadialGradient>
          <RadialGradient id="body" cx="40%" cy="30%" r="75%">
            <Stop offset="0%" stopColor={colours.body1} />
            <Stop offset="100%" stopColor={colours.body2} />
          </RadialGradient>
        </Defs>

        <Circle cx={CENTER} cy={CENTER} r={DIAL_R} fill="url(#brass)" />
        <Circle cx={CENTER} cy={CENTER} r={FACE_R} fill="url(#body)" />

        <Path
          d={`M${stopEnd.x1} ${stopEnd.y1} L${stopEnd.x2} ${stopEnd.y2} L${stopEnd.x3} ${stopEnd.y3} Z`}
          fill={colours.metal1}
        />

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
                <Circle cx={hx} cy={hy} r={HOLE_R} fill={colours.face} />
                <SvgText
                  x={hx}
                  y={hy + (letters ? -1 : 4)}
                  fontSize={letters ? 15 : 17}
                  fontWeight="700"
                  fill={colours.ink}
                  textAnchor="middle"
                >
                  {digit}
                </SvgText>
                {letters ? (
                  <SvgText x={hx} y={hy + 11} fontSize={5.5} fill={colours.inkMuted} textAnchor="middle">
                    {letters}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
        </G>
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
