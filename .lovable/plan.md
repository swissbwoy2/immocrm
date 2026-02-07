

# Fix: Delai 2000ms avant le tracking Lead sur /inscription-validee

## Modification unique : `src/pages/InscriptionValidee.tsx`

Le `useEffect` de tracking Meta Pixel est modifie pour ajouter un `setTimeout` de 2000ms avant l'envoi de l'evenement Lead.

### Changements precis (lignes 14-22 du fichier actuel)

Le bloc actuel :

```text
useEffect(() => {
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (consent === 'accepted' && !sessionStorage.getItem('meta_track_lead_inscription_validee')) {
    initMetaPixel(true);
    trackMetaEventWithRetry('Lead');
    sessionStorage.setItem('meta_track_lead_inscription_validee', '1');
    console.log('[InscriptionValidee] Meta Pixel Lead event queued');
  }
}, []);
```

Devient :

```text
useEffect(() => {
  const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (consent === 'accepted' && !sessionStorage.getItem('meta_track_lead_inscription_validee')) {
    initMetaPixel(true);
    const timeout = setTimeout(() => {
      trackMetaEventWithRetry('Lead');
      sessionStorage.setItem('meta_track_lead_inscription_validee', '1');
      console.log('[InscriptionValidee] Meta Pixel Lead event sent after delay');
    }, 2000);
    return () => clearTimeout(timeout);
  }
}, []);
```

### Points cles

- `initMetaPixel(true)` reste appele immediatement (cree la queue fbq de facon synchrone)
- Le tracking est differe de 2000ms (au lieu de 1500ms) pour couvrir les mobiles et reseaux lents
- `sessionStorage.setItem` est place DANS le setTimeout, apres l'envoi effectif
- `clearTimeout` dans le cleanup du `useEffect` pour eviter l'envoi si l'utilisateur quitte la page avant les 2 secondes
- `trackMetaEventWithRetry` ajoute en plus son propre polling de 500ms x 20 tentatives en backup

### Fichier modifie

| Fichier | Action |
|---|---|
| `src/pages/InscriptionValidee.tsx` | setTimeout 2000ms avant trackMetaEventWithRetry('Lead') + cleanup |

Aucun autre fichier n'est modifie. `meta-pixel.ts` et `Test24hActive.tsx` restent inchanges.

