## Diagnostic

L'email `bcvscpncept@gmail.com` n'existe **dans aucune table** (`auth.users`, `profiles`, `user_roles`, `clients`, `leads`, `meta_leads`). Conclusion : l'inscription n'est jamais parvenue jusqu'au serveur.

Cause racine identifiée dans le code des 3 formulaires publics (`FormulaireRelouer.tsx`, `FormulaireConstruireRenover.tsx`, `FormulaireVendeurComplet.tsx`) :

```
auth.signUp() → create-public-user (edge fn) → trigger SQL crée clients
```

Problèmes :
1. **Aucun garde-fou visible** : si `auth.signUp()` échoue (mot de passe trop faible, email déjà utilisé, captcha, rate-limit…), l'erreur est jetée mais aucune trace persistante n'existe — on ne saura jamais que `bcvscpncept` a tenté.
2. **`create-public-user` est non-bloquant** : `if (provisionError) console.warn(...)` — si la création du profil/rôle échoue, l'utilisateur voit "succès" mais aucun `clients` n'est créé.
3. **Pas de lead de secours** : sur les parcours buyer/renter, le `leads` est inséré APRÈS le signup. Si signup échoue, on perd même la trace de contact.
4. **Pas de logs serveur centralisés** des tentatives d'inscription échouées.

## Plan

### 1. Garde-fou côté frontend (3 formulaires publics)
Dans `FormulaireRelouer.tsx`, `FormulaireConstruireRenover.tsx`, `FormulaireVendeurComplet.tsx` :
- Si `auth.signUp` renvoie `data.user === null` sans erreur (cas email déjà utilisé en mode "secure email change"), traiter comme une erreur explicite ("Cet email a déjà un compte — connectez-vous").
- Faire `create-public-user` **bloquant** : si erreur, afficher un toast d'erreur clair et **journaliser** la tentative via une nouvelle edge function `log-signup-attempt` (pour qu'admin puisse retrouver l'email).
- Toujours insérer un `leads` **AVANT** le signup (en cas d'échec, on garde au moins le contact).

### 2. Table `signup_attempts` + edge function `log-signup-attempt`
Nouvelle table publique (service_role write only, admin read) :
```
signup_attempts(id, email, phone, first_name, last_name, source,
               parcours, stage, error_message, user_agent, ip, created_at)
```
- `stage` ∈ `auth_signup_failed | provision_failed | succeeded`
- Edge function `log-signup-attempt` (verify_jwt=false) : reçoit un POST, insère la ligne.
- Appelée systématiquement par les 3 formulaires (succès et échecs).

### 3. Page admin `/admin/inscriptions-echouees`
- Liste les `signup_attempts` avec `stage != succeeded` des 30 derniers jours.
- Action : "Inviter manuellement" → invoque `invite-client` avec les infos saisies.
- Action : "Marquer comme résolu".
- Lien depuis `/admin/clients` (bouton "Inscriptions échouées" à côté de "Inviter un client").

### 4. Vérification base existante
- Confirmer que tous les `user_roles.role='client'` ont bien généré une ligne `clients` (trigger `on_client_role_created`). Si certains manquent, exécuter un backfill ponctuel.

## Détails techniques

**Tables** :
- `public.signup_attempts` : RLS admin SELECT only ; INSERT via service_role (edge fn) ; GRANT SELECT to authenticated, ALL to service_role.

**Edge functions** :
- `log-signup-attempt` (nouvelle, verify_jwt=false, CORS public).

**Frontend** :
- 3 fichiers `Formulaire*.tsx` : insertion `leads` déplacée AVANT `auth.signUp`, `create-public-user` rendu bloquant avec toast d'erreur, appel `log-signup-attempt` en cas d'échec à chaque étape.
- Nouvelle page `src/pages/admin/InscriptionsEchouees.tsx` + route + lien depuis `Clients.tsx`.

**Backfill** :
- SQL one-shot : `INSERT INTO clients(user_id, statut, priorite, date_ajout) SELECT ur.user_id, 'actif', 'moyenne', now() FROM user_roles ur LEFT JOIN clients c ON c.user_id=ur.user_id WHERE ur.role='client' AND c.id IS NULL ON CONFLICT DO NOTHING;`

## Résultat attendu
- Plus aucune inscription perdue silencieusement.
- Tableau admin pour voir toutes les tentatives échouées avec contact (email/tel/nom).
- Possibilité de relancer manuellement un client qui dit "je me suis inscrit" alors que rien n'est arrivé.
- Filet de sécurité : un `lead` est créé même si `signUp` échoue → l'équipe peut le rappeler.
