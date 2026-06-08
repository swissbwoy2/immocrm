import { useEffect } from 'react';
import { HOME_FAQ } from '@/components/landing/premium/PremiumFAQ';

const CANONICAL_URL = 'https://logisorama.ch/';
const HOME_TITLE = 'Agence de relocation à Lausanne | Logisorama by Immo-rama.ch';
const HOME_DESCRIPTION =
  "Logisorama accompagne votre recherche d'appartement à Lausanne, Genève, Crissier et en Suisse romande. Agence de relocation et chasseur d'appartement.";

const MARK_ATTR = 'data-home-head';
const CANONICAL_ID = 'home-canonical';
const FAQ_JSONLD_ID = 'home-faq-jsonld';

function removeMarked() {
  document.querySelectorAll(`[${MARK_ATTR}="true"]`).forEach((el) => el.remove());
}

/**
 * Injects head tags specific to the home route only.
 * - canonical → https://logisorama.ch/
 * - JSON-LD FAQPage generated from HOME_FAQ
 * - document.title + meta description specific to home
 * Cleaned up on unmount so other routes are not polluted.
 */
export function useHomeHead() {
  useEffect(() => {
    // Snapshot to restore on unmount
    const previousTitle = document.title;
    const descMeta = document.querySelector('meta[name="description"]');
    const previousDescription = descMeta?.getAttribute('content') ?? null;

    // Idempotent: clean any prior marked element (handles remount/strict mode)
    removeMarked();

    // Canonical (home only)
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = CANONICAL_URL;
    canonical.id = CANONICAL_ID;
    canonical.setAttribute(MARK_ATTR, 'true');
    document.head.appendChild(canonical);

    // FAQPage JSON-LD generated from HOME_FAQ (single source of truth)
    const faqJsonLd = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: HOME_FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: a,
        },
      })),
    };
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = FAQ_JSONLD_ID;
    script.setAttribute(MARK_ATTR, 'true');
    script.text = JSON.stringify(faqJsonLd);
    document.head.appendChild(script);

    // Title + description (home variant)
    document.title = HOME_TITLE;
    if (descMeta) {
      descMeta.setAttribute('content', HOME_DESCRIPTION);
    }

    return () => {
      removeMarked();
      document.title = previousTitle;
      if (descMeta && previousDescription !== null) {
        descMeta.setAttribute('content', previousDescription);
      }
    };
  }, []);
}
