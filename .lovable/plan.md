

# Correction complete de la recursion infinie agents / visites

## Probleme identifie

La migration precedente a corrige la recursion sur les tables `clients` et `profiles`, mais **n'a pas traite** la recursion entre `agents` et `visites` qui est la cause principale du blocage.

### La boucle circulaire active

```text
agents (policy "Coursiers peuvent voir agents...")
  --> SELECT FROM visites (declenche le RLS de visites)
    --> visites (policy "Agents can view their visites")
      --> SELECT FROM agents (declenche le RLS de agents)
        --> recursion infinie !
```

Les 527 visites planifiees en base de donnees sont invisibles car **toute requete** touchant la table `visites` declenche cette recursion, y compris pour l'admin.

## Solution : Fonctions SECURITY DEFINER pour casser les deux directions du cycle

### Etape 1 : Fonction pour la politique agents --> visites

Remplacer la politique inline sur `agents` par une fonction SECURITY DEFINER.

```sql
CREATE OR REPLACE FUNCTION public.is_coursier_for_agent(_agent_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM visites v
    JOIN coursiers c ON c.user_id = auth.uid()
    WHERE v.agent_id = _agent_id
    AND (v.statut_coursier = 'en_attente' OR v.coursier_id = c.id)
  )
  AND EXISTS (SELECT 1 FROM coursiers WHERE user_id = auth.uid())
$$;
```

### Etape 2 : Fonction pour les politiques visites --> agents

Creer une fonction qui retourne l'ID agent de l'utilisateur courant sans declencher le RLS sur `agents`.

```sql
CREATE OR REPLACE FUNCTION public.get_my_agent_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM agents WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_co_agent_client_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ca.client_id FROM client_agents ca
  JOIN agents a ON a.id = ca.agent_id
  WHERE a.user_id = auth.uid()
$$;
```

### Etape 3 : Remplacer les politiques problematiques

**Sur la table `agents` :**
- Supprimer "Coursiers peuvent voir agents de leurs missions" (inline)
- Recreer avec `is_coursier_for_agent(id)`

**Sur la table `visites` :**
- Supprimer "Agents can view their visites" / "Agents can update their visites" / "Agents multi peuvent gerer visites"
- Recreer avec `get_my_agent_id()` et `get_my_co_agent_client_ids()`

## Politiques recreees

| Table | Politique | Nouvelle condition |
|-------|-----------|-------------------|
| agents | Coursiers peuvent voir agents | `is_coursier_for_agent(id)` |
| visites | Agents can view their visites | `agent_id = get_my_agent_id()` |
| visites | Agents can update their visites | `agent_id = get_my_agent_id()` |
| visites | Agents multi peuvent gerer visites | `agent_id = get_my_agent_id() OR client_id IN (SELECT get_my_co_agent_client_ids())` |

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| Migration SQL | 3 fonctions SECURITY DEFINER + remplacement de 4 politiques RLS |

## Resultat attendu

- Plus aucune erreur de recursion infinie entre `agents` et `visites`
- L'admin voit a nouveau les 527+ visites planifiees disponibles pour delegation
- Les agents conservent l'acces a leurs visites
- Les coursiers conservent la visibilite des agents lies a leurs missions

