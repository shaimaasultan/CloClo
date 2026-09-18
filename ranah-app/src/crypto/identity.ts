import 'react-native-get-random-values';
import nacl from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64 } from 'tweetnacl-util';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// This device's authorization to reach a specific person — see
// CallingArchitecture/calling-architecture.html §Phase 1, step 4.
export interface Grant {
  granteePublicKey: string;
  issuerPublicKey: string;
  pushToken: string;
  issuedAt: number;
  expiresAt: number;
  signature: string;
}

const BOX_SECRET_KEY = 'boxSecretKey';
const SIGN_SECRET_KEY = 'signSecretKey';
const GRANT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

// SecureStore (Keychain/Keystore) isn't available on web. Pairing is a
// phone-to-phone flow anyway, so identity is simply inert on web.
const nativeOnly = Platform.OS !== 'web';

let cachedKeys: { boxSecretKey: Uint8Array; signSecretKey: Uint8Array } | null = null;

async function loadOrCreateSecretKeys() {
  if (cachedKeys) return cachedKeys;
  const [storedBox, storedSign] = await Promise.all([
    SecureStore.getItemAsync(BOX_SECRET_KEY),
    SecureStore.getItemAsync(SIGN_SECRET_KEY),
  ]);
  if (storedBox && storedSign) {
    cachedKeys = { boxSecretKey: decodeBase64(storedBox), signSecretKey: decodeBase64(storedSign) };
    return cachedKeys;
  }
  const box = nacl.box.keyPair();
  const sign = nacl.sign.keyPair();
  await Promise.all([
    SecureStore.setItemAsync(BOX_SECRET_KEY, encodeBase64(box.secretKey)),
    SecureStore.setItemAsync(SIGN_SECRET_KEY, encodeBase64(sign.secretKey)),
  ]);
  cachedKeys = { boxSecretKey: box.secretKey, signSecretKey: sign.secretKey };
  return cachedKeys;
}

// Generates this device's keypairs on first call (or loads them on later
// calls) and returns the public halves — the secret halves never leave this
// module.
export async function ensureIdentity(): Promise<{ boxPublicKey: string; signPublicKey: string } | null> {
  if (!nativeOnly) return null;
  const { boxSecretKey, signSecretKey } = await loadOrCreateSecretKeys();
  return {
    boxPublicKey: encodeBase64(nacl.box.keyPair.fromSecretKey(boxSecretKey).publicKey),
    signPublicKey: encodeBase64(nacl.sign.keyPair.fromSecretKey(signSecretKey).publicKey),
  };
}

// Authorizes `granteePublicKey` to reach this device, signed with this
// device's own sign key. The relay (Phase 2) verifies this without any
// server-side lookup — everything it needs is inside the object itself.
export async function mintGrant(granteePublicKey: string, myPushToken: string): Promise<Grant> {
  const identity = await ensureIdentity();
  if (!identity) throw new Error('mintGrant requires a native platform');
  const { signSecretKey } = await loadOrCreateSecretKeys();
  const issuedAt = Date.now();
  const unsigned = {
    granteePublicKey,
    issuerPublicKey: identity.signPublicKey,
    pushToken: myPushToken,
    issuedAt,
    expiresAt: issuedAt + GRANT_TTL_MS,
  };
  const signature = encodeBase64(nacl.sign.detached(decodeUTF8(JSON.stringify(unsigned)), signSecretKey));
  return { ...unsigned, signature };
}

// The Expo push token for this install. Returns '' rather than throwing —
// unavailable on web, and on native it needs an EAS project id that may not
// be configured yet; either way pairing should still work without it.
export async function getPushToken(): Promise<string> {
  if (!nativeOnly) return '';
  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    return data;
  } catch {
    return '';
  }
}
