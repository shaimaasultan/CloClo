import { Platform } from 'react-native';

// The native animated driver exists on iOS and Android but not in the
// browser, where React Native Web warns and falls back to JS anyway. Ask for
// it only where it's real, so phones keep off-thread animations and web
// stays quiet.
export const USE_NATIVE_DRIVER = Platform.OS !== 'web';
