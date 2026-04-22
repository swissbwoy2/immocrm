

# Affichage complet des données du formulaire dans le détail Lead Shortlist

## Constat

Les leads issus du formulaire **Analyse de dossier** (landing page) contiennent en base toutes les réponses du formulaire — mais le panneau de détail (`LeadDetailSheet`) n'en affiche qu'une fraction sous forme de mini-badges (« Salarié », « Pas de poursuites ») sans valeurs explicites ni libellés clairs.

**Champs présents en DB mais sous-exploités ou invisibles :**

| Champ DB | Affiché actuellement | À afficher |
|---|---|---|
| `localite` | ✅ (région) | déjà OK |
| `statut_emploi` | mini-badge "Salarié" | **Statut professionnel** explicite (Salarié / Indépendant / Étudiant / Retraité / Autre) |
| `permis_nationalite` | mini-badge "Permis B" | **Permis / Nationalité** avec libellé clair |
| `poursuites` | mini-badge "Pas de poursuites" | **Extrait de poursuites** : Oui / Non + montant si applicable |
| `a_garant` | mélangé dans badge poursuites | **Garant** : Oui / Non — visible séparément |
| `accord_bancaire` | ❌ absent du type TS, jamais affiché | **Accord bancaire** : Oui / Non (acheteurs) |
| `apport_personnel` | ❌ absent du type TS, jamais affiché | **Apport personnel** (acheteurs) |
| `type_bien` | ❌ absent du type TS, jamais affiché | **Type de bien recherché** |
| `budget` | mini-ligne | **Budget** dans bloc dédié |
| `type_recherche` | badge | déjà OK |

## Correctif

### 1. Compléter le type TypeScript `Lead`
**`src/components/admin/leads/types.ts`** — ajouter les 3 champs manquants :
```ts
accord_bancaire: boolean | null;
apport_personnel: string | null;
type_bien: string | null;
```

### 2. Refondre la section « Profil du candidat » dans `LeadDetailSheet`
**`src/components/admin/leads/LeadDetailSheet.tsx`** — remplacer la section "Qualification" actuelle (badges minuscules) par un bloc **« Détails du formulaire »** structuré en grille clé/valeur lisible, similaire à la section "Origine" existante :

```text
┌─ 📋 Réponses du formulaire ────────────────┐
│ Type de recherche      Louer               │
│ Type de bien           Appartement 3.5p    │
│ Région recherchée      Lausanne et environs│
│ Budget mensuel         2'500–3'000 CHF     │
│ ─────────────────────────────────────────── │
│ Statut professionnel   ✅ Salarié          │
│ Permis / Nationalité   ✅ Permis C         │
│ Extrait de poursuites  ✅ Aucune           │
│ Garant disponible      — Non concerné      │
│ Accord bancaire        ✅ Oui              │
│ Apport personnel       150'000 CHF         │
└────────────────────────────────────────────┘
```

- Chaque ligne : libellé à gauche (`text-muted-foreground`), valeur à droite (`font-medium`) avec icône colorée (✅ vert / ⚠️ ambre / ❌ rouge / — gris) selon la valeur.
- Affichage **conditionnel intelligent** :
  - Champs locataires (`statut_emploi`, `permis_nationalite`, `poursuites`, `a_garant`) → uniquement si `type_recherche = 'Louer'` ou `location`
  - Champs acheteurs (`accord_bancaire`, `apport_personnel`, `type_bien`) → uniquement si `type_recherche = 'Acheter'`
  - Une ligne ne s'affiche **jamais** si la valeur est `null` (pas de "non renseigné" parasite)
- Garder les mini-badges existants supprimés (remplacés par cette nouvelle vue plus lisible).

### 3. Mapping libellés humains
Petit helper `formatStatutEmploi`, `formatPermis`, etc. pour transformer les valeurs brutes (`'salarie'`, `'autre'`) en libellés FR (`'Salarié'`, `'Autre'`).

## Fichiers touchés

```text
[MOD] src/components/admin/leads/types.ts            (+3 champs : accord_bancaire, apport_personnel, type_bien)
[MOD] src/components/admin/leads/LeadDetailSheet.tsx (nouvelle section "Réponses du formulaire" remplaçant les mini-badges)
```

## Validation

1. Ouvrir un lead `landing_analyse_dossier` (locataire) → voir Statut, Permis, Poursuites, Garant en clair avec libellés
2. Ouvrir un lead acheteur → voir Type de bien, Budget, Accord bancaire, Apport personnel
3. Les champs `null` ne s'affichent pas (pas de bruit visuel)
4. Aucun appel DB modifié (les données étaient déjà fetchées avec `select("*")`)
5. Aucune régression sur la pipeline, les filtres, les actions, ou les notes

