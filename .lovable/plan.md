

# Deploy: Meta Pixel conversion events avec retry

## 3 fichiers a modifier

### 1. `src/lib/meta-pixel.ts` -- Ajouter `trackMetaEventWithRetry`

Ajout d'une nouvelle fonction exportee a la fin du fichier. Les fonctions existantes (`initMetaPixel`, `grantMetaConsent`, `trackMetaPageView`, `trackMetaEvent`) restent strictement inchangees.

```typescript
export function trackMetaEventWithRetry(
  event: string,
  params?: object,
  maxAttempts: number = 20,
  intervalMs: number = 500
) {
  if (typeof window === 'undefined') return;

  if (window.fbq) {
    window.fbq('track', event, params);
    console.log('[Meta Pixel] Event sent:', event);
    return;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts++;
    if (window.fbq) {
      window.fbq('track', event, params);
      console.log('[Meta Pixel] Event sent (after retry):', event, '- attempts:', attempts);
      clearInterval(timer);
    } else if (attempts >= maxAttempts) {
      console.warn('[Meta Pixel] fbq not available after', maxAttempts, 'attempts. Event lost:', event);
      clearInterval(timer);
    }
  }, intervalMs);
}
```

### 2. `src/pages/InscriptionValidee.tsx` -- Lead uniquement

- Remplacer l'import `trackMetaEvent` par `trackMetaEventWithRetry` et ajouter `initMetaPixel`
- Dans le `useEffect` : appeler `initMetaPixel(true)` avant le tracking
- Appeler `trackMetaEventWithRetry('Lead')` uniquement (supprimer `CompleteRegistration`)
- Ajouter `console.log` pour debug

### 3. `src/pages/Test24hActive.tsx` -- CompleteRegistration uniquement + GDPR

- Ajouter imports `trackMetaEventWithRetry` et `initMetaPixel` depuis `@/lib/meta-pixel`
- Ajouter constante `COOKIE_CONSENT_KEY = 'cookie-consent'`
- Remplacer le `useEffect` de tracking : check consent GDPR + `initMetaPixel(true)` + `trackMetaEventWithRetry('CompleteRegistration')`
- Guard sessionStorage conserve

## Mapping final

| Page | Evenement Meta | Description |
|---|---|---|
| `/inscription-validee` | `Lead` | Mandat signe (conversion principale) |
| `/test-24h-active` | `CompleteRegistration` | Essai 24h qualifie |

## Validation post-deploiement

En navigation privee :
1. Accepter cookies
2. Parcours complet jusqu'a signature mandat
3. Page `/inscription-validee` : console affiche `[Meta Pixel] Event sent: Lead`
4. Page `/test-24h-active` : console affiche `[Meta Pixel] Event sent: CompleteRegistration`
5. Events Manager puis Test Events : Lead et CompleteRegistration visibles en temps reel

