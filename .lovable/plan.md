

# Correction : Le coursier ne voit pas les details de l'offre

## Problemes identifies

### 1. Politique de securite manquante (RLS) sur la table `offres`

La requete du coursier fait `select('*, offres(*)')`, mais la table `offres` n'a **aucune politique de lecture pour les coursiers**. Les politiques actuelles autorisent uniquement :
- Les admins
- Les agents (via `client_agents`)
- Les clients (via `clients.user_id`)

Resultat : Supabase retourne `offres: null` dans la jointure car le coursier n'a pas le droit de lire la table `offres`.

### 2. Noms de colonnes incorrects dans le code

Le code de `Missions.tsx` reference des colonnes qui n'existent pas :
- `contact_concierge` -- n'existe pas
- `contact_locataire` -- n'existe pas

Les vrais noms dans la table `offres` sont :
- `concierge_nom` + `concierge_tel`
- `locataire_nom` + `locataire_tel`

## Plan de correction

### Etape 1 : Ajouter une politique RLS sur la table `offres`

Creer une politique SELECT permettant aux coursiers de lire les offres liees a leurs missions (visites en attente ou acceptees).

```sql
CREATE POLICY "Coursiers peuvent voir offres de leurs missions"
  ON public.offres FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visites v
      JOIN coursiers c ON c.id = v.coursier_id
      WHERE v.offre_id = offres.id
      AND c.user_id = auth.uid()
      AND v.statut_coursier IN ('accepte', 'termine')
    )
    OR
    EXISTS (
      SELECT 1 FROM visites v
      WHERE v.offre_id = offres.id
      AND v.statut_coursier = 'en_attente'
      AND EXISTS (
        SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid()
      )
    )
  );
```

Cette politique permet au coursier de voir :
- Les offres des missions en attente (disponibles pour tous les coursiers)
- Les offres des missions qu'il a acceptees ou terminees

### Etape 2 : Corriger les noms de colonnes dans `Missions.tsx`

Modifier la section "Informations d'acces" (lignes 328-358) pour utiliser les bons noms de colonnes :

| Code actuel (incorrect) | Code corrige |
|-------------------------|-------------|
| `offres?.contact_concierge` | `offres?.concierge_nom` |
| `offres?.contact_locataire` | `offres?.locataire_nom` |

Et ajouter l'affichage des numeros de telephone (`concierge_tel`, `locataire_tel`) quand ils sont disponibles.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Ajout politique RLS sur `offres` pour les coursiers |
| `src/pages/coursier/Missions.tsx` | Correction des noms de colonnes + ajout numeros de tel |

## Resultat attendu

Le coursier pourra voir dans le detail de chaque mission :
- Les informations du bien (pieces, surface, prix, etage)
- La description et le lien d'annonce
- Le code d'immeuble
- Le nom et telephone du concierge
- Le nom et telephone du locataire actuel

