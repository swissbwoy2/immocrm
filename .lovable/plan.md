

# Deplacer le Lead Meta Pixel sur le succes metier

## Le probleme

La page `/inscription-validee` a un countdown de 5 secondes avec redirection automatique vers `/login`. Le `setTimeout` de 2000ms pour le tracking Lead est en competition avec cette redirection. Si le composant est demonte (navigation), le `clearTimeout` annule l'envoi. Le Lead n'est donc jamais execute.

## La solution

Declencher le Lead au moment exact ou le backend confirme le succes de la soumission du mandat, dans `NouveauMandat.tsx`, juste avant le `navigate('/inscription-validee')`.

## Modifications

### 1. `src/pages/NouveauMandat.tsx` -- Ajouter le Lead au succes metier

A la ligne 380, juste avant `navigate('/inscription-validee')` (ligne 381), inserer :

```text
// Meta Pixel Lead conversion -- fired on successful mandate submission
const consent = localStorage.getItem('cookie-consent');
if (consent === 'accepted' && (window as any).fbq) {
  (window as any).fbq('track', 'Lead');
  console.log('[Meta Pixel] Lead fired on successful mandate submission');
}
```

Cet appel est :
- Synchrone (pas de setTimeout, pas de risque de demontage)
- Conditionne au consentement cookies (GDPR)
- Protege par le check `window.fbq` (pas d'erreur si le pixel n'est pas charge)
- Place APRES le succes backend complet (toast, localStorage cleanup)
- Place AVANT le `navigate()` (le pixel a le temps de s'executer)

### 2. `src/pages/InscriptionValidee.tsx` -- Supprimer tout le tracking Lead

- Supprimer l'import de `trackMetaEventWithRetry` (ligne 5)
- Supprimer le `useEffect` complet du tracking Meta (lignes 13-24)
- La page ne conserve que le countdown et la redirection

Le fichier final ne contient plus aucune reference a Meta Pixel.

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/pages/NouveauMandat.tsx` | Ajout `fbq('track', 'Lead')` a la ligne 380, avant navigate |
| `src/pages/InscriptionValidee.tsx` | Suppression complete du tracking Lead (import + useEffect) |

## Pourquoi ca fonctionne immediatement

- `fbq('track', 'Lead')` est un appel synchrone qui cree un pixel `<img>` dans le DOM
- Le navigateur envoie la requete HTTP immediatement, meme si un `navigate()` suit juste apres
- Pas de dependance a un timer, pas de risque de demontage React
- Le `MetaPixelProvider` a deja initialise le pixel au chargement de l'app

## Ce qui ne change pas

- `MetaPixelProvider` reste le seul point d'initialisation du pixel
- `Test24hActive.tsx` garde son tracking CompleteRegistration (pas de redirection auto sur cette page, le timer fonctionne)
- `meta-pixel.ts` reste inchange avec le guard `window.__META_PIXEL_INIT`

