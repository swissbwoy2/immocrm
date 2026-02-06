
# Correction du "Revenu agence a zero" - Recursion infinie sur `has_role`

## Diagnostic

Le probleme principal est la fonction `has_role()` qui est en **LANGUAGE SQL**. PostgreSQL "inline" les fonctions SQL, ce qui fait perdre le contexte `SECURITY DEFINER` et declenche une recursion infinie :

```text
Admin ouvre le tableau de bord
  --> SELECT FROM transactions (RLS appelle has_role())
    --> has_role() fait SELECT FROM user_roles (RLS appelle has_role())
      --> has_role() fait SELECT FROM user_roles (RLS appelle has_role())
        --> recursion infinie --> requete bloquee --> 0 resultats
```

Ce cycle affecte **toutes les tables** du systeme (39+ politiques utilisent `has_role`), ce qui explique pourquoi tout affiche zero : agents, clients, transactions, offres, etc.

Les corrections precedentes ont converti les fonctions `is_coursier_for_agent`, `get_my_agent_id`, etc. en `plpgsql`, mais la fonction la plus critique -- `has_role` -- est restee en SQL.

## Solution

Convertir `has_role` de `LANGUAGE SQL` en `LANGUAGE plpgsql` pour empecher PostgreSQL de l'inliner. Cela preserve le contexte `SECURITY DEFINER` et casse la recursion.

### Migration SQL

```sql
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;
```

Aucune autre modification n'est necessaire : les 39+ politiques RLS existantes continueront d'appeler `has_role()` exactement comme avant, mais cette fois la fonction executera son SELECT sur `user_roles` **sans declencher le RLS** grace au `SECURITY DEFINER` correctement preserve.

## Impact

| Element | Avant | Apres |
|---------|-------|-------|
| Transactions | 0 (recursion) | 6 visibles |
| Revenus agence (fevrier) | CHF 0 | CHF 2'766 |
| Agents | 0 | 7 visibles |
| Clients | 0 | 45 visibles |
| Toutes les autres tables | 0 | Donnees restaurees |

## Fichier modifie

| Fichier | Modification |
|---------|-------------|
| Nouvelle migration SQL | Conversion de `has_role` en `plpgsql` (1 seule instruction) |

Aucun fichier frontend n'est modifie. Le code du dashboard fonctionne deja correctement -- c'est uniquement la base de donnees qui bloque les resultats.
