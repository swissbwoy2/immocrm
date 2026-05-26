## Problème

L'import CSV (page **Campagnes de suivi** → bouton Importer) filtre actuellement de manière stricte :

- Garde uniquement les lignes dont `Formulaire` contient `logisorama` → **toutes les autres lignes sont rejetées silencieusement** (compteur "rejetés formulaire").
- Force `campaign_key = "location"` côté Edge Function.

Conséquence : les lignes du CSV dont le formulaire est `vendeurs vs Acheteurs atifs-copy`, `vendeurs vs Acheteurs atifs-copy-copy`, etc. sont **rejetées** et ne sont jamais rattachées à la campagne `vente`.

## Objectif

Détecter automatiquement le type de lead à partir de la colonne `Formulaire` du CSV et le rattacher à la bonne campagne, sans toucher au reste du flux (filtre Étape = Qualifié, dédup, ré‑attache, Edge Function `import-leads-csv` inchangée).

## Règles de mapping

Sur la valeur normalisée (lowercase, sans accents) de la colonne `Formulaire` :

| Motif détecté                          | Campagne cible |
|----------------------------------------|----------------|
| Contient `logisorama`                  | `location`     |
| Contient `vendeur` **ou** `acheteur`   | `vente`        |
| Autre                                  | Rejeté         |

(Le motif `vendeurs vs Acheteurs` couvre les deux mots-clés, donc tout `…-copy`, `…-copy-copy`, etc. est capté.)

Le filtre `Étape = Qualifié` reste appliqué aux deux types.

## Changements

**Fichier unique : `src/pages/admin/CampagnesSuivi.tsx`** — fonction `handleImport` :

1. Pour chaque ligne, classer en `location` / `vente` / rejet selon la règle ci-dessus au lieu du test booléen `isLogisorama`.
2. Constituer **deux tableaux** `parsedLocation` et `parsedVente`.
3. Appeler `supabase.functions.invoke("import-leads-csv", …)` **une fois par campagne non vide**, en passant le bon `campaign_key` (`location` ou `vente`). L'Edge Function gère déjà la ré‑attache d'un email existant vers une autre `campaign_key`, donc aucun changement backend nécessaire.
4. Agréger les compteurs (`inserted`, `reattached`, `duplicates`, `errors`) des deux appels dans un seul toast récap qui détaille :
   - Nouveaux Location / Vente
   - Ré‑attachés Location / Vente
   - Doublons
   - Rejetés (formulaire inconnu, étape ≠ Qualifié, email invalide)
5. Mettre à jour le texte du `Dialog` d'import pour expliquer que **Logisorama → Location** et **Vendeurs vs Acheteurs → Vente** sont acceptés.

## Hors-scope

- Aucune migration SQL.
- Aucune modification de l'Edge Function `import-leads-csv`.
- Aucune modification des autres campagnes (`achat`, `renovation`).
- Aucun changement de la logique d'envoi des emails de relance.
