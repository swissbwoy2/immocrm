
# Correction du bug de tracking UTM

## Probleme identifie

Le test end-to-end a revele que **les parametres UTM ne sont jamais enregistres** dans la base de donnees. Le lead de test soumis avec `?utm_source=facebook&utm_medium=cpc&utm_campaign=trafic_logis` a ete enregistre avec tous les champs UTM a `null`.

Verification en base : **aucun lead n'a jamais eu de donnees UTM** -- le bug existe depuis la mise en place.

### Cause technique

Le hook `useUTMParams.ts` a une "race condition" (probleme de timing) :

```text
Ordre d'execution :
1. useMemo() --> lit sessionStorage (vide) --> retourne null, null, null...
2. useEffect() --> lit l'URL --> sauve dans sessionStorage
3. useMemo() ne se re-execute JAMAIS (pas de dependance qui change)
```

Le `useMemo` lit le `sessionStorage` avant que le `useEffect` n'y ecrive les valeurs. Et comme `useMemo` n'a aucune dependance dynamique, il ne se re-execute jamais apres la sauvegarde.

## Correction

Remplacement de `useMemo` + `useEffect` par `useState` + `useEffect` pour garantir un re-rendu apres la capture des UTM :

**Fichier modifie** : `src/hooks/useUTMParams.ts`

### Nouveau fonctionnement :

```text
1. useState() --> lit sessionStorage (vide au 1er visit) --> valeurs initiales
2. useEffect() --> lit l'URL --> sauve dans sessionStorage --> met a jour le state
3. Le composant se re-rend avec les bonnes valeurs UTM
```

Le `useState` + `useEffect` combinaison garantit que :
- Les UTM sont captures depuis l'URL des l'arrivee
- Le state se met a jour, declenchant un re-rendu
- Quand le formulaire est soumis, les valeurs sont disponibles

### Aucun autre fichier ne change

Les composants `QuickLeadForm.tsx`, `DossierAnalyseSection.tsx` et `FormulaireVendeurComplet.tsx` utilisent deja `utmParams.utm_source`, etc. -- seul le hook interne change.

## Verification apres correction

Je relancerai le test complet :
1. Ouvrir la page avec `?utm_source=facebook&utm_medium=cpc&utm_campaign=trafic_logis`
2. Soumettre un formulaire
3. Verifier en base que les 3 champs UTM sont remplis
