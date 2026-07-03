import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../i18n';

export interface LanguageOption {
  code: SupportedLanguage;
  nativeName: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: 'fr', nativeName: 'Français' },
  { code: 'en', nativeName: 'English' },
  { code: 'ar', nativeName: 'العربية' },
];

export function useLanguage() {
  const { i18n } = useTranslation();
  const current = (SUPPORTED_LANGUAGES as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLanguage)
    : 'fr';

  const setLanguage = (code: SupportedLanguage) => {
    i18n.changeLanguage(code);
  };

  return { current, languages: LANGUAGE_OPTIONS, setLanguage };
}
