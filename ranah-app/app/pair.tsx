import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { mintGrant, type Grant } from '../src/crypto/identity';
import { useContacts } from '../src/state/ContactsContext';
import { useLang } from '../src/state/LangContext';
import { useMessages } from '../src/state/MessagesContext';
import { usePalette } from '../src/state/PaletteContext';
import { useSettings } from '../src/state/SettingsContext';

// What a paired device's QR shows: identity always, plus a grant once we've
// minted one for whoever scanned us first (round 2 of the exchange — see
// CallingArchitecture/calling-architecture.html §Phase 1).
interface ScannedIdentity {
  id: string;
  boxPublicKey: string;
  signPublicKey: string;
  pushToken: string;
  grant?: Grant;
}

function isScannedIdentity(v: unknown): v is ScannedIdentity {
  const o = v as ScannedIdentity | null;
  return !!o && typeof o.id === 'string' && typeof o.boxPublicKey === 'string' && typeof o.signPublicKey === 'string';
}

// QR-based device pairing: show your own code, scan theirs, take turns
// until each side has minted the other a grant. Session-scoped — nothing
// here is persisted until the pairing finishes and becomes a Contact.
export default function PairScreen() {
  const router = useRouter();
  const { t, isRtl } = useLang();
  const { colours } = usePalette();
  const { profile } = useMessages();
  const { addContact, attachPairing } = useContacts();
  const { sfx } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();

  const [pendingPeer, setPendingPeer] = useState<ScannedIdentity | null>(null);
  const [grantForPeer, setGrantForPeer] = useState<Grant | null>(null);
  const [minting, setMinting] = useState(false);
  const [ready, setReady] = useState<{ peer: ScannedIdentity; grant: Grant } | null>(null);
  const [name, setName] = useState('');

  const textAlign = isRtl ? ('right' as const) : ('left' as const);
  const myIdentityReady = !!(profile.boxPublicKey && profile.signPublicKey);
  const qrValue = myIdentityReady
    ? JSON.stringify({
        id: profile.id,
        boxPublicKey: profile.boxPublicKey,
        signPublicKey: profile.signPublicKey,
        pushToken: profile.pushToken ?? '',
        ...(grantForPeer ? { grant: grantForPeer } : {}),
      })
    : null;

  const handleScan = useCallback(
    ({ data }: { data: string }) => {
      if (ready) return;
      let parsed: unknown;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }
      if (!isScannedIdentity(parsed) || parsed.id === profile.id) return;

      // Same peer as before: either their round-2 code (with a grant for
      // us) or the same round-1 code seen again while we're still minting.
      if (pendingPeer?.id === parsed.id) {
        if (parsed.grant) setReady({ peer: parsed, grant: parsed.grant });
        return;
      }
      if (minting) return;

      // A new peer's round-1 code: mint them a grant, which updates our own
      // displayed QR to round 2.
      setPendingPeer(parsed);
      setGrantForPeer(null);
      setMinting(true);
      mintGrant(parsed.signPublicKey, profile.pushToken ?? '')
        .then(setGrantForPeer)
        .finally(() => setMinting(false));
    },
    [ready, pendingPeer, minting, profile.id, profile.pushToken]
  );

  const finish = () => {
    if (!ready || !name.trim()) return;
    const id = addContact({
      name: name.trim(),
      number: '',
      birthday: '',
      activity: 'home',
      sky: 'clear',
      localHour: new Date().getHours(),
      keepsake: 'photo',
    });
    attachPairing(id, {
      boxPublicKey: ready.peer.boxPublicKey,
      signPublicKey: ready.peer.signPublicKey,
      pushToken: ready.peer.pushToken,
      grant: ready.grant,
    });
    sfx('bump');
    router.dismissTo('/contacts');
  };

  return (
    <ScreenShell active="contacts" back={{ label: t.contactsTitle, title: t.pairTitle, onPress: () => router.dismissTo('/contacts') }}>
      {Platform.OS === 'web' ? (
        <Text style={styles.waiting}>{t.pairNativeOnly}</Text>
      ) : ready ? (
        <View style={styles.form}>
          <Text style={[styles.label, { textAlign }]}>{t.contactNameLabel}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={[styles.input, { textAlign }]}
            placeholderTextColor="rgba(239,230,211,.3)"
            aria-label={t.contactNameLabel}
            autoFocus
          />
          <Pressable
            onPress={finish}
            disabled={!name.trim()}
            role="button"
            aria-disabled={!name.trim()}
            style={[styles.saveBtn, { backgroundColor: colours.metal2 }, !name.trim() && styles.disabled]}
          >
            <Text style={[styles.saveLabel, { color: colours.ink }]}>{t.addContact}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.panels}>
          <View style={styles.panel}>
            <Text style={[styles.label, { textAlign: 'center' }]}>{t.pairShowCode}</Text>
            <View style={styles.qrBox}>
              {qrValue ? <QRCode value={qrValue} size={180} /> : <ActivityIndicator color={colours.highlight} />}
            </View>
            {pendingPeer && <Text style={styles.waiting}>{t.pairWaitingForThem}</Text>}
          </View>

          <View style={styles.panel}>
            <Text style={[styles.label, { textAlign: 'center' }]}>{t.pairScanTheirs}</Text>
            <View style={styles.cameraBox}>
              {permission?.granted ? (
                <CameraView
                  style={StyleSheet.absoluteFill}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  onBarcodeScanned={handleScan}
                />
              ) : (
                <Pressable onPress={requestPermission} role="button" style={styles.permissionBtn}>
                  <Text style={[styles.saveLabel, { color: colours.highlight }]}>{t.pairGrantCameraAccess}</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  panels: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 24, gap: 20 },
  panel: { gap: 10, alignItems: 'center' },
  label: {
    color: 'rgba(239,230,211,.55)',
    fontSize: 9,
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
  },
  qrBox: {
    width: 200,
    height: 200,
    borderRadius: 14,
    backgroundColor: '#f3ecdd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waiting: { color: 'rgba(239,230,211,.6)', fontSize: 11, fontFamily: 'monospace', textAlign: 'center' },
  cameraBox: {
    width: 260,
    height: 260,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(11,10,8,.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  form: { paddingTop: 8, paddingHorizontal: 18, paddingBottom: 24, gap: 10 },
  input: {
    color: '#f3ecdd',
    fontSize: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
    backgroundColor: 'rgba(11,10,8,.35)',
  },
  saveBtn: { marginTop: 6, borderRadius: 999, paddingVertical: 11, alignItems: 'center' },
  saveLabel: { fontSize: 13, fontWeight: '800' },
  disabled: { opacity: 0.4 },
});
