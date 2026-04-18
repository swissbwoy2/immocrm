
## Diagnostic confirmé (depuis logs + DB)

J'ai vérifié l'utilisateur que tu viens de créer (`cendrinecardoso@gmail.com`, signup via `construire-renover` à 10:56) :

```
auth.users     → ✅ existe (user_type: maitre_ouvrage)
public.profiles → ❌ AUCUNE ligne
public.user_roles → ❌ AUCUNE ligne
```

### Problème #1 — Impossible de se connecter
`Login.tsx` ligne 52-58 fait `SELECT role FROM user_roles WHERE user_id=...single()`. Comme aucun rôle n'est créé lors du signup des formulaires Construire/Rénover, Relouer, et Vendeur, la requête échoue → toast "Email ou mot de passe incorrect" alors que les credentials sont bons.

**Cause** : les 3 formulaires publics (`FormulaireConstruireRenover`, `FormulaireRelouer`, `FormulaireVendeurComplet`) appellent `supabase.auth.signUp()` mais **ne créent jamais** :
- la ligne `profiles` (nom, prénom, email, téléphone)
- la ligne `user_roles` (rôle = `client`)

Aucun trigger PostgreSQL ne le fait non plus (vérifié : pas de `handle_new_user`).

### Problème #2 — Mot de passe oublié renvoie sur Lovable
Les logs auth montrent que le lien de récupération a bien été envoyé. Quand l'utilisateur clique, Supabase fait un 303 vers `redirectTo`. Mais si `redirectTo` n'est pas dans la **liste blanche des Redirect URLs** de Supabase, Supabase fallback sur le **Site URL par défaut** = `https://f4e29d86-...lovableproject.com/` (la racine Lovable, pas `/reset-password`). C'est exactement ce que tu vis.

Aussi : depuis les formulaires publics il n'y a **aucun lien "Mot de passe oublié"** — l'utilisateur doit aller sur `/login` ce qui n'est pas évident.

## Plan de correction

### 1. Edge Function `create-public-user` (nouveau)
Crée une edge function unique appelée par les 3 formulaires APRÈS `signUp()`. Elle utilise le `SERVICE_ROLE_KEY` pour :
- INSERT dans `public.profiles` (id = user.id, email, prénom, nom, téléphone)
- INSERT dans `public.user_roles` (user_id, role = `'client'`)
- Idempotent (ON CONFLICT DO NOTHING)

Pourquoi une edge function : le rôle `client` doit être inséré côté serveur (RLS empêche l'utilisateur d'écrire son propre rôle, sinon faille de privilege escalation).

### 2. Modifier les 3 formulaires
Dans `FormulaireConstruireRenover.tsx`, `FormulaireRelouer.tsx`, `FormulaireVendeurComplet.tsx`, après `signUp()` réussi :
```ts
await supabase.functions.invoke('create-public-user', {
  body: { user_id, email, first_name, last_name, phone, source: 'construire-renover' }
});
```

### 3. Réparer l'utilisateur déjà créé
Migration SQL pour insérer rétroactivement profile + role pour `cendrinecardoso@gmail.com` (et tout autre user `maitre_ouvrage`/`vendeur`/`relouer` orphelin).

### 4. Supabase Auth — Ajouter `/reset-password` aux Redirect URLs autorisés
Les domaines suivants doivent être whitelistés dans la config Auth :
- `https://f4e29d86-2c22-4626-ac70-fd341e0305cf.lovableproject.com/reset-password`
- `https://id-preview--f4e29d86-2c22-4626-ac70-fd341e0305cf.lovable.app/reset-password`
- `https://logisorama.ch/reset-password`
- `https://immocrm.lovable.app/reset-password`

Je le ferai via `cloud--configure_auth` côté code.

### 5. Ajouter "Mot de passe oublié" sur les 3 landings de formulaires
Petit lien discret en bas du Step 4 (compte) qui ouvre une dialog de reset password (modèle identique à `ConnexionAnnonceur.tsx`), avec `redirectTo: ${origin}/reset-password`.

### 6. Test end-to-end recommandé après déploiement
- Créer un compte test via `/formulaire-construire-renover`
- Se déconnecter
- Se reconnecter sur `/login` → doit fonctionner
- Cliquer "Mot de passe oublié" → recevoir email → cliquer → arriver sur `/reset-password`

## Fichiers touchés

| Fichier | Action |
|---|---|
| `supabase/functions/create-public-user/index.ts` | **Créé** |
| `supabase/config.toml` | Bloc `[functions.create-public-user]` avec `verify_jwt = false` |
| `src/pages/FormulaireConstruireRenover.tsx` | Appel edge function + lien "mot de passe oublié" |
| `src/pages/FormulaireRelouer.tsx` | Idem |
| `src/pages/FormulaireVendeurComplet.tsx` | Idem |
| Migration SQL | Réparation rétroactive du compte orphelin |
| Auth config | Ajout des Redirect URLs `/reset-password` |

## Garanties
- ✅ Aucun impact sur les comptes admin/agent/client existants
- ✅ Rôle `client` injecté côté serveur (sécurité RLS préservée)
- ✅ Idempotent — re-cliquer "envoyer" ne casse rien
- ✅ Compte `cendrinecardoso@gmail.com` réparé automatiquement
