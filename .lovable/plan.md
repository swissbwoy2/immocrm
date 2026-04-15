

# Mini-recette complémentaire — Plan ajusté

## Réponses aux 3 points

### 1. Format de fichier
**Confirmé** : `renovation-analyze-quote` supporte `text/plain`. Le code (lignes 89-104) fait un fallback explicite : si le fichier n'est ni PDF ni image, il lit le contenu en texte brut via `.text()` et l'envoie directement à l'IA. Le format texte structuré est donc un happy path valide, pas un contournement.

### 2. Comparabilité réelle
Les 2 devis porteront sur le **même périmètre** : rénovation complète d'une salle de bain. Mêmes catégories (demolition, plomberie, peinture_revetements, menuiserie_int, electricite, divers), postes comparables, avec des écarts de prix réalistes entre les deux entreprises. Cela garantit que `renovation-compare-quotes` produira une comparaison catégorie par catégorie exploitable.

### 3. Seed/cleanup sans migration
Les 2 entreprises de test seront insérées via `supabase--read_query` (INSERT) ou directement via les Edge Functions existantes. Le cleanup final utilisera un DELETE ciblé via le même outil. **Aucune migration SQL** ne sera créée.

---

## Séquence d'exécution

### Étape 1 — Préparation
1. Créer un projet test via `renovation-create-project`
2. Insérer 2 entreprises via INSERT SQL direct (pas de migration)
3. Uploader 2 fichiers texte structurés (devis concurrents salle de bain) via `renovation-create-upload` + upload storage + `renovation-register-upload`
4. Créer 2 devis liés aux fichiers via `renovation-create-quote`

### Étape 2 — Test `renovation-analyze-quote`
- Analyser les 2 devis → attendu : 200 + `item_count > 0` + `summary.montant_ht`

### Étape 3 — Test `renovation-compare-quotes`
- Comparer les 2 devis analysés → attendu : 200 + comparaison par catégorie avec écarts

### Étape 4 — Test `renovation-generate-final-report`
- 1er appel → attendu : 200 + génération HTML
- 2e appel sans `force` → attendu : 200 + `cached: true`

### Étape 5 — Cleanup
- DELETE ciblé via SQL direct : projet test, quotes, items, files, jobs, companies test, audit logs

### Livrables
- Résultat observé par cas (status HTTP + payload clé)
- Confirmation cleanup
- Statut final Lot 4

