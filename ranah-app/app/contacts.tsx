import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BirthdayCard } from '../src/components/BirthdayCard/BirthdayCard';
import { ContactRow } from '../src/components/ContactRow/ContactRow';
import { ScreenShell } from '../src/components/ScreenShell/ScreenShell';
import { SearchBox } from '../src/components/SearchBox/SearchBox';
import type { Caller } from '../src/i18n/dictionaries';
import { contactMatches } from '../src/state/contactSearch';
import { useContacts } from '../src/state/ContactsContext';
import { isBirthdayOn } from '../src/state/decorations';
import { useLang } from '../src/state/LangContext';
import { usePalette } from '../src/state/PaletteContext';
import { useCallContact } from '../src/state/useCallContact';

const STAR_PATH = 'M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z';

// Favourites first, then everyone else A–Z under letter headings, with a
// search box and a letter strip for jumping down the list.
export default function ContactsScreen() {
  const router = useRouter();
  const { t, lang, isRtl } = useLang();
  const { colours } = usePalette();
  const { contacts, toggleFavourite } = useContacts();
  const callContact = useCallContact();
  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  // Where each letter's section starts in the list, for the letter strip.
  const sectionY = useRef<Record<string, number>>({});
  const rowDir = isRtl ? 'row-reverse' : 'row';
  const textAlign = isRtl ? ('right' as const) : ('left' as const);
  const locale = lang === 'ar' ? 'ar' : 'en';

  const collator = useMemo(() => new Intl.Collator(locale, { sensitivity: 'base' }), [locale]);
  const searching = query.trim().length > 0;
  const shown = contacts.filter((c) => contactMatches(c, query)).sort((a, b) => collator.compare(a.name, b.name));
  const favourites = shown.filter((c) => c.favourite);
  const groups: { letter: string; people: Caller[] }[] = [];
  for (const contact of shown.filter((c) => !c.favourite)) {
    const letter = contact.name.trim().charAt(0).toLocaleUpperCase(locale) || '#';
    const last = groups[groups.length - 1];
    if (last && last.letter === letter) last.people.push(contact);
    else groups.push({ letter, people: [contact] });
  }
  const showLetters = !searching && groups.length > 1;

  const row = (caller: Caller) => {
    const meta = isBirthdayOn(caller.birthday) ? `🎂 ${t.birthdayToday} · ${caller.meta}` : caller.meta;
    const starred = !!caller.favourite;
    return (
      <View key={caller.id} style={[styles.item, { flexDirection: rowDir }]}>
        <View style={styles.rowWrap}>
          <ContactRow name={caller.name} meta={meta} onPress={() => callContact(caller.id)} />
        </View>
        {/* Buttons beside the row: a button can't sit inside another. */}
        <Pressable
          onPress={() => toggleFavourite(caller.id)}
          role="checkbox"
          aria-checked={starred}
          aria-label={t.favouriteAria(caller.name)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.iconBtn,
            (pressed || hovered) && styles.iconBtnActive,
          ]}
        >
          <Svg width={17} height={17} viewBox="0 0 24 24">
            <Path
              d={STAR_PATH}
              fill={starred ? colours.highlight : 'none'}
              stroke={starred ? colours.highlight : 'rgba(239,230,211,.6)'}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/contact', params: { id: caller.id } })}
          role="button"
          aria-label={t.editContactAria(caller.name)}
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.iconBtn,
            (pressed || hovered) && styles.iconBtnActive,
          ]}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path
              d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"
              stroke="rgba(239,230,211,.7)"
              strokeWidth={1.8}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </Svg>
        </Pressable>
      </View>
    );
  };

  const heading = (text: string) => <Text style={[styles.heading, { textAlign, color: colours.metal1 }]}>{text}</Text>;

  return (
    <ScreenShell active="contacts">
      <View style={[styles.toolbar, { flexDirection: rowDir }]}>
        <SearchBox value={query} onChange={setQuery} placeholder={t.searchPlaceholder} />
        <Pressable
          onPress={() => router.push('/contact')}
          role="button"
          style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
            styles.addBtn,
            { flexDirection: rowDir, borderColor: `${colours.metal2}8c` },
            (pressed || hovered) && { backgroundColor: `${colours.metal2}33` },
          ]}
        >
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M6 1.5v9M1.5 6h9" stroke={colours.highlight} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
          <Text style={[styles.addLabel, { color: colours.highlight }]}>{t.addContact}</Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.list, showLetters && (isRtl ? { paddingLeft: 30 } : { paddingRight: 30 })]}
          keyboardShouldPersistTaps="handled"
        >
          {!searching && <BirthdayCard people={contacts.filter((c) => isBirthdayOn(c.birthday))} onCall={callContact} />}
          {contacts.length === 0 && <Text style={styles.empty}>{t.noContacts}</Text>}
          {contacts.length > 0 && shown.length === 0 && <Text style={styles.empty}>{t.noMatches}</Text>}

          {favourites.length > 0 && (
            <View style={styles.section}>
              {heading(`★ ${t.favouritesHeading}`)}
              {favourites.map(row)}
            </View>
          )}

          {groups.map((group) => (
            <View
              key={group.letter}
              style={styles.section}
              onLayout={(e) => {
                sectionY.current[group.letter] = e.nativeEvent.layout.y;
              }}
            >
              {heading(group.letter)}
              {group.people.map(row)}
            </View>
          ))}
        </ScrollView>

        {showLetters && (
          <View style={[styles.letters, isRtl ? { left: 4 } : { right: 4 }]}>
            {groups.map((group) => (
              <Pressable
                key={group.letter}
                onPress={() => scrollRef.current?.scrollTo({ y: sectionY.current[group.letter] ?? 0, animated: true })}
                role="button"
                aria-label={t.jumpToLetter(group.letter)}
                style={styles.letterBtn}
              >
                <Text style={[styles.letter, { color: colours.highlight }]}>{group.letter}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  toolbar: { alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  addBtn: {
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addLabel: { fontSize: 11, fontWeight: '700' },
  body: { flex: 1, minHeight: 0 },
  list: { paddingTop: 6, paddingHorizontal: 12, paddingBottom: 16, gap: 4 },
  section: { gap: 2 },
  heading: {
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: 'monospace',
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },
  item: { alignItems: 'center', gap: 2 },
  rowWrap: { flex: 1, minWidth: 0 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { backgroundColor: 'rgba(255,255,255,.07)' },
  letters: { position: 'absolute', top: 12, gap: 2, alignItems: 'center' },
  letterBtn: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 11 },
  letter: { fontSize: 11, fontWeight: '800' },
  empty: {
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    fontSize: 11,
    fontFamily: 'monospace',
    color: 'rgba(239,230,211,.55)',
  },
});
