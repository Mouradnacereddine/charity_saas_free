import { useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

const RTL_LANGS = ['ar'];

export function DirectionProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const dir = RTL_LANGS.includes(i18n.language) ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = i18n.language;
  }, [dir, i18n.language]);

  return <>{children}</>;
}
