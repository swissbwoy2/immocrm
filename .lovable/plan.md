# Plan : Extraction IA automatique des extraits de poursuites

## 1. Correction de l'erreur TypeScript (bloquant le build)

**Fichier**: `supabase/functions/extract-poursuites-date/index.ts` (ligne 101)

Le SELECT ne récupère pas la colonne `type` du document, donc `doc.type` casse le typage.
→ Remplacer la ligne référençant `doc.type` par `"application/pdf"` directement (tous les extraits sont des PDF, et l'API Gemini attend un MIME standard).

```ts
const mime = "application/pdf";
```

## 2. Refonte de la logique d'extraction : auto-scan par type

**Constat actuel** : la fonction `extract-poursuites-date` exige `document_id` en input → l'utilisateur doit sélectionner manuellement un document.

**Nouveau comportement** : la fonction prend uniquement `client_id` et :
1. Récupère **tous les documents** du client où `type_document = 'extrait_poursuites'`, triés par `date_upload DESC`.
2. Itère du plus récent au plus ancien.
3. Pour chaque PDF, appelle Gemini 2.5 Flash pour extraire la date d'émission.
4. Garde la **date la plus récente trouvée** (parmi tous les extraits valides).
5. Sauvegarde dans `clients.extrait_poursuites_date_emission` avec `extraction_method = 'ai_auto_scan'` et le `document_id` du PDF qui a fourni la date la plus récente.

**Avantage** : zéro action utilisateur. Dès qu'un extrait est uploadé (peu importe par qui), un trigger ou un appel automatique met à jour la date.

## 3. Déclenchement automatique

Deux points d'entrée :

**A. À l'upload d'un nouveau document `extrait_poursuites`** :
- Modifier le hook d'upload côté frontend (composant qui gère l'ajout de documents) pour appeler `extract-poursuites-date` automatiquement après un upload réussi avec `type_document === 'extrait_poursuites'`.
- Toast de feedback : "Date d'émission détectée automatiquement : 12/03/2026 (confiance 95%)".

**B. Cron quotidien** :
- Étendre le cron `poursuites-reminders-daily` (déjà actif à 10h Zurich) pour scanner d'abord les clients dont `extrait_poursuites_date_emission IS NULL` mais qui ont au moins 1 document `extrait_poursuites` en base → lancer l'extraction IA automatiquement avant d'envoyer les rappels.

## 4. Simplification UI

- Retirer le bouton "Sélectionner un document" du composant `ExtractPoursuitesUploadDialog.tsx`.
- Ne garder que :
  - Bouton "Lancer l'analyse IA des extraits" (si des extraits existent déjà en base sans date détectée).
  - Bouton "Saisir la date manuellement" (fallback).
- Afficher la liste des extraits déjà analysés avec leur date détectée et leur badge de fraîcheur (vert/jaune/rouge).

## 5. Tests post-déploiement

1. Déployer `extract-poursuites-date` corrigée.
2. Lancer un appel `curl` sur le client courant (`f1b90290-c2c4-4b18-9b9a-feb180ab43da`) pour vérifier l'auto-scan.
3. Vérifier les logs : nombre d'extraits scannés, date retenue, confiance IA.
4. Vérifier en base : `clients.extrait_poursuites_date_emission` mis à jour.
5. Lancer un backfill manuel sur les ~66 extraits existants pour initialiser les dates des clients concernés.

## Fichiers impactés

- `supabase/functions/extract-poursuites-date/index.ts` — refonte (auto-scan + fix TS)
- `src/components/ExtractPoursuitesUploadDialog.tsx` — simplification UI
- Composant d'upload de documents (à identifier précisément lors de l'implémentation) — déclenchement auto post-upload
- `supabase/functions/send-document-update-reminders/index.ts` — étape pré-rappel : scan IA des clients sans date

## Question

L'extraction IA prend ~3-5 secondes par PDF. Sur un client avec 5 extraits historiques, le scan complet prend ~20s. **Préférences** :
- **A** : Scanner uniquement le **dernier extrait** uploadé (rapide, 1 appel IA, suffit dans 99% des cas car on veut la date la plus récente).
- **B** : Scanner **tous les extraits** du client et garder la date max (lent mais robuste si un extrait récent est mal nommé/désordonné).

Je recommande **A** (le plus récent par `date_upload`), avec fallback sur les précédents uniquement si l'IA échoue. OK ?
