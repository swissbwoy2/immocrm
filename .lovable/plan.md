# Scanner Document — 100% Web App (PWA)

## Contexte
L'application est une **Web App** accessible depuis n'importe quel navigateur (Safari iOS, Chrome Android, desktop). **Aucune build native iOS/Android n'est utilisée.** Le scan doit donc fonctionner uniquement via les API web standards.

## Problèmes identifiés sur Safari iOS

1. **`getUserMedia` lancé dans `useEffect`** au montage du composant `WebDocumentScanner` → Safari iOS bloque l'accès caméra s'il n'est pas demandé suite à un **geste utilisateur direct** (clic). C'est la cause principale du blocage actuel.
2. **Aucun fallback** : si Safari refuse `getUserMedia` (permission, contexte non sécurisé, iframe), l'utilisateur reste coincé sur un écran d'erreur.
3. **`<input capture="environment">` non utilisé** : c'est pourtant LA méthode la plus fiable sur iOS Safari — elle ouvre directement l'app Appareil photo système du téléphone, sans passer par `getUserMedia`.
4. **Code Capacitor résiduel** dans `useDocumentScanner.ts` (`@capacitor/camera`) → inutile en contexte web pur, ajoute du poids et peut générer des warnings.

## Stratégie : approche « Safari-first » 100% web

### A. Refonte de `WebDocumentScanner.tsx`
- **Supprimer le `useEffect` qui démarre la caméra au montage**.
- Afficher d'abord un écran d'accueil avec **2 gros boutons** :
  - 📷 **"Utiliser l'appareil photo du téléphone"** → déclenche `<input type="file" accept="image/*" capture="environment">` (méthode native iOS/Android, ultra fiable).
  - 🎥 **"Scanner avec la caméra (mode avancé)"** → tente `getUserMedia` UNIQUEMENT après ce clic (geste utilisateur explicite, requis par Safari).
- Détecter iOS Safari et **mettre en avant le bouton "Appareil photo"** par défaut (plus fiable).
- Gestion d'erreurs explicites : `NotAllowedError` → message "Autorisez la caméra dans Réglages Safari", `NotFoundError` → "Aucune caméra détectée", `NotReadableError` → "Caméra utilisée par une autre app".

### B. Nouveau flux recto/verso unifié
Pour `piece_identite` et `permis_sejour` (les seuls types nécessitant 2 pages) :
- Étape 1 : "Capturez le **RECTO**" → input capture ou getUserMedia → preview → Valider/Reprendre
- Étape 2 : "Capturez le **VERSO**" → idem → preview → Valider/Reprendre
- Étape 3 : Fusion automatique en 1 seul PDF via `pdf-lib` (déjà en place) → upload.

Pour tous les autres documents : 1 seule capture → PDF mono-page → upload.

### C. Nettoyage `useDocumentScanner.ts`
- Retirer l'import `@capacitor/camera` et toute la logique Capacitor.
- Garder uniquement : `enhanceScan` (canvas contraste/luminosité) + `mergePagesToPdf` (pdf-lib).
- Optionnel : retirer la dépendance `@capacitor/camera` du `package.json` (sera fait à l'implémentation).

### D. Détection d'environnement robuste
Ajouter un util `src/utils/cameraSupport.ts` :
```ts
export const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent);
export const hasGetUserMedia = !!(navigator.mediaDevices?.getUserMedia);
export const isSecureContext = window.isSecureContext;
export const isInIframe = window.self !== window.top;
```
Utilisé pour :
- Masquer le bouton "Mode avancé" si `getUserMedia` indisponible.
- Avertir l'utilisateur s'il est dans une iframe non sécurisée (preview Lovable) et l'inviter à utiliser le **domaine publié** (logisorama.ch).

### E. UX mobile (viewport 600x834 actuel)
- Boutons pleine largeur, min-height 56px (touch target iOS).
- Preview image en `object-contain`, max-height `60vh`.
- Indicateur d'étape "Page 1/2" pour recto/verso.
- Boutons « Reprendre » et « Valider » bien séparés en bas (safe area iOS).

## Fichiers modifiés

| Fichier | Action | Détail |
|---|---|---|
| `src/utils/cameraSupport.ts` | **Créer** | Détection iOS Safari, getUserMedia, secure context, iframe |
| `src/components/scanner/WebDocumentScanner.tsx` | **Réécrire** | Écran d'accueil 2 boutons, getUserMedia après clic uniquement, fallback `<input capture>`, gestion erreurs Safari |
| `src/components/scanner/UniversalDocumentScanner.tsx` | **Modifier** | Supprimer la logique Capacitor, router systématiquement vers WebDocumentScanner, gérer flux recto/verso séquentiel |
| `src/hooks/useDocumentScanner.ts` | **Nettoyer** | Retirer `@capacitor/camera`, garder `enhanceScan` + `mergePagesToPdf` |
| `src/components/scanner/DocumentUploadField.tsx` | **Ajuster** | Petit message d'aide iOS Safari sous le bouton "Scanner" |

## Comportement attendu après correctif

| Plateforme | Bouton "Scanner" | Résultat |
|---|---|---|
| **Safari iOS** (iPhone) | Ouvre écran avec 2 options. "Appareil photo téléphone" mis en avant → ouvre app Photos native → photo → preview → valider | ✅ Fonctionne 100% |
| **Chrome Android** | Idem, mais "Mode avancé" mis en avant (getUserMedia stable) | ✅ Fonctionne 100% |
| **Desktop Chrome/Firefox/Edge** | "Mode avancé" → getUserMedia → flux webcam classique | ✅ Fonctionne |
| **Preview Lovable (iframe)** | Avertissement "Pour scanner, ouvrez l'app sur logisorama.ch" + fallback `<input capture>` quand même tenté | ✅ Dégradé propre |

## Ce qui ne change pas
- Configuration `documentTypes.ts` (recto/verso uniquement pour `piece_identite` + `permis_sejour`).
- Logique de fusion PDF via `pdf-lib`.
- Intégration dans `MandatV3Step4Documents.tsx`.
- Le bouton "Téléverser" classique reste inchangé.

## Question ouverte
Une fois ce fix Safari validé, je propose d'enchaîner avec l'extension du `DocumentUploadField` aux autres pages (`client/Documents.tsx`, `CandidateDocumentsSection.tsx`, `agent/ClientDetail.tsx`, `admin/ClientDetail.tsx`). À confirmer après validation du scanner.
