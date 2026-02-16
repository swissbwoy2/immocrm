

# Integration Google Ads (gtag.js) pour logisorama.ch

## Objectif
Installer la balise Google Ads (ID: AW-10985038602) avec le meme systeme de consentement cookies RGPD que les pixels Meta et TikTok existants.

## Modifications

### 1. `index.html` - Ajouter le script gtag.js
- Ajouter le script async `https://www.googletagmanager.com/gtag/js?id=AW-10985038602` dans le `<head>`
- Initialiser `window.dataLayer` et la fonction `gtag()`
- Configurer avec `gtag('config', 'AW-10985038602')` mais avec le **consent mode** actif par defaut (pas de collecte avant acceptation cookies)

### 2. `src/lib/google-ads.ts` - Nouveau fichier utilitaire
- Fonctions utilitaires pour Google Ads, meme pattern que `tiktok-pixel.ts`
- `initGoogleAds()` : initialise gtag avec consent mode (denied par defaut)
- `grantGoogleAdsConsent()` : active la collecte apres acceptation cookies
- `trackGoogleAdsConversion(conversionId, params)` : declencher des evenements de conversion
- `trackGoogleAdsEvent(eventName, params)` : tracking d'evenements generiques

### 3. `src/components/CookieConsentBanner.tsx` - Modifier
- Ajouter l'appel a `grantGoogleAdsConsent()` dans `handleAccept()` (a cote de `grantTikTokConsent()`)

### 4. `index.html` - Google Consent Mode v2
- Configurer le consent mode v2 avant le chargement de gtag :
  ```
  gtag('consent', 'default', {
    'ad_storage': 'denied',
    'ad_user_data': 'denied',
    'ad_personalization': 'denied',
    'analytics_storage': 'denied'
  });
  ```
- Quand l'utilisateur accepte les cookies, on met a jour avec `gtag('consent', 'update', { ... 'granted' })`

### 5. `src/hooks/useWhatsAppTracking.ts` - Modifier
- Ajouter le tracking Google Ads Contact/conversion quand le widget WhatsApp est clique (a cote des evenements Meta et TikTok existants)

## Schema du flux de consentement

```text
Page chargee
    |
    v
gtag.js charge avec consent mode "denied"
    |
    v
Cookie banner s'affiche
    |
    +-- Accepter --> gtag('consent', 'update', granted)
    |                grantTikTokConsent()
    |                grantGoogleAdsConsent()  <-- nouveau
    |
    +-- Refuser --> rien ne change, collecte bloquee
```

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| `index.html` | Modifier - Ajouter script gtag.js + consent mode v2 |
| `src/lib/google-ads.ts` | Creer - Fonctions utilitaires Google Ads |
| `src/components/CookieConsentBanner.tsx` | Modifier - Appeler grantGoogleAdsConsent() |
| `src/hooks/useWhatsAppTracking.ts` | Modifier - Ajouter tracking Google Ads |

## Resultat
- La balise Google sera detectee par Google Ads lors du test d'installation
- Le consent mode v2 assure la conformite RGPD (obligatoire pour l'EEE comme indique dans la capture)
- Les conversions WhatsApp seront trackees sur les 3 plateformes (Meta, TikTok, Google)
