'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { normalizeLocale, type Locale } from '../lib/locale';
const LocaleContext = createContext<Locale>('en');
const storageKey = 'cv01-locale';
export const useLocale = () => useContext(LocaleContext);
export default function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    try { setLocale(normalizeLocale(localStorage.getItem(storageKey))); } catch { /* Storage can be disabled. */ }
    setReady(true);
    const sync = (event: StorageEvent) => { if (event.key === storageKey) setLocale(normalizeLocale(event.newValue)); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  const choose = (language: Locale) => {
    setLocale(language);
    try { localStorage.setItem(storageKey, language); } catch { /* Switching still works without persistence. */ }
  };
  return <LocaleContext.Provider value={locale}>
    {children}
    {!pathname?.startsWith('/admin') && !pathname?.startsWith('/lab') && <nav className="language-switch" aria-label={locale === 'en' ? 'Language' : '語言'}>
      <button type="button" disabled={!ready} lang="en" aria-pressed={locale === 'en'} onClick={() => choose('en')}>EN</button>
      <span aria-hidden="true">/</span>
      <button type="button" disabled={!ready} lang="zh-Hant" aria-pressed={locale === 'zh-Hant'} onClick={() => choose('zh-Hant')}>繁中</button>
    </nav>}
  </LocaleContext.Provider>;
}
