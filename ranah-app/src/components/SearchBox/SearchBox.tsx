import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useLang } from '../../state/LangContext';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

// A rounded search field with a magnifier and a clear button, for filtering
// Contacts and Recents.
export function SearchBox({ value, onChange, placeholder }: SearchBoxProps) {
  const { t, isRtl } = useLang();

  return (
    <View style={[styles.box, { flexDirection: isRtl ? 'row-reverse' : 'row' }]}>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Circle cx={10.5} cy={10.5} r={6.5} stroke="rgba(239,230,211,.55)" strokeWidth={2} fill="none" />
        <Path d="M15.5 15.5 20 20" stroke="rgba(239,230,211,.55)" strokeWidth={2} strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="rgba(239,230,211,.35)"
        style={[styles.input, { textAlign: isRtl ? 'right' : 'left' }]}
        aria-label={placeholder}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChange('')} role="button" aria-label={t.clearSearch} style={styles.clear}>
          <Text style={styles.clearLabel}>×</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minWidth: 0,
    height: 34,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,.1)',
    backgroundColor: 'rgba(11,10,8,.35)',
  },
  input: { flex: 1, minWidth: 0, color: '#f3ecdd', fontSize: 13, paddingVertical: 0 },
  clear: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,230,211,.12)',
  },
  clearLabel: { color: '#efe6d3', fontSize: 13, lineHeight: 15 },
});
