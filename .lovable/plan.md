## Diagnostic

J'ai inspecté les deux comptes liés à "Christ Ramazani" :

**1. `christ.ramazani@immo-rama.ch` (id `68237b53…09646b`)** — le compte agent
- Auth : **anonymisé et banni** (`email = anonymise+…@deleted.local`, `banned_until = 2126-04-13`) → c'est pour ça que la connexion renvoie `403: User is banned` (visible dans les logs auth à 20:19:18).
- `profiles` : intact (Christ Ramazani, christ.ramazani@immo-rama.ch).
- `agents` : présent, `statut = actif`.
- `user_roles` : **VIDE** (le rôle agent a été supprimé lors de la "suppression").

**2. `christ.ramazani@gmail.com` (id `7a4a7a24…fbb9`)** — un compte client séparé
- `user_roles.role = client`.
- Compte distinct, pas le même user_id.

Donc il n'y a pas de double rôle sur le même compte : le compte agent a juste été cassé (anonymisé + ban + rôle supprimé) lors d'une action côté Admin.

## Plan de réparation (compte agent uniquement)

### Étape 1 — Restaurer l'auth user `68237b53…09646b`
Migration SQL ciblée sur `auth.users` :
- `email` → `christ.ramazani@immo-rama.ch`
- `banned_until` → `NULL`
- `email_confirmed_at` → `now()` si NULL
- `encrypted_password` → re-hash de `Agent123!` via `crypt('Agent123!', gen_salt('bf'))`
- `raw_user_meta_data` / `raw_app_meta_data` : nettoyés des marqueurs d'anonymisation si présents

### Étape 2 — Re-créer le rôle agent
`INSERT INTO public.user_roles (user_id, role) VALUES ('68237b53-8d73-4ce5-b97c-8c1cac09646b', 'agent')` (avec `ON CONFLICT DO NOTHING`).

### Étape 3 — Garantir l'unicité du rôle
- Vérifier qu'il n'existe AUCUNE ligne `clients.user_id = 68237b53…` (déjà confirmé : aucune).
- Vérifier que `agents.statut = 'actif'` (déjà OK).

### Étape 4 — Ne PAS toucher au compte `christ.ramazani@gmail.com`
C'est un compte client distinct (autre user_id, autre email). Je le laisse tel quel sauf demande contraire.

### Étape 5 — Vérification post-fix
Re-query `auth.users` + `user_roles` + `agents` pour confirmer :
- email restauré, `banned_until = NULL`
- 1 seul rôle = `agent`
- Agent actif
Puis tu testes la connexion sur `/login` avec `christ.ramazani@immo-rama.ch` / `Agent123!`.

## Question avant exécution

Le compte `christ.ramazani@gmail.com` (rôle **client**) — je le laisse intact, ou tu veux aussi le supprimer ?

```text
Compte ciblé        : christ.ramazani@immo-rama.ch
Action              : RESTAURER (unban + email + password + rôle agent)
Mot de passe        : Agent123!
Rôles finaux        : ['agent']
Compte gmail        : intact (sauf si tu demandes suppression)
```
