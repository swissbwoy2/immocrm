
## Reformulation

L'admin/agent doit pouvoir **remplir le mandat à la place du client** (toutes les étapes : identité, recherche, tiers, documents, clauses), **sauf la signature** qui reste réservée au client. Et **sans contrainte de champs obligatoires** — l'admin peut sauvegarder un mandat partiel et le client complétera/signera.

## État actuel

- `/mandat-v3` (public, mode invité) : 7 étapes avec validations strictes, signature obligatoire à la fin
- Les admins/agents n'ont pas d'interface pour pré-remplir un mandat côté client
- Création de compte client fonctionnelle (Lot précédent)

## Plan

### 1. Nouvelle route privée `/admin/clients/:clientId/mandat-prefill` et `/agent/clients/:clientId/mandat-prefill`

Page wizard réutilisant les composants `MandatV3Step1` à `MandatV3Step6` **existants**, en sautant l'étape 7 (signature).

### 2. Composant `MandatPrefillWizard.tsx`

- Réutilise `MandatV3Step1Identity`, `Step2Search`, `Step3RelatedParties`, `Step4Documents`, `Step5References`, `Step6LegalClauses`
- **Mode "staff"** activé via prop `staffMode={true}` :
  - Désactive toutes les validations Zod bloquantes (champs `.optional()` runtime)
  - Retire les astérisques visuels des labels obligatoires
  - Supprime les blocages "Suivant" → navigation libre entre étapes
  - Bandeau jaune en haut : "Mode pré-remplissage par l'agence — la signature sera demandée au client"
- Bouton final : **"Envoyer au client pour signature"** (au lieu de "Signer")

### 3. Adaptations légères dans les Steps existants

Ajouter une prop optionnelle `staffMode?: boolean` aux 6 steps :
- Si `true` → tous les `required` HTML deviennent `false`, validations désactivées
- Aucun changement de comportement quand `staffMode` est absent ou `false` (rétrocompatibilité totale avec `/mandat-v3` public)

### 4. Edge Function `staff-create-mandate-draft`

➕ `supabase/functions/staff-create-mandate-draft/index.ts`

- Vérifie JWT staff (admin/agent via `has_role`)
- Crée la ligne `mandates` avec statut `draft_pending_signature`
- Insère related_parties, documents
- Génère un `access_token` unique (réutilise infra `mandat-v3`)
- Envoie email au client : *"Votre mandat a été pré-rempli par votre agent — il ne reste qu'à le signer"* avec lien magique vers `/mandat-v3/sign/:token` (étape 7 isolée)

### 5. Page client `/mandat-v3/sign/:token`

➕ Nouvelle page minimaliste qui charge le mandat existant via token et affiche **uniquement l'étape 7** (récap + signature + clauses légales à confirmer).

### 6. Bouton d'accès dans les fiches client

- `src/pages/admin/ClientDetail.tsx` : bouton "Pré-remplir le mandat"
- `src/pages/agent/ClientDetail.tsx` : idem

→ Visible si le client n'a pas encore de mandat signé.

## Fichiers

**Nouveaux** :
- `src/components/mandat-v3/MandatPrefillWizard.tsx`
- `src/pages/staff/MandatPrefill.tsx` (route partagée admin/agent)
- `src/pages/mandat-v3/SignOnly.tsx`
- `supabase/functions/staff-create-mandate-draft/index.ts`

**Modifiés** (ajout prop `staffMode` non-breaking) :
- `src/components/mandat-v3/MandatV3Step1Identity.tsx` à `Step6LegalClauses.tsx`
- `src/App.tsx` (3 routes : `/admin/clients/:id/mandat-prefill`, `/agent/clients/:id/mandat-prefill`, `/mandat-v3/sign/:token`)
- Fiches client admin + agent (bouton d'accès)

## Garanties

- ✅ Signature **toujours réservée au client** (jamais staff)
- ✅ Aucun champ obligatoire en mode staff → sauvegarde libre
- ✅ Module `/mandat-v3` public **inchangé** (validations strictes maintenues)
- ✅ RLS : edge function valide rôle admin/agent + co-assignment
- ✅ Email branded via `notify.logisorama.ch`
- ✅ Thème inchangé (espaces privés = ancien thème)
