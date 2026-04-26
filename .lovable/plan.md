# Scanner natif universel + recto/verso pour TOUS les documents

## Choix utilisateur
- **Portée** : TOUS les types de documents (pièce identité, permis, fiche salaire, extrait poursuites, attestation employeur, autres)
- **Technologie** : Scanner natif Capacitor (haute qualité mobile) + fallback web
- **Lieux** : TOUS les points d'upload de l'app

---

## 1. Plugin Capacitor scanner

Installation `@capacitor-mlkit/document-scanner` (Google ML Kit) :
- iOS + Android natif → recadrage auto, correction perspective, amélioration contraste
- Sortie multi-pages → PDF directement
- Fallback web : composant `WebDocumentScanner` (getUserMedia + canvas)

## 2. Composant central `UniversalDocumentScanner`

**Nouveau fichier :** `src/components/scanner/UniversalDocumentScanner.tsx`

Props :
```typescript
{
  documentType: string;          // piece_identite, fiche_salaire, etc.
  requireRectoVerso: boolean;    // true par défaut, configurable selon type
  onComplete: (file: File) => Promise<void>;
}
```

Flow :
1. Détection plateforme via `Capacitor.isNativePlatform()`
2. **Native** → ML Kit DocumentScanner (multi-pages → PDF)
3. **Web** → Dialog avec caméra `getUserMedia` + canvas (recadrage manuel + amélioration contraste)
4. Si `requireRectoVerso` : étapes guidées "Recto" puis "Verso", validation des 2 captures avant fusion PDF via `pdf-lib`

## 3. Hook `useDocumentScanner`

**Nouveau fichier :** `src/hooks/useDocumentScanner.ts`

Centralise :
- Détection plateforme
- Appel ML Kit ou WebRTC
- Optimisation image (canvas : contraste, balance des blancs, redimensionnement A4)
- Fusion PDF multi-pages
- Retour `File` final prêt à uploader

## 4. Composant `DocumentUploadField` unifié

**Nouveau fichier :** `src/components/scanner/DocumentUploadField.tsx`

Remplace tous les `<input type="file">` actuels. Affiche 2 boutons :
- **📷 Scanner** (ouvre `UniversalDocumentScanner`)
- **📁 Téléverser fichier** (input classique avec validation recto/verso si applicable)

Pour l'upload classique recto/verso : exige 2 fichiers (PDF, JPG, PNG) puis fusion `pdf-lib`.

## 5. Configuration recto/verso par type

**Nouveau fichier :** `src/config/documentTypes.ts`

```typescript
export const DOCUMENT_REQUIRES_RECTO_VERSO: Record<string, boolean> = {
  piece_identite: true,
  permis_sejour: true,
  permis_conduire: true,
  fiche_salaire: true,        // recto/verso si 2 pages
  extrait_poursuites: true,
  attestation_employeur: true,
  autre: false,                // optionnel
};
```

L'utilisateur peut "skip verso" pour types facultatifs via bouton secondaire.

## 6. Fichiers modifiés (intégration `DocumentUploadField`)

**Côté client :**
- `src/pages/client/Documents.tsx`
- `src/pages/client/OffresRecues.tsx` (candidatures)
- `src/components/CandidateDocumentsSection.tsx`
- `src/components/DocumentUpdateReminder.tsx`
- `src/components/ExtraitPoursuitesHeroCard.tsx`

**Côté agent/admin :**
- `src/pages/agent/ClientDetail.tsx`
- `src/pages/admin/ClientDetail.tsx`
- `src/pages/admin/SuiviExtraitsPoursuites.tsx`

**Mandat V3 :**
- `src/components/mandat-v3/MandatV3Step4Documents.tsx`

**Autres formulaires d'upload détectés :**
- `src/pages/admin/ImmeubleDetail.tsx` (docs propriété)
- Tous les `<input type="file" accept=".pdf,...">` à remplacer par `<DocumentUploadField>`

## 7. Capacitor config

**Modifié :** `capacitor.config.ts` → ajout du plugin DocumentScanner
**Modifié :** `package.json` → `@capacitor-mlkit/document-scanner` (ou `capacitor-document-scanner`)

iOS : permission `NSCameraUsageDescription` déjà présente
Android : permission `CAMERA` à vérifier dans `AndroidManifest.xml`

## 8. Sur le web (préview Lovable)

Le plugin natif n'étant pas dispo, fallback automatique vers `WebDocumentScanner` :
- `getUserMedia({ video: { facingMode: 'environment' } })`
- Capture canvas → amélioration contraste/luminosité (filtre CSS + canvas)
- Détection bords basique (optionnel via OpenCV.js trop lourd → on laisse l'utilisateur cadrer)
- Multi-pages → PDF via `pdf-lib`

## 9. Validation backend

Aucun changement DB. Le PDF fusionné est uploadé comme un seul document via les flux existants (`mandate-update-draft`, table `documents`, etc.).

---

## Récapitulatif fichiers

**Créés (5) :**
- `src/components/scanner/UniversalDocumentScanner.tsx`
- `src/components/scanner/DocumentUploadField.tsx`
- `src/components/scanner/WebDocumentScanner.tsx`
- `src/hooks/useDocumentScanner.ts`
- `src/config/documentTypes.ts`

**Modifiés (~10) :** tous les points d'upload listés ci-dessus + `capacitor.config.ts` + `package.json`

**Aucune migration DB requise.**
