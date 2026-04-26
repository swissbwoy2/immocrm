## Objectif
Ajouter un bouton "Scanner tous les clients" sur `/admin/suivi-extraits` qui lance l'IA en masse sur tous les clients actifs ayant un extrait uploadé mais sans date détectée, avec progression visuelle en temps réel.

## Diagnostic (confirmé via DB)
- **48 clients actifs**
- **33 ont un extrait uploadé**
- **1 seul a une date détectée** (le tien)
- **32 clients scannables immédiatement** par l'IA
- 15 clients sans extrait → rappel email uniquement

## Changements techniques

### 1. Nouvelle Edge Function `extract-poursuites-batch` (orchestrateur)
**Fichier** : `supabase/functions/extract-poursuites-batch/index.ts`
- **Input** : `{ mode: 'missing' | 'all', limit?: number }`
  - `missing` (défaut) : uniquement clients sans `extrait_poursuites_date_emission` mais avec extrait uploadé
  - `all` : re-scanner tous les clients ayant un extrait
- **Logique** :
  1. Auth admin/agent obligatoire (vérif via `user_roles`)
  2. Requête : tous les `clients` actifs avec au moins 1 `documents.type_document = 'extrait_poursuites'`
  3. Filtre selon mode (skip ceux ayant déjà une date si mode=missing)
  4. Boucle séquentielle avec délai 800ms entre appels (rate limit Lovable AI)
  5. Pour chaque client : appel direct de la fonction `extractFromPdf()` (refactor : extraite en module partagé)
  6. Mise à jour progressive en DB → frontend voit l'évolution via reload polling
  7. Retour : `{ ok, total, success, failed, skipped, results: [...] }`
- **Sécurité** : check role admin/agent via `user_roles`
- **Timeout Edge Function** : 150s max → ~30-40 clients par invocation à 3-5s/PDF (32 clients = OK en 1 appel)

### 2. Refactor `extract-poursuites-date/index.ts`
- Extraire la fonction `extractFromPdf()` dans `supabase/functions/_shared/extract-poursuites.ts` réutilisé par les 2 edge functions.

### 3. UI : `src/pages/admin/SuiviExtraitsPoursuites.tsx`
- **Nouveau bouton premium** dans la barre de filtres : `🚀 Scanner tous les manquants (32)` (compteur dynamique)
- **Dialog de confirmation** : "Cette opération va analyser X PDFs (~Y secondes). Continuer ?"
- **Pendant le scan** : 
  - Bouton remplacé par `Progress` bar + texte "Analyse en cours… (3/32)"
  - Désactivation des actions par ligne pendant le batch
- **Polling toutes les 5s** pendant que la fonction tourne → montre les dates détectées en temps réel
- **À la fin** : toast récapitulatif `✅ 28 dates détectées · ⚠️ 4 échecs`
- **Second bouton** : `Re-scanner tout` (mode `all`) pour rafraîchir les dates existantes

### 4. KPI enrichi
- Ajouter une 5ème card KPI : **"Scannables IA"** = clients avec extrait uploadé mais sans date.
- Distinguer "manquant (pas d'upload)" vs "scannable (upload OK, IA pas passée)".

## Garde-fous
- Confirmation obligatoire avant scan en masse (coût IA)
- Max 50 clients par invocation (sécurité timeout)
- Le scan n'écrase JAMAIS une `extraction_method = 'manual'` ou `'agent'` (saisie humaine prioritaire)
- Logs détaillés côté edge function

## Fichiers
- **Créer** : `supabase/functions/extract-poursuites-batch/index.ts`
- **Créer** : `supabase/functions/_shared/extract-poursuites.ts` (logique IA partagée)
- **Éditer** : `supabase/functions/extract-poursuites-date/index.ts` (utiliser le module partagé)
- **Éditer** : `src/pages/admin/SuiviExtraitsPoursuites.tsx` (bouton + dialog + progress + polling + nouveau KPI)