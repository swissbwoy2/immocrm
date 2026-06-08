// Version unique partagée entre la politique de confidentialité, la bannière cookies
// et les checkboxes de consentement upload. À incrémenter à chaque modification
// significative des pages légales.
export const POLICY_VERSION = '2026-06-08';
export const POLICY_DATE_LABEL = '8 juin 2026';

export type CookieCategories = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
};

export const DEFAULT_COOKIE_CATEGORIES: CookieCategories = {
  necessary: true,
  analytics: false,
  marketing: false,
  personalization: false,
};

export const COOKIE_CONSENT_STORAGE_KEY = 'cookie-consent-v2';
export const COOKIE_ANON_ID_KEY = 'cookie-anon-id';

export type StoredConsent = {
  version: string;
  date: string;
  categories: CookieCategories;
};

export function loadStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.version !== POLICY_VERSION) return null; // force re-prompt on policy update
    return parsed;
  } catch {
    return null;
  }
}

export function saveStoredConsent(categories: CookieCategories) {
  if (typeof window === 'undefined') return;
  const value: StoredConsent = {
    version: POLICY_VERSION,
    date: new Date().toISOString(),
    categories,
  };
  localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
}

export function getOrCreateAnonId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(COOKIE_ANON_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(COOKIE_ANON_ID_KEY, id);
  }
  return id;
}
