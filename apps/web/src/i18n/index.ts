import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import frCommon from './locales/fr/common.json';
import frSidebar from './locales/fr/sidebar.json';
import frHeader from './locales/fr/header.json';
import frLogin from './locales/fr/login.json';
import frDashboard from './locales/fr/dashboard.json';
import frProducts from './locales/fr/products.json';
import frProductStores from './locales/fr/productStores.json';
import frStores from './locales/fr/stores.json';
import frRegions from './locales/fr/regions.json';
import frUsers from './locales/fr/users.json';
import frVisits from './locales/fr/visits.json';
import frAuditItems from './locales/fr/auditItems.json';
import frSchedule from './locales/fr/schedule.json';
import frReports from './locales/fr/reports.json';
import frRoles from './locales/fr/roles.json';
import frPos from './locales/fr/pos.json';

import enCommon from './locales/en/common.json';
import enSidebar from './locales/en/sidebar.json';
import enHeader from './locales/en/header.json';
import enLogin from './locales/en/login.json';
import enDashboard from './locales/en/dashboard.json';
import enProducts from './locales/en/products.json';
import enProductStores from './locales/en/productStores.json';
import enStores from './locales/en/stores.json';
import enRegions from './locales/en/regions.json';
import enUsers from './locales/en/users.json';
import enVisits from './locales/en/visits.json';
import enAuditItems from './locales/en/auditItems.json';
import enSchedule from './locales/en/schedule.json';
import enReports from './locales/en/reports.json';
import enRoles from './locales/en/roles.json';
import enPos from './locales/en/pos.json';

import arCommon from './locales/ar/common.json';
import arSidebar from './locales/ar/sidebar.json';
import arHeader from './locales/ar/header.json';
import arLogin from './locales/ar/login.json';
import arDashboard from './locales/ar/dashboard.json';
import arProducts from './locales/ar/products.json';
import arProductStores from './locales/ar/productStores.json';
import arStores from './locales/ar/stores.json';
import arRegions from './locales/ar/regions.json';
import arUsers from './locales/ar/users.json';
import arVisits from './locales/ar/visits.json';
import arAuditItems from './locales/ar/auditItems.json';
import arSchedule from './locales/ar/schedule.json';
import arReports from './locales/ar/reports.json';
import arRoles from './locales/ar/roles.json';
import arPos from './locales/ar/pos.json';

export const LANGUAGE_STORAGE_KEY = 'appLanguage';
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const RTL_LANGUAGES: SupportedLanguage[] = ['ar'];
export const DEFAULT_LANGUAGE: SupportedLanguage = 'fr';

export const NAMESPACES = [
  'common',
  'sidebar',
  'header',
  'login',
  'dashboard',
  'products',
  'productStores',
  'stores',
  'regions',
  'users',
  'visits',
  'auditItems',
  'schedule',
  'reports',
  'roles',
  'pos',
] as const;

function getInitialLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && (SUPPORTED_LANGUAGES as readonly string[]).includes(stored)) {
    return stored as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

export function isRtl(language: string): boolean {
  return RTL_LANGUAGES.includes(language as SupportedLanguage);
}

export function applyDocumentDirection(language: string) {
  document.documentElement.lang = language;
  document.documentElement.dir = isRtl(language) ? 'rtl' : 'ltr';
}

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      common: frCommon,
      sidebar: frSidebar,
      header: frHeader,
      login: frLogin,
      dashboard: frDashboard,
      products: frProducts,
      productStores: frProductStores,
      stores: frStores,
      regions: frRegions,
      users: frUsers,
      visits: frVisits,
      auditItems: frAuditItems,
      schedule: frSchedule,
      reports: frReports,
      roles: frRoles,
      pos: frPos,
    },
    en: {
      common: enCommon,
      sidebar: enSidebar,
      header: enHeader,
      login: enLogin,
      dashboard: enDashboard,
      products: enProducts,
      productStores: enProductStores,
      stores: enStores,
      regions: enRegions,
      users: enUsers,
      visits: enVisits,
      auditItems: enAuditItems,
      schedule: enSchedule,
      reports: enReports,
      roles: enRoles,
      pos: enPos,
    },
    ar: {
      common: arCommon,
      sidebar: arSidebar,
      header: arHeader,
      login: arLogin,
      dashboard: arDashboard,
      products: arProducts,
      productStores: arProductStores,
      stores: arStores,
      regions: arRegions,
      users: arUsers,
      visits: arVisits,
      auditItems: arAuditItems,
      schedule: arSchedule,
      reports: arReports,
      roles: arRoles,
      pos: arPos,
    },
  },
  ns: NAMESPACES,
  defaultNS: 'common',
  lng: getInitialLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: {
    escapeValue: false,
  },
  returnEmptyString: false,
});

applyDocumentDirection(i18n.language);

i18n.on('languageChanged', (language) => {
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  applyDocumentDirection(language);
});

export default i18n;
