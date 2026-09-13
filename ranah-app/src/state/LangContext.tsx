import React, { createContext, useContext, useMemo, useState } from 'react';
import { DICTIONARIES, Dictionary, Lang } from '../i18n/dictionaries';
import { readPersisted, usePersist } from './persist';

interface LangContextValue {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  isRtl: boolean;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => readPersisted<Lang>('lang', 'en', (v) => v === 'en' || v === 'ar'));
  usePersist('lang', lang);
  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      t: DICTIONARIES[lang],
      setLang,
      isRtl: DICTIONARIES[lang].dir === 'rtl',
    }),
    [lang]
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
