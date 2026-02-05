

# Correction du formulaire de leads shortlist

## Problème diagnostiqué

Le formulaire de la landing page échoue car le code tente d'insérer des données dans **4 colonnes qui n'existent pas** dans la table `leads` :

| Colonne manquante | Description |
|-------------------|-------------|
| `type_recherche` | "location" ou "achat" |
| `accord_bancaire` | Accord bancaire obtenu (oui/non) |
| `apport_personnel` | Montant de l'apport personnel |
| `type_bien` | Type de bien recherché (appartement, maison, etc.) |

Ces colonnes ont été ajoutées dans le code pour supporter le mode "Achat" sur la landing page, mais la migration de base de données correspondante n'a jamais été exécutée.

**Problème secondaire** : Les headers CORS de l'Edge Function `notify-new-lead` sont incomplets, ce qui peut causer des erreurs sur certains navigateurs.

---

## Solution proposée

### 1. Migration de base de données

Ajouter les 4 colonnes manquantes à la table `leads` :

```text
┌─────────────────────────────────────────────────────────────┐
│  ALTER TABLE leads ADD COLUMN type_recherche text;          │
│  ALTER TABLE leads ADD COLUMN accord_bancaire boolean;      │
│  ALTER TABLE leads ADD COLUMN apport_personnel text;        │
│  ALTER TABLE leads ADD COLUMN type_bien text;               │
└─────────────────────────────────────────────────────────────┘
```

### 2. Mise à jour de l'Edge Function

Mettre à jour les headers CORS de `notify-new-lead` pour inclure les nouveaux headers Supabase :

| Header actuel | Header corrigé |
|---------------|----------------|
| `authorization, x-client-info, apikey, content-type` | `authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version` |

---

## Fichiers à modifier

| Fichier | Action |
|---------|--------|
| **Migration SQL** | Ajouter les 4 colonnes manquantes à `leads` |
| `supabase/functions/notify-new-lead/index.ts` | Mettre à jour les headers CORS |

---

## Résultat attendu

Après ces modifications :
- Les prospects pourront soumettre le formulaire sans erreur
- Les leads seront correctement enregistrés avec leur type de recherche (location/achat)
- Les notifications email fonctionneront sans erreurs CORS

