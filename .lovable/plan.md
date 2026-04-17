
## Reformulation

L'admin et l'agent doivent pouvoir **créer un compte client** depuis leur interface privée. Le client reçoit ensuite un email avec un lien pour :
1. Définir son mot de passe
2. Compléter son profil (formulaire classique)
3. Signer son mandat
4. Joindre les documents demandés

## État actuel

✅ **Edge Function `invite-client` existe déjà** (mémoire `unified-client-activation-flow`) — invite un client après paiement de mandat
✅ **Module `/mandat-v3`** opérationnel (signature + documents en mode invité)
✅ **Auth Supabase** configurée (rôle `client` géré via `user_roles`)
✅ **Email infra** custom domain `notify.logisorama.ch` actif

## Ce qui manque

Un **bouton/formulaire dans les espaces admin et agent** pour créer manuellement un compte client (sans passer par le paiement préalable), avec envoi d'un email d'invitation incluant un lien magique vers le formulaire de profil + mandat + documents.

## Investigation à faire (avant code)

- `src/pages/admin/Clients.tsx` (ou équivalent) — voir le bouton "Ajouter client" existant
- `src/pages/agent/MesClients.tsx` — idem côté agent
- `supabase/functions/invite-client/index.ts` — comprendre le flow actuel pour le réutiliser
- Vérifier si une page `/client/onboarding` existe déjà ou s'il faut la créer

## Plan technique

### Lot 1 — Bouton "Créer un compte client" (admin + agent)

**Fichiers** :
- `src/pages/admin/Clients.tsx` : ajouter bouton "Créer un compte client"
- `src/pages/agent/MesClients.tsx` : même bouton (visible si rôle `agent`)
- ➕ `src/components/clients/CreateClientAccountDialog.tsx` (nouveau, partagé)

**Formulaire minimal** (Dialog modal) :
- Prénom *
- Nom *
- Email * (validé via Zod)
- Téléphone * (format suisse +41)
- Type de recherche (Louer / Acheter)
- Agent assigné (auto = agent connecté côté agent, sélecteur côté admin)

**Validation** : Zod côté client + serveur

### Lot 2 — Edge Function `create-client-account`

➕ `supabase/functions/create-client-account/index.ts`

Logique :
1. Vérifier JWT du caller (admin ou agent uniquement via `has_role`)
2. Validation Zod du body
3. Créer l'utilisateur via `supabase.auth.admin.createUser` avec `email_confirm: false` + `user_metadata` (prénom, nom, téléphone)
4. Insérer rôle `client` dans `user_roles`
5. Créer la ligne `clients` (avec `agent_id`, `type_recherche`, statut `prospect`)
6. Si appelé par agent : créer aussi l'entrée `client_agents` (cohérence dual-source — mémoire `dual-source-assignment-integrity-strategy`)
7. Générer un magic link via `supabase.auth.admin.generateLink({ type: 'invite', redirectTo: '/client/onboarding' })`
8. Enqueue email d'invitation via `enqueue_email` RPC (template branded Logisorama)

### Lot 3 — Page d'onboarding client

➕ `src/pages/client/Onboarding.tsx` accessible via `/client/onboarding` (route publique, vérifie token recovery dans URL hash)

3 étapes wizard :
1. **Définir mot de passe** (`supabase.auth.updateUser({ password })`)
2. **Compléter profil** (champs classiques : adresse, NPA, ville, nationalité, état civil, profession, revenus, etc. — réutiliser composants existants `mandat/`)
3. **Mandat + documents** : redirection vers `/mandat-v3?prefill=true` qui pré-remplit les champs déjà saisis et permet la signature + upload documents

À la fin : redirection vers `/client/dashboard`

### Lot 4 — Email d'invitation branded

Template HTML inline dans l'edge function :
- Logo Immo-Rama
- Titre : "Bienvenue chez Logisorama"
- Bouton CTA : "Activer mon compte"
- Expire dans 7 jours
- Signé "Christ Ramazani, Directeur d'agence"

## Fichiers à créer/modifier

**Nouveaux** :
- `src/components/clients/CreateClientAccountDialog.tsx`
- `src/pages/client/Onboarding.tsx`
- `supabase/functions/create-client-account/index.ts`

**Modifiés** :
- `src/pages/admin/Clients.tsx` (bouton)
- `src/pages/agent/MesClients.tsx` (bouton)
- `src/App.tsx` (route `/client/onboarding`)

## Garanties

- ✅ Sécurité : edge function vérifie le rôle admin/agent via JWT
- ✅ RLS respectée (cohérence `clients.agent_id` + `client_agents`)
- ✅ Email envoyé via infra existante `notify.logisorama.ch`
- ✅ Réutilise le module `/mandat-v3` existant pour signature + documents (pas de duplication)
- ✅ Pas d'impact sur thème landing publique (luxe ivoire/or)
- ✅ Pas d'impact sur thème espaces privés (ancien thème conservé)

## Question rapide avant de coder

Une seule clarification nécessaire :

**À l'étape 3 du wizard d'onboarding (mandat + documents)** :
- **A)** Redirection vers `/mandat-v3` existant avec pré-remplissage (recommandé — réutilise le module éprouvé)
- **B)** Intégrer signature + documents directement dans `/client/onboarding` (nouveau composant)

Réponds par "A" ou "B" et je lance.
