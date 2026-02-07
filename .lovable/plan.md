

# Simplifier le Meta Pixel : chargement statique dans index.html

## Le probleme

Le systeme actuel charge le SDK Meta dynamiquement via JavaScript (injection de script dans le DOM). Cette approche est fragile dans une SPA React : les guards (`__META_PIXEL_INIT`, `document.getElementById`, consent checks) se combinent et bloquent l'initialisation du pixel. Resultat : zero PageView, zero Lead dans Events Manager.

## La solution

Remplacer toute la mecanique dynamique par le snippet officiel Meta, directement dans le HTML. Le pixel se charge une seule fois au niveau du navigateur et survit a toutes les navigations SPA.

## 6 modifications

### 1. `index.html` -- Ajouter le snippet Meta Pixel officiel

Inserer dans le `<head>`, juste avant `</head>`, le snippet standard fourni par Meta :

```text
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '1270471197464641');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=1270471197464641&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
```

Ce snippet est celui que Meta fournit dans Events Manager. Il charge `fbevents.js`, initialise le pixel et envoie le premier PageView immediatement, au niveau HTML, avant meme que React ne demarre.

### 2. `src/App.tsx` -- Supprimer MetaPixelProvider, ajouter PageView sur route change

- Supprimer l'import de `MetaPixelProvider` (ligne 13)
- Supprimer le wrapping `<MetaPixelProvider>...</MetaPixelProvider>` (lignes 211 et 383)
- Transformer `AppContent` pour ajouter le tracking PageView sur chaque changement de route :

```text
const AppContent = () => {
  const location = useLocation();
  useAppVersionCheck();

  // Track SPA page views
  useEffect(() => {
    if ((window as any).fbq) {
      (window as any).fbq('track', 'PageView');
    }
  }, [location.pathname]);

  return null;
};
```

Note : `AppContent` est deja rendu a l'interieur de `<BrowserRouter>`, donc `useLocation()` fonctionne.

### 3. `src/components/MetaPixelProvider.tsx` -- Supprimer le fichier

Ce composant n'a plus de raison d'etre. Toute son utilite (init + PageView) est desormais geree par `index.html` + `AppContent`.

### 4. `src/lib/meta-pixel.ts` -- Supprimer le fichier

Toutes les fonctions (`initMetaPixel`, `grantMetaConsent`, `trackMetaPageView`, `trackMetaEvent`, `trackMetaEventWithRetry`) sont remplacees par des appels directs a `window.fbq`. Le module entier peut etre supprime.

### 5. `src/components/CookieConsentBanner.tsx` -- Supprimer l'import Meta

- Supprimer l'import `{ grantMetaConsent } from '@/lib/meta-pixel'` (ligne 5)
- Supprimer l'appel `grantMetaConsent()` dans `handleAccept` (ligne 27)
- Le TikTok consent (`grantTikTokConsent()`) reste inchange

### 6. `src/pages/Test24hActive.tsx` -- Remplacer trackMetaEventWithRetry par appel direct

- Supprimer l'import `{ trackMetaEventWithRetry } from '@/lib/meta-pixel'` (ligne 6)
- Remplacer `trackMetaEventWithRetry('CompleteRegistration')` par `(window as any).fbq && (window as any).fbq('track', 'CompleteRegistration')`
- Le reste (setTimeout 2000ms, sessionStorage guard, clearTimeout) reste identique

### NouveauMandat.tsx -- Aucun changement

Le code actuel (lignes 381-386) utilise deja `(window as any).fbq` directement. Il est parfaitement compatible avec le nouveau systeme.

## Fichiers modifies

| Fichier | Action |
|---|---|
| `index.html` | Ajout snippet Meta Pixel dans `<head>` |
| `src/App.tsx` | Suppression MetaPixelProvider + ajout PageView dans AppContent |
| `src/components/MetaPixelProvider.tsx` | Suppression du fichier |
| `src/lib/meta-pixel.ts` | Suppression du fichier |
| `src/components/CookieConsentBanner.tsx` | Suppression import/appel grantMetaConsent |
| `src/pages/Test24hActive.tsx` | Remplacement trackMetaEventWithRetry par fbq direct |

## Pourquoi ca fonctionne

- Le snippet HTML est charge par le navigateur AVANT React -- il ne depend d'aucun state, consent, guard ou lifecycle React
- `fbq` est disponible globalement sur `window` des le premier rendu
- Les navigations SPA declenchent un `PageView` via le `useEffect` dans `AppContent`
- Le `Lead` dans `NouveauMandat.tsx` et le `CompleteRegistration` dans `Test24hActive.tsx` appellent `window.fbq` directement -- zero dependance a un module intermediaire
- Plus aucun guard (`__META_PIXEL_INIT`, `document.getElementById`, consent check) ne peut bloquer l'initialisation

## Note sur le GDPR

Le snippet dans `index.html` charge le pixel inconditionnellement (sans attendre le consentement cookies). Si la conformite GDPR stricte est requise, il sera possible d'ajouter un systeme de consentement plus tard. Pour l'instant, la priorite est de retablir le tracking et de debloquer l'optimisation Meta Ads.

