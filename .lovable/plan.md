## 🎯 Objectif

Permettre aux visiteurs de la landing page d'essayer **réellement** l'espace client via le compte démo de Marc, **sans casser** la performance ni la sécurité, et **sans pollution** de tes données réelles.

---

## 1. 📧 Renommage du compte Marc

**Email** : `info@immo-rama.ch` → `demo@immo-rama.ch`

**Migration SQL** (via le tooling de migration) :
- `UPDATE auth.users SET email = 'demo@immo-rama.ch' WHERE id = '2e50b7d0-9a76-437c-994d-217c52f0e5e5'`
- Idem pour `auth.identities` (provider_id email)
- Confirmation immédiate de l'email (`email_confirmed_at`)
- Mise à jour cohérente dans `profiles` si besoin

---

## 2. 🛡️ Mode "Lecture seule stricte" (RECOMMANDÉ)

### 2a. Flag backend
- Nouvelle colonne `profiles.is_demo_account boolean DEFAULT false`
- Activée pour le user_id de Marc (`2e50b7d0-...`)

### 2b. Helper SQL `is_demo_account(uuid)` (SECURITY DEFINER, plpgsql)
Suit le pattern existant des security functions (mémoire `RLS recursion`).

### 2c. RLS de blocage en écriture
Sur les tables sensibles, ajout d'une clause `WITH CHECK (NOT public.is_demo_account(auth.uid()))` aux policies INSERT/UPDATE/DELETE :
- `messages` (envoi de messages)
- `offres` (acceptation/refus d'offres)
- `candidatures` / `applications` (postulations)
- `documents` (uploads)
- `visites` (réservation/annulation)
- `clients` (modification du profil)

→ Le compte démo peut **tout voir et naviguer**, mais **rien envoyer/modifier/supprimer**.

### 2d. UI : bannière démo persistante
Composant `<DemoModeBanner />` affiché en haut de toutes les pages quand `is_demo_account === true` :
> 🎬 **Mode démonstration** — Vous explorez un compte fictif en lecture seule. [Activer mon vrai compte →]

Boutons d'action sensibles désactivés avec tooltip "Action désactivée en mode démo" (détection via un hook `useIsDemoAccount()`).

---

## 3. 🚀 Bouton "Essayer la démo" sur la landing page

### 3a. Emplacement
Dans `AppShowcaseSection.tsx`, **à côté du mockup iPhone 3D** (colonne de gauche, sous la liste des features) :
- CTA primaire doré : **"🎬 Essayer la démo en direct"**
- Sous-texte : *"Connexion automatique au compte de démonstration · Aucune inscription requise"*

### 3b. Edge Function `demo-login`
Nouvelle Edge Function (verify_jwt = false, publique) :
- Génère à la volée un **magic link** ou un **token de session courte** pour `demo@immo-rama.ch` via l'Admin API Supabase
- Retourne le token au frontend
- **Rate-limit** par IP (ex. 5 démarrages/heure) pour éviter abus
- Logge chaque démarrage dans `demo_sessions` (analytics)

### 3c. Page `/demo` (frontend)
- Reçoit le token, fait `supabase.auth.setSession()`
- Redirige vers `/client/dashboard` (ou la home de l'espace client)
- La bannière démo s'affiche automatiquement

### 3d. Le mockup iPhone reste tel quel
La vidéo continue de tourner dans le mockup (déjà optimisée scrub fluide). Pas d'iframe = pas de problème de perf ni iOS Safari.

---

## 4. 🧹 Préparer les données démo de Marc

Vérification rapide que Marc a bien un dataset présentable :
- Quelques offres en cours (différents statuts)
- Quelques visites planifiées/passées
- Quelques messages dans la messagerie avec son agent
- Documents fictifs (CV, fiches de salaire factices)
- Profil complet (Dupont Marc, infos non-réelles)

Si dataset incomplet → script seed idempotent pour enrichir.

---

## 5. 📊 Mesure de conversion
- Event tracking sur le clic "Essayer la démo" (Meta Pixel + Google Ads)
- Event sur le clic "Activer mon vrai compte" depuis la bannière démo
- Rapport simple dans `/admin` : nb de démos lancées / nb de conversions

---

## 📁 Fichiers à créer/modifier

**Backend (migrations + edge function) :**
- Migration : renommage email Marc + colonne `is_demo_account` + helper `is_demo_account()` + RLS policies de blocage
- Nouvelle edge function : `supabase/functions/demo-login/index.ts`
- Migration : table `demo_sessions` (analytics)

**Frontend :**
- `src/components/public-site/sections/AppShowcaseSection.tsx` — ajout du CTA "Essayer la démo"
- `src/pages/Demo.tsx` — page d'auto-login, ajoutée à `App.tsx`
- `src/components/DemoModeBanner.tsx` — bannière persistante
- `src/hooks/useIsDemoAccount.ts` — hook de détection
- Intégration de `<DemoModeBanner />` dans le layout client
- Désactivation conditionnelle des boutons d'action sensibles (messagerie, offres, postulations)

**Mémoire :**
- Sauvegarde de la stratégie compte démo dans `mem://features/demo-account-system`

---

## ❓ Avant que je lance l'implémentation

**Confirme-moi juste 2 points :**

1. **Le bouton "Essayer la démo"** : tu le veux uniquement dans la section "Notre application" (à côté du mockup iPhone), ou aussi en duplicate ailleurs (Hero, fin de page) ?

2. **La bannière démo** : OK pour le wording *"🎬 Mode démonstration — Vous explorez un compte fictif en lecture seule. [Activer mon vrai compte →]"* ou tu veux une autre formulation ?

Une fois validé, j'exécute le plan d'un bloc.