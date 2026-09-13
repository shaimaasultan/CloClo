// Rotary-dial geometry. Digits are laid out counter-clockwise from a fixed finger
// stop so that "1" needs only a short clockwise pull to reach the stop and "0"
// needs almost a full turn — the real mechanic of a rotary phone.

export const DIGIT_SEQUENCE = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
export const DIGIT_LETTERS: Record<string, string> = {
  '1': '',
  '2': 'ABC',
  '3': 'DEF',
  '4': 'GHI',
  '5': 'JKL',
  '6': 'MNO',
  '7': 'PQRS',
  '8': 'TUV',
  '9': 'WXYZ',
  '0': 'OPER',
};

// Matches the HOLES table in dial-hollow.html: stop at 50deg, "1" at 350deg,
// then every 30deg counter-clockwise down to "0" at 80deg — leaving the
// empty arc between "0" and "1" where the finger stop sits.
export const STOP_ANGLE_DEG = 50; // screen angle, 0deg = 3 o'clock, clockwise-positive (y-down)
const HOLE_GAP_DEG = 30;
const FIRST_HOLE_OFFSET_DEG = 60;

export function digitRestAngle(index: number): number {
  // index 0..9 for digits '1'..'9','0'
  return (STOP_ANGLE_DEG - (FIRST_HOLE_OFFSET_DEG + HOLE_GAP_DEG * index) + 360) % 360;
}

export function maxRotationForDigit(index: number): number {
  const rest = digitRestAngle(index);
  return (STOP_ANGLE_DEG - rest + 360) % 360;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
