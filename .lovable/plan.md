
# Anonymisation RGPD des clients (au lieu de suppression destructive)

## Objectif

Lorsqu'un client demande la suppression de ses données (RGPD / droit à l'effacement) :
- **Conserver** : nom, prénom, email, téléphone, adresse → indispensables pour la **comptabilité** (factures émises, commissions versées) et les **statistiques** (taux de conversion, performance agents, durée des mandats).
- **Anonymiser/Supprimer** : toutes les données sensibles non nécessaires à la comptabilité (situation financière, état civil, profession, employeur, documents, messages, dossier, mandat signé, etc.).
- **Désactiver l'accès** : le compte ne peut plus se connecter (auth banni).
- **Marquer visuellement** : badge « Anonymisé RGPD » dans la liste admin, exclu des pipelines actifs mais visible dans les rapports financiers.

## Constat actuel

L'edge function `delete-client` (vue dans le dossier `supabase/functions/delete-client/index.ts`) fait actuellement :
1. DELETE sur `messages`, `conversations`
2. DELETE sur `clients`
3. DELETE sur `user_roles`
4. DELETE sur `profiles`
5. `auth.admin.deleteUser(userId)` → suppression hard du compte

→ **Problème** : toutes les transactions, commissions, factures référencent `client_id` ou `user_id`. Une fois supprimé, les stats (`/admin/dashboard`, performance agents, projections financières) sont incohérentes : « client inconnu » ou agrégats faussés (FK orphelines, COUNT incorrect).

## Correctif

### 1. Migration DB

**a) Marqueurs d'anonymisation sur `clients` et `profiles`**
```sql
ALTER TABLE public.clients
  ADD COLUMN anonymise_at timestamptz,
  ADD COLUMN anonymise_motif text;

ALTER TABLE public.profiles
  ADD COLUMN anonymise_at timestamptz;
```

**b) Table d'audit RGPD** (preuve légale de la demande)
```sql
CREATE TABLE public.client_anonymisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  user_id uuid NOT NULL,
  -- snapshot minimal conservé pour comptabilité
  prenom text, nom text, email text, telephone text, adresse text,
  -- métadonnées RGPD
  anonymise_at timestamptz NOT NULL DEFAULT now(),
  anonymise_par uuid REFERENCES auth.users(id),
  motif text DEFAULT 'Demande RGPD - droit à l''effacement (art. 17 RGPD / LPD CH)',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_anonymisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins voient les anonymisations"
  ON public.client_anonymisations FOR SELECT
  TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insèrent"
  ON public.client_anonymisations FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
```

### 2. Refactor edge function `delete-client` → renommée logiquement « anonymiser »

Le nom de la fonction reste `delete-client` (pour ne pas casser les appels existants), mais le comportement change :

**Étape A — Snapshot dans `client_anonymisations`** (preuve RGPD)

**Étape B — Conserver dans `clients`** :
- `id`, `user_id`, `agent_id`, `statut` (forcé à `inactif`), `date_ajout`, `created_at`
- `commission_split`, `abaninja_*` (factures), `mandat_date_signature`, `date_changement_statut`
- `type_recherche` (locataire/acheteur — utile pour stats de typologie)
- `region_recherche` (stats géographiques agrégées)

**Étape C — Anonymiser à `NULL` dans `clients`** :
- `nationalite`, `type_permis`, `residence`, `pieces`, `budget_max`
- `situation_familiale`, `situation_financiere`, `profession`, `revenus_mensuels`, `source_revenus`, `type_contrat`, `secteur_activite`, `anciennete_mois`, `charges_mensuelles`, `autres_credits`, `apport_personnel`, `garanties`
- `date_naissance`, `etat_civil`, `gerance_actuelle`, `contact_gerance`, `loyer_actuel`, `depuis_le`, `pieces_actuel`, `motif_changement`, `employeur`, `date_engagement`
- `charges_extraordinaires`, `montant_charges_extra`, `poursuites`, `curatelle`, `souhaits_particuliers`
- `nombre_occupants`, `utilisation_logement`, `animaux`, `instrument_musique`, `vehicules`, `numero_plaques`, `decouverte_agence`
- `note_agent`, `mandat_pdf_url`, `mandat_signature_data`, `demande_mandat_id`
- Marquage : `anonymise_at = now()`, `anonymise_motif = 'RGPD'`, `statut = 'inactif'`

**Étape D — Conserver dans `profiles`** :
- `id`, `prenom`, `nom`, `email`, `telephone` (comptabilité + identification factures)
- `created_at`, `updated_at`
- `actif = false`, `notifications_email = false`, `is_online = false`
- Marquage : `anonymise_at = now()`

**Étape E — Hard DELETE** (données sensibles vraiment effacées) :
- `messages` (contenu personnel des conversations)
- `conversations` (lien client-agent)
- `notifications` du user
- `documents` (table) + fichiers Storage du bucket `client-documents/{user_id}/*`
- `candidatures` du client (les `transactions` conclues sont **conservées** car déjà liées à des commissions versées)
- `visites` non conclues (les visites liées à transactions conclues sont conservées)
- `client_agents` (lien co-assignation — la stat reste via `transactions.agent_id`)
- `user_roles` du user
- `lead_phone_appointments` éventuels

**Étape F — Auth** :
- **Ne PAS supprimer** `auth.users` (FK des transactions, factures, commissions cassent).
- À la place : `auth.admin.updateUserById(userId, { ban_duration: '876000h' /* 100 ans */, email: 'anonymise+{userId}@deleted.local' })` → empêche tout login + libère l'email pour réinscription future éventuelle.

**Étape G — Réponse** : `{ success: true, anonymisation_id: '...' }`

### 3. Front — `src/pages/admin/Clients.tsx`

- Renommer le bouton « Supprimer » (carte + bulk) → **« Anonymiser (RGPD) »** avec icône `ShieldCheck` au lieu de `Trash2`.
- AlertDialog mis à jour :
  - Titre : « Anonymiser N client(s) — Demande RGPD »
  - Description claire : « Conformément au droit à l'effacement (art. 17 RGPD / nLPD), les données personnelles sensibles seront effacées. **Le nom, email, téléphone et adresse sont conservés** car indispensables à la **comptabilité** (factures, commissions) et aux **statistiques** de l'agence. Le client ne pourra plus se connecter. Cette action est **irréversible**. »
- Filtre liste : par défaut, exclure les clients `anonymise_at IS NOT NULL` du compteur principal et des pipelines actifs.
- Toggle « Afficher anonymisés » → ajoute un badge gris **« Anonymisé RGPD »** + date.
- Sur la fiche détail d'un client anonymisé : bandeau d'avertissement explicatif, masquer les champs vidés, afficher uniquement les agrégats financiers.

### 4. Front — Pages stats / dashboard / commissions

**Aucun changement requis** : les FK et les COUNT restent intacts puisque les enregistrements `clients`, `transactions`, `commissions`, `profiles` existent toujours. Les jointures `transactions → clients → profiles(prenom, nom)` continuent de fonctionner pour les rapports financiers.

### 5. Nouvelle page d'audit (optionnelle) — `/admin/clients/anonymises`

Liste des anonymisations passées (table `client_anonymisations`) — preuve légale pour audits LPD/RGPD. Affichage : nom, email, date, motif, admin qui a opéré.

## Validation

1. Sélectionner 2 clients → « Anonymiser (RGPD) » → confirmer.
2. **Dashboard admin** : taux de conversion, CA, commissions par agent → **valeurs identiques** avant/après.
3. **Page transactions** : les transactions conclues affichent toujours le nom du client (depuis `profiles`).
4. **Liste `/admin/clients`** : par défaut, les 2 clients ne sont plus visibles ; toggle « Anonymisés » → badge gris visible.
5. **Storage** : dossier `client-documents/{user_id}/` vide.
6. **Tentative de login** du client anonymisé → refusée (banni).
7. **Table `client_anonymisations`** : 2 lignes avec snapshot complet et `anonymise_par = admin.user_id`.
8. Aucune page front ne casse (pas de `null.prenom`).

## Fichiers touchés

```text
[MIGRATION DB]
  - ALTER clients ADD anonymise_at, anonymise_motif
  - ALTER profiles ADD anonymise_at
  - CREATE TABLE client_anonymisations + RLS

[MOD] supabase/functions/delete-client/index.ts
      - réécriture complète : snapshot + UPDATE NULL + hard delete sélectif
      - auth: ban + anonymisation email au lieu de deleteUser
      - retour { anonymisation_id }

[MOD] src/pages/admin/Clients.tsx
      - bouton "Supprimer" → "Anonymiser (RGPD)" (icône ShieldCheck)
      - AlertDialogs : nouveau wording RGPD explicite
      - filtre par défaut : exclut anonymise_at IS NOT NULL
      - toggle "Afficher anonymisés" + badge gris
      - handleDeleteClient & handleBulkDelete : message toast adapté

[MOD éventuel] src/pages/admin/ClientDetail.tsx (ou équivalent)
      - bandeau "Client anonymisé RGPD" si anonymise_at set
      - masquage champs vides

[NEW optionnel] src/pages/admin/ClientsAnonymises.tsx
      - page d'audit listant client_anonymisations
      - route /admin/clients/anonymises
```

## Conformité légale

- **Art. 17 RGPD** (droit à l'effacement) : satisfait — données personnelles sensibles effacées.
- **Art. 17(3)(e) RGPD** : exception pour « constatation, exercice ou défense de droits en justice » + obligations comptables (Code des obligations CH art. 957-958f : conservation 10 ans des pièces comptables).
- **nLPD (CH)** art. 32 : minimisation respectée (ne reste que le strict nécessaire à la comptabilité).
- Audit trail dans `client_anonymisations` = preuve de traitement de la demande.
