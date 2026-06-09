## Problème

Dans `/agent/calendrier` → bouton « Partager », la liste « Choisir un agent » est vide.

Cause : les règles d’accès actuelles limitent ce qu’un agent peut lire :
- `agents` : un agent ne voit que sa propre ligne (`auth.uid() = user_id`) → la requête `select id, user_id, profiles(...)` ne retourne que lui-même, donc `agents.filter(a => a.id !== moi)` = `[]`.
- `profiles` : un agent ne peut pas lire les profils des autres agents (uniquement le sien + clients qui lui sont assignés).

Résultat : le `Select` affiche systématiquement « Aucun agent disponible ».

## Solution

### 1. Migration SQL — ouvrir la lecture inter-agents (strictement minimale)

Ajouter deux policies SELECT ciblées :

- `public.agents` : un utilisateur authentifié qui est lui-même un agent peut lire la ligne des autres agents.
  ```sql
  CREATE POLICY "Agents can view other agents (directory)"
  ON public.agents FOR SELECT TO authenticated
  USING (public.get_my_agent_id() IS NOT NULL);
  ```

- `public.profiles` : un utilisateur authentifié qui est un agent peut lire le profil (prénom/nom) d’un autre agent.
  ```sql
  CREATE POLICY "Agents can view other agents profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.get_my_agent_id() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.agents a WHERE a.user_id = profiles.id)
  );
  ```

Portée : lecture seule, restreinte aux utilisateurs ayant déjà un `agents.id` (équipe interne). Aucune autre policy n’est touchée, aucune donnée sensible exposée (on n’ajoute pas l’accès aux profils clients).

### 2. Aucun changement front

Le hook `useAgentCalendarShares` charge déjà `agents` + `profiles!agents_user_id_fkey(prenom, nom)`. Une fois les policies en place, la liste se remplit automatiquement.

## Vérification

- Recharger `/agent/calendrier`, ouvrir « Partager » → la liste affiche les autres agents internes.
- Les rôles non-agent (clients, coursiers, annonceurs) restent inchangés : `get_my_agent_id()` renvoie `NULL` pour eux, la nouvelle policy ne s’applique pas.
