import { StyleSheet } from 'react-native';

// Touch pass-through styles. On web, React Native Web only turns
// `pointerEvents` into working CSS for styles registered with
// StyleSheet.create — inline style objects drop it silently, and the
// `pointerEvents` *prop* is deprecated. Always use these instead.
export const pointer = StyleSheet.create({
  // The view and its children ignore touches.
  none: { pointerEvents: 'none' },
  // The view itself ignores touches; its children still receive them.
  boxNone: { pointerEvents: 'box-none' },
});
