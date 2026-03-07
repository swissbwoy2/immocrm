

## Plan — Saisie manuelle du page_id avec tous les ajustements validés

### Fichier modifié : `src/pages/admin/MetaLeads.tsx`

### Changements

**Nouveaux states (lignes ~84) :**
- `manualPageId` — initialisé depuis `localStorage.getItem('meta_backfill_page_id') || ''`
- `detectedPageId: string | null`
- `showBackfillDialog: boolean`
- `checkingPageId: boolean`
- `pageIdError: string` — message d'erreur de validation

**Bouton "Synchroniser Meta" (lignes 227-246) :**
- Remplacer l'AlertDialog non contrôlé par un Dialog contrôlé via `showBackfillDialog`
- Le bouton lance un pré-check async : requête `meta_leads` pour détecter un `page_id`
- Résultat stocké dans `detectedPageId`, puis `showBackfillDialog = true`

**Contenu du dialog :**
- Si `detectedPageId` : afficher un badge vert "Page ID détecté : {detectedPageId}"
- Si pas de `detectedPageId` : afficher un `<Input>` avec :
  - `trim()` appliqué sur la valeur avant validation et stockage
  - Validation : `/^\d+$/` après trim — message d'erreur "Le Page ID doit contenir uniquement des chiffres" si invalide
  - Aide : "L'ID numérique de votre page Facebook qui reçoit les Lead Ads (visible dans les paramètres de la page)."
  - Bouton "Lancer l'import" désactivé si champ vide ou invalide
- `pageIdError` réinitialisé à `''` quand le dialog se ferme (`onOpenChange`)

**`handleBackfill` modifié :**
- Utilise `detectedPageId || manualPageId.trim()` comme `page_id`
- Sauvegarde dans `localStorage` après invocation réussie
- Reste de la logique (appel edge function, gestion erreurs, toasts) inchangé

**Reset propre à la fermeture du dialog :**
- `onOpenChange(false)` → `setPageIdError('')`, `setShowBackfillDialog(false)`

### Aucune modification backend

