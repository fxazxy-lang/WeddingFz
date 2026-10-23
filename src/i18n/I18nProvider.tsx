import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { wedding } from '../config/wedding';
import { type Lang, num } from '../lib/format';
import { type Dictionary, en } from './en';
import { km } from './km';

const dictionaries: Record<Lang, Dictionary> = { en, km };

interface I18nValue {
  lang: Lang;
  t: Dictionary;
  setLang: (lang: Lang) => void;
  /** Pick the right half of a { en, km } pair. */
  pick: (value: { en: string; km: string }) => string;
  /** Digits in the reader's script. */
  n: (value: string | number) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

function initialLanguage(): Lang {
  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (fromQuery === 'en' || fromQuery === 'km') return fromQuery;
  // The language the guest picked last time (static hosts can't set <html lang> per visitor).
  const fromCookie = /(?:^|;\s*)lang=(en|km)\b/.exec(document.cookie)?.[1];
  if (fromCookie === 'en' || fromCookie === 'km') return fromCookie;
  // The Node server sets <html lang> from the saved cookie, so the first paint is already correct.
  const fromHtml = document.documentElement.lang;
  if (fromHtml === 'en' || fromHtml === 'km') return fromHtml;
  return wedding.defaultLanguage;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = dictionaries[lang].meta.title;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    document.cookie = `lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    const url = new URL(window.location.href);
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang');
      window.history.replaceState(null, '', url);
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      t: dictionaries[lang],
      setLang,
      pick: (v) => v[lang],
      n: (v) => num(lang, v),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}
