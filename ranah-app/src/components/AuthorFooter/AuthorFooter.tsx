import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLang } from '../../state/LangContext';

export const AUTHOR_NAME = 'Shaimaa Said Soltan';

// A quiet credit line at the foot of every screen.
export function AuthorFooter() {
  const { t } = useLang();
  return (
    <Text style={styles.footer} accessibilityRole="text">
      {t.madeBy(AUTHOR_NAME)}
    </Text>
  );
}

const styles = StyleSheet.create({
  footer: {
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 8,
    fontSize: 9,
    letterSpacing: 0.6,
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.38)',
  },
});
