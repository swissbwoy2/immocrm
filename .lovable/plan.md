
# Correction de la recursion infinie dans les politiques RLS

## Probleme identifie

Les logs de la base de donnees montrent des erreurs massives et repetees :

```
infinite recursion detected in policy for relation "visites"
infinite recursion detected in policy for relation "clients"
```

**Cause** : Les politiques RLS ajoutees precedemment pour les coursiers creent une boucle circulaire :

1. La politique sur `clients` pour les coursiers contient `EXISTS (SELECT FROM visites ...)`
2. Quand PostgreSQL evalue cette sous-requete sur `visites`, il declenche les politiques RLS de `visites`
3. La politique `"Agents multi peuvent gerer visites"` sur `visites` reference `clients` via `client_agents`
4. Cela declenche a nouveau les politiques RLS de `clients` --> boucle infinie

Ce probleme affecte **tous les utilisateurs** (pas seulement les coursiers) des qu'une requete joint `visites` et `clients`.

## Solution

Remplacer les politiques qui causent la recursion par des fonctions `SECURITY DEFINER` qui contournent les politiques RLS lors de leurs verifications internes.

### Etape 1 : Creer des fonctions SECURITY DEFINER

Ces fonctions s'executent avec les privileges du proprietaire, ce qui evite la recursion RLS.

```sql
-- Fonction pour verifier si un coursier a acces a un client
CREATE OR REPLACE FUNCTION public.is_coursier_for_client(_client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM visites v
    JOIN coursiers c ON c.user_id = auth.uid()
    WHERE v.client_id = _client_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id = c.id)
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;

-- Fonction pour verifier si un coursier a acces a un profil (via client)
CREATE OR REPLACE FUNCTION public.is_coursier_for_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM clients cl
    JOIN visites v ON v.client_id = cl.id
    WHERE cl.user_id = _profile_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id IN (
      SELECT id FROM coursiers WHERE user_id = auth.uid()
    ))
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;

-- Fonction pour verifier si un coursier a acces a un profil d'agent
CREATE OR REPLACE FUNCTION public.is_coursier_for_agent_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM agents a
    JOIN visites v ON v.agent_id = a.id
    WHERE a.user_id = _profile_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id IN (
      SELECT id FROM coursiers WHERE user_id = auth.uid()
    ))
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;
```

### Etape 2 : Supprimer les politiques problematiques

```sql
DROP POLICY IF EXISTS "Coursiers peuvent voir clients de leurs missions" ON public.clients;
DROP POLICY IF EXISTS "Coursiers peuvent voir profils clients de leurs missions" ON public.profiles;
DROP POLICY IF EXISTS "Coursiers peuvent voir profils agents de leurs missions" ON public.profiles;
```

### Etape 3 : Recreer les politiques avec les fonctions

```sql
CREATE POLICY "Coursiers peuvent voir clients de leurs missions"
  ON public.clients FOR SELECT
  USING (is_coursier_for_client(id));

CREATE POLICY "Coursiers peuvent voir profils clients de leurs missions"
  ON public.profiles FOR SELECT
  USING (is_coursier_for_profile(id));

CREATE POLICY "Coursiers peuvent voir profils agents de leurs missions"
  ON public.profiles FOR SELECT
  USING (is_coursier_for_agent_profile(id));
```

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| Migration SQL | Fonctions SECURITY DEFINER + remplacement des 3 politiques RLS |

## Resultat attendu

- Plus aucune erreur de recursion infinie
- L'admin voit a nouveau les visites a deleguer sur `/admin/coursiers`
- Les coursiers conservent l'acces aux infos de contact (client + agent) pour leurs missions
- Tous les autres utilisateurs (agents, clients) ne sont plus impactes
