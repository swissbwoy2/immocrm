## 🎯 Objectif

Transformer la **photo** capturée (caméra système ou getUserMedia) en un **vrai rendu scan** : document automatiquement détecté, redressé en rectangle parfait, et passé en filtre noir & blanc type photocopie — sans rien changer au flux recto/verso ni à l'UX existante.

---

## 🧩 Stack proposée : `jscanify`

- **Lib** : [`jscanify`](https://github.com/puffinsoft/jscanify) (MIT, ~50 KB + OpenCV.js ~8 MB chargé en CDN à la demande)
- **Fonctionne** : 100% navigateur, pas de backend, compatible Safari iOS / Chrome Android / desktop
- **Capacités** :
  1. `findPaperContour(img)` → détecte les 4 coins du document
  2. `extractPaper(img, w, h)` → redresse en perspective (warp)
  3. `highlightPaper(img)` → encadre le doc en vert (overlay live)
  4. Filtre custom canvas pour passage en N&B contrasté

---

## 📦 Changements proposés

### 1. Nouveau fichier `src/utils/documentScanFilter.ts`
Charge OpenCV.js + jscanify à la demande (lazy), expose 2 fonctions :
- `enhanceToScan(dataUrl)` → photo brute → PDF-ready scan (auto-crop + redressement + N&B)
- `loadJscanify()` → singleton qui charge OpenCV.js depuis CDN une seule fois

```typescript
// Pseudo
export async function enhanceToScan(dataUrl: string): Promise<string> {
  const scanner = await loadJscanify(); // charge opencv.js si absent
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  // 1. Détection des 4 coins
  const contour = scanner.findPaperContour(img);
  // 2. Si trouvé → extractPaper (redressement perspective)
  // 3. Sinon → fallback sur l'image brute
  const warped = contour
    ? scanner.extractPaper(img, A4_WIDTH, A4_HEIGHT, contour)
    : img;
  // 4. Filtre N&B contrasté (canvas filter)
  return applyBlackWhiteFilter(warped);
}
```

### 2. Modifier `src/hooks/useDocumentScanner.ts`
Remplacer la fonction `enhanceScan` (qui ne fait que contraste + luminosité basique) par un appel à `enhanceToScan`. Garder la même signature pour ne rien casser ailleurs.

### 3. Modifier `src/components/scanner/WebDocumentScanner.tsx`
- Après chaque capture (caméra système OU live), passer le `dataUrl` dans `enhanceToScan` avant d'ajouter à `pages`.
- Afficher un loader "Traitement scan…" pendant le warp (1-2s sur mobile).
- En cas d'échec de détection des coins → garder la photo brute et notifier discrètement ("Détection auto échouée, image conservée telle quelle").

### 4. Option UI (mode live uniquement)
Dans le mode "Scan en direct" (`getUserMedia`), superposer un overlay vert dessiné par `highlightPaper` qui suit les contours du document en temps réel — comme CamScanner. **Optionnel**, à activer dans une 2e itération si la perf est OK.

---

## ⚙️ Détails techniques

| Aspect | Choix |
|---|---|
| Chargement OpenCV.js | CDN `https://docs.opencv.org/4.x/opencv.js` (~8 MB), lazy au 1er scan |
| Cache | `<script>` ajouté au DOM, singleton via Promise mémorisée |
| Fallback | Si OpenCV ne charge pas (offline, CSP) → garder le filtre actuel `contrast(1.15) brightness(1.05)` |
| Format de sortie | JPEG quality 0.92 (inchangé), dimensions A4 ratio (1240×1754 @ 150 DPI) |
| Compat Safari iOS | ✅ OpenCV.js fonctionne, testé largement |

---

## ✅ Résultat attendu

**Avant** : photo de l'ID inclinée sur la table avec fond visible, contraste légèrement boosté.

**Après** : document redressé occupant toute la page, fond noir/blanc supprimé, texte net comme une photocopie → vrai rendu "scan".

---

## 📋 Fichiers touchés

- ✏️ **Créer** : `src/utils/documentScanFilter.ts`
- ✏️ **Modifier** : `src/hooks/useDocumentScanner.ts` (fonction `enhanceScan`)
- ✏️ **Modifier** : `src/components/scanner/WebDocumentScanner.tsx` (appel post-capture + loader)

**Aucun changement** sur :
- `DocumentUploadField.tsx`
- `UniversalDocumentScanner.tsx`
- Logique recto/verso
- Config `documentTypes.ts`

---

## ❓ Question complémentaire

L'overlay vert "live" (suivi des bords en temps réel pendant le streaming caméra) demande un peu plus de travail et peut impacter les perfs sur vieux iPhones. Je propose de le **garder pour une v2** si tu valides d'abord la qualité du rendu sur capture simple. OK ?
