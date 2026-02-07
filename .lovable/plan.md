

# Implementation -- Meta Pixel global GDPR-safe

## Contexte

L'erreur de build actuelle (`Cloudflare R2 429`) est un probleme temporaire d'infrastructure (rate-limiting), non lie au code. L'implementation ci-dessous est purement du code frontend -- le deploiement reussira au prochain essai.

Les fichiers `src/lib/meta-pixel.ts` et `src/components/MetaPixelProvider.tsx` n'existent pas encore. Les pages `/inscription-validee` et `/test-24h-active` utilisent deja `window.fbq` avec guards sessionStorage -- elles n'ont pas besoin de modification.

---

## Fichiers a creer (2)

### 1. `src/lib/meta-pixel.ts`

Utilitaire Meta Pixel avec quadruple guard :

- `typeof window === 'undefined'` (SSR safety)
- `withConsent === false` (GDPR : rien n'est charge sans consentement)
- `isInitialized` flag interne (anti-double logique)
- `document.getElementById('meta-pixel-sdk')` (anti-double injection DOM)

Fonctions exportees :
- `initMetaPixel(withConsent)` : injecte fbevents.js avec `id="meta-pixel-sdk"`, initialise la queue fbq, appelle `fbq('init', '1270471197464641')` puis `fbq('track', 'PageView')`
- `grantMetaConsent()` : raccourci pour `initMetaPixel(true)`
- `trackMetaPageView()` : `window.fbq('track', 'PageView')` avec guard
- `trackMetaEvent(event, params?)` : `window.fbq('track', event, params)` avec guard

### 2. `src/components/MetaPixelProvider.tsx`

Provider global (meme pattern que `TikTokPixelProvider`) :

- Au mount : lit `localStorage.getItem('cookie-consent')`, appelle `initMetaPixel(consent === 'accepted')`
- Sur changement de `location.pathname` : appelle `trackMetaPageView()` si consent est `'accepted'`
- Rend `{children}` sans markup

---

## Fichiers a modifier (2)

### 3. `src/components/CookieConsentBanner.tsx`

- Ligne 4 : ajouter import `grantMetaConsent` depuis `@/lib/meta-pixel`
- Ligne 24 : ajouter `grantMetaConsent();` apres `grantTikTokConsent();` dans `handleAccept()`

### 4. `src/App.tsx`

- Ligne 12 : ajouter import `MetaPixelProvider`
- Ligne 210 : inserer `<MetaPixelProvider>` entre `<TikTokPixelProvider>` et `<AuthProvider>`
- Ligne 380 : fermer `</MetaPixelProvider>` entre `</AuthProvider>` et `</TikTokPixelProvider>`

Structure resultante :

```text
<TikTokPixelProvider>
  <MetaPixelProvider>
    <AuthProvider>
      ...routes...
    </AuthProvider>
  </MetaPixelProvider>
</TikTokPixelProvider>
```

---

## Fichiers inchanges

- `src/pages/InscriptionValidee.tsx` : garde `if (window.fbq) window.fbq('track', 'Lead')` avec guard sessionStorage
- `src/pages/Test24hActive.tsx` : garde `if (window.fbq) window.fbq('track', 'CompleteRegistration')` avec guard sessionStorage
- `src/types/meta-pixel.d.ts` : reste en place

---

## Flux GDPR

```text
Arrivee -> MetaPixelProvider -> consent=null -> initMetaPixel(false) -> RETURN (rien charge)

Cookie banner -> "Accepter"
  -> localStorage = 'accepted'
  -> grantTikTokConsent()
  -> grantMetaConsent() -> initMetaPixel(true)
    -> quadruple guard OK
    -> script#meta-pixel-sdk injecte
    -> fbq('init', '1270471197464641')
    -> fbq('track', 'PageView')
  -> Tracking actif

Cookie banner -> "Refuser" -> Rien charge
```

---

## Validation post-deploiement

| Test | Resultat attendu |
|---|---|
| Nav privee + refus cookies | Aucun script `meta-pixel-sdk` dans le DOM, aucun appel `connect.facebook.net` |
| Nav privee + acceptation cookies | Script charge, PageView visible dans Events Manager **Test Events** (temps reel) |
| `/inscription-validee` apres acceptation | Evenement `Lead` dans Events Manager Test Events |
| `/test-24h-active` apres acceptation | Evenement `CompleteRegistration` dans Events Manager Test Events |

## Resume des fichiers

| Fichier | Action |
|---|---|
| `src/lib/meta-pixel.ts` | Nouveau |
| `src/components/MetaPixelProvider.tsx` | Nouveau |
| `src/components/CookieConsentBanner.tsx` | Ajout import + `grantMetaConsent()` |
| `src/App.tsx` | Ajout import + wrapper `<MetaPixelProvider>` |

