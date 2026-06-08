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
  // Strictly removes elements created by this hook. Never touches sitewide
  // tags from index.html (they don't carry data-home-head).
  document.querySelectorAll(`[${MARK_ATTR}="true"]`).forEach((el) => el.remove());
}

/**
 * Injects head tags specific to the home route only:
 *   - <link rel="canonical" href="https://logisorama.ch/">
 *   - JSON-LD FAQPage generated from HOME_FAQ
 *   - document.title + meta description (home variant)
 *
 * Safety guarantees:
 *   - Idempotent: removeMarked() runs before insertion, so a remount
 *     (React strict mode, navigation aller-retour) never produces a duplicate
 *     home-canonical or home-faq-jsonld.
 *   - Cleanup is scoped: only [data-home-head="true"] is removed. Sitewide
 *     tags from index.html (Organization, RealEstateAgent, OG, Twitter) are
 *     untouched.
 *   - Restoration is conditional (sentinel): document.title and meta
 *     description are only restored if they still hold the values posted
 *     by this hook. This prevents race conditions on route changes where
 *     the next route (e.g. /mentions-legales) has already set its own
 *     document.title via useEffect before Landing unmounts.
 *   - If <meta name="description"> did not exist before mount, the hook
 *     creates one tagged data-home-head="true" so it is removed (not left
 *     empty) on unmount.
 */
export function useHomeHead() {
  useEffect(() => {
    // Snapshot to potentially restore on unmount
    const previousTitle = document.title;
    let descMeta = document.head.querySelector<HTMLMetaElement>('meta[name="description"]');
    const descExistedBefore = !!descMeta;
    const previousDescription = descMeta?.getAttribute('content') ?? null;

    // Purge any prior marked element (handles remount / strict mode)
    removeMarked();

    // 1. Canonical (home only)
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = CANONICAL_URL;
    canonical.id = CANONICAL_ID;
    canonical.setAttribute(MARK_ATTR, 'true');
    document.head.appendChild(canonical);

    // 2. FAQPage JSON-LD generated from HOME_FAQ (single source of truth)
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

    // 3. Title (home variant)
    document.title = HOME_TITLE;

    // 4. Description (home variant) — create if missing, mark it so unmount
    //    removes it instead of leaving an empty tag behind.
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      descMeta.setAttribute(MARK_ATTR, 'true');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', HOME_DESCRIPTION);

    return () => {
      // Always remove elements we created and marked. Safe by construction.
      removeMarked();

      // Sentinel-based title restore: only restore if no other route has
      // overwritten it (e.g. MentionsLegales setting its own title before
      // Landing unmounts during navigation).
      if (document.title === HOME_TITLE) {
        document.title = previousTitle;
      }

      // Sentinel-based description restore. Skip entirely if the meta
      // didn't exist before mount — in that case removeMarked() above
      // already deleted the one we created.
      if (descExistedBefore) {
        const currentDescMeta = document.head.querySelector<HTMLMetaElement>(
          'meta[name="description"]',
        );
        if (
          currentDescMeta &&
          currentDescMeta.getAttribute('content') === HOME_DESCRIPTION &&
          previousDescription !== null
        ) {
          currentDescMeta.setAttribute('content', previousDescription);
        }
      }
    };
  }, []);
}
