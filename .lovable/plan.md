

# Plan : afficher la source du lead dans `/admin/leads`

## Constat

La table `leads` stocke déjà tout ce qu'il faut :

- `source` (ex. `landing_quickform`, `landing_analyse_dossier`, `formulaire_vendeur_complet`, `meta_lead_ads`, etc.)
- `utm_source` (ex. `facebook`, `tiktok`, `google`, `instagram`)
- `utm_medium` (ex. `cpc`, `paid`, `social`)
- `utm_campaign` (ex. `chercheur_geneve_avril`)

Mais sur la page `/admin/leads`, **aucune de ces infos n'est visible**. La colonne "Recherche" affiche juste le `formulaire` (interne), pas la source d'acquisition. Impossible de savoir d'un coup d'œil si un lead vient de Facebook Ads, TikTok, Google Ads, ou directement du site.

## Objectif

Afficher pour chaque lead, dans la liste et dans le détail, **un badge "Source"** lisible et coloré :

```text
🟦 Facebook Ads      🟪 TikTok Ads     🟩 Google Ads
🟧 Instagram         ⚫ Direct          🟨 Meta Lead Ads
🔵 Référent          ⚪ Inconnu
```

## Logique de dérivation de la source

Créer un utilitaire `src/lib/lead-source.ts` qui prend un lead et renvoie `{ label, color, icon }` selon cette priorité :

```text
1. utm_source = 'facebook'  | utm_medium contient 'meta'  → Facebook Ads
2. utm_source = 'instagram'                                → Instagram Ads
3. utm_source = 'tiktok'                                   → TikTok Ads
4. utm_source = 'google'    | utm_medium = 'cpc'           → Google Ads
5. source = 'meta_lead_ads'                                → Meta Lead Ads (formulaire natif)
6. source = 'formulaire_vendeur_complet'                   → Formulaire Vendeur
7. source contient 'landing'                               → Landing directe
8. utm_source défini mais non listé                        → utm_source en clair
9. Sinon                                                   → Direct
```

Affichage : badge couleur + petite ligne en-dessous avec `utm_campaign` si présent (ex. `chercheur_geneve_avril`), pour permettre l'analyse fine sans surcharger.

## Modifications

### 1. Nouveau fichier : `src/lib/lead-source.ts`

Fonction pure `getLeadSource(lead)` retournant `{ key, label, badgeClass, icon }`. Couleurs alignées sur les guidelines (semantic tokens, pas de couleurs hardcodées dans Tailwind direct).

### 2. `src/pages/admin/Leads.tsx`

- Étendre le type `Lead` avec `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.
- Ajouter une **nouvelle colonne "Source"** entre "Recherche" et "Qualification" (ou regrouper dans "Recherche" si trop large à 1329px). Recommandation : nouvelle colonne dédiée, c'est l'info clé demandée.
- Header : `<TableHead>Source</TableHead>` (colSpan empty rows passe de 6 à 7).
- Cellule : badge `getLeadSource(lead).label` + sous-ligne discrète `utm_campaign` si présent.
- Ajouter un **filtre "Source"** dans la barre de filtres (à côté de "Tous les formulaires") : Toutes / Facebook Ads / TikTok / Google Ads / Instagram / Direct / Autre.
- Mettre à jour `exportCSV` pour inclure les colonnes `source`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`.

### 3. Détail du lead (dialog notes existant)

Ajouter en haut du dialog une petite section "Origine" :

```text
Source       : Facebook Ads
Campagne     : chercheur_geneve_avril
Medium       : cpc
Contenu      : ad_variant_3
Formulaire   : landing_quickform
```

Affiche uniquement les champs non null.

## Validation

1. Un lead avec `utm_source='facebook'` affiche un badge bleu **Facebook Ads**.
2. Un lead avec `utm_source='tiktok'` affiche un badge **TikTok Ads**.
3. Un lead sans aucun UTM affiche **Direct**.
4. Le filtre "Source" filtre correctement la liste.
5. L'export CSV contient les colonnes UTM.
6. Le dialog détail affiche le bloc "Origine" avec les valeurs disponibles.
7. Aucune régression sur les colonnes existantes.

## Fichiers modifiés

```text
src/lib/lead-source.ts           (NOUVEAU — utilitaire de dérivation)
src/pages/admin/Leads.tsx        (colonne Source + filtre + CSV + dialog)
```

Aucune modification base de données : les colonnes existent déjà dans `leads`.

