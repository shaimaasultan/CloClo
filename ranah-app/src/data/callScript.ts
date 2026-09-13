// Ported from the prototype's SCRIPT: a short example exchange where you
// speak Egyptian Arabic and the caller speaks English, each line shown in
// its original language with a live translation underneath. The lines are
// the conversation itself, so they don't change with the UI language.

export type TextDir = 'ltr' | 'rtl';

export interface ScriptLine {
  who: 'you' | 'them';
  original: string;
  originalDir: TextDir;
  translated: string;
  translatedDir: TextDir;
}

export const CALL_SCRIPT: ScriptLine[] = [
  {
    who: 'you',
    original: 'إزيّك؟ عامل إيه؟',
    originalDir: 'rtl',
    translated: 'How are you? How’s it going?',
    translatedDir: 'ltr',
  },
  {
    who: 'them',
    original: 'I’m good — just finishing up a report.',
    originalDir: 'ltr',
    translated: 'أنا كويس، بخلّص تقرير دلوقتي.',
    translatedDir: 'rtl',
  },
  {
    who: 'you',
    original: 'تمام، هعدّي عليك بعد شوية.',
    originalDir: 'rtl',
    translated: 'Great, I’ll swing by in a bit.',
    translatedDir: 'ltr',
  },
  {
    who: 'them',
    original: 'Sounds good, see you soon!',
    originalDir: 'ltr',
    translated: 'تمام، أشوفك قريب!',
    translatedDir: 'rtl',
  },
];
