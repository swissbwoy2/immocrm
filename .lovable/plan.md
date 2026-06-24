# Séparation Client Chercheur vs Client Reloueur — Phase 1 + 2

## Objectif
Séparer strictement les clients qui **cherchent un logement** (location ou achat) de ceux qui veulent **relouer leur appartement**. Cendrine Cardoso ne doit plus polluer `/admin/clients` avec des badges absurdes (non solvable, permis manquant, budget CHF 0, mandat 90 jours).

**Phase 3 (matching double-sens chercheur ↔ logement)** = plan séparé, après validation de cette base.

---

## Règle de classification (point critique)

`parcours_type = 'location'` **NE SUFFIT PAS** — un chercheur peut chercher une location. La classification `property_reletting` n'est posée que si **au moins un signal explicite du parcours Relouer** est présent :

- `leads.source = 'relouer-mon-appartement'`
- `leads.formulaire ILIKE '%relouer%'` *(champ confirmé existant)*
- `parcours = 'locataire-sortant'` (payload edge function)
- `intention = 'relouer_mon_appartement'` (payload edge function)
- création via `FormulaireRelouer.tsx`

Sinon :
- Chercheur (location OU achat) → `housing_search`
- Reloueur + mandat de recherche actif → `mixed`

**Cendrine Cardoso** : classée `property_reletting` (source `relouer-mon-appartement`, 2.5 pièces Rue Centrale 30).

**Garde-fou absolu : aucun chercheur de location ne doit disparaître de `/admin/clients`.**

---

## Phase 1 — Séparation stricte

### 1.1 Migration schéma + backfill obligatoire
```sql
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS journey_type text DEFAULT 'housing_search';

-- Backfill anti-disparition : TOUS les anciens clients
UPDATE public.clients SET journey_type = 'housing_search' WHERE journey_type IS NULL;

-- property_reletting uniquement sur signaux explicites
UPDATE public.clients c SET journey_type = 'property_reletting'
WHERE EXISTS (
  SELECT 1 FROM public.leads l
  WHERE lower(l.email) = lower(c.email)
    AND (l.source = 'relouer-mon-appartement' OR l.formulaire ILIKE '%relouer%')
);

-- mixed = reloueur + mandat de recherche actif
UPDATE public.clients c SET journey_type = 'mixed'
WHERE c.journey_type = 'property_reletting'
  AND EXISTS (SELECT 1 FROM public.mandates m
              WHERE m.client_id = c.id AND m.type IN ('recherche','location','achat'));

ALTER TABLE public.clients
  ADD CONSTRAINT clients_journey_type_check
  CHECK (journey_type IN ('housing_search','property_reletting','mixed'));
CREATE INDEX IF NOT EXISTS idx_clients_journey_type ON public.clients(journey_type);
```
Vérification post-migration : `SELECT count(*) FROM clients WHERE journey_type IS NULL` doit valoir 0.

### 1.2 Filtre `/admin/clients` (tolérant en transition)
Phase transitoire (clients créés entre migration et déploiement front) :
```ts
.or('journey_type.eq.housing_search,journey_type.eq.mixed,journey_type.is.null')
```
Une fois la migration validée en prod, on resserre :
```ts
.or('journey_type.eq.housing_search,journey_type.eq.mixed')
```
Toggle admin "Inclure reloueurs" (off par défaut).

### 1.3 `FormulaireRelouer.tsx`
- À l'insert client : forcer `journey_type = 'property_reletting'`.
- Si user existant en `housing_search` → passer en `'mixed'` (non destructif).
- Aucun mandat recherche / dossier solvabilité créé.

### 1.4 Routing dashboard client
- `useClientJourney()` lit `journey_type`.
- `property_reletting` pur → `/dashboard/relouer`.
- `housing_search` pur → dashboard chercheur actuel.
- `mixed` → **switcher permanent dans la sidebar** (`localStorage.lastClientJourney`).

---

## Phase 2 — Module `/admin/relouer` complet

### 2.1 Tables (GRANT + RLS dans la même migration)
- `relouer_requests` — dossier principal
- `relouer_photos` — galerie (catégorie, statut, ordre)
- `relouer_documents` — bail, résiliation, plan… (statut, commentaire admin)
- `relouer_visit_slots` — créneaux proposés/confirmés
- `relouer_candidates` — candidats intéressés
- `relouer_timeline` — événements auto
- `relouer_notes` — notes internes admin/agent uniquement

Statuts dossier : `new_request, to_qualify, missing_information, waiting_documents, waiting_photos, ready_to_publish, published, visits_scheduled, applications_received, sent_to_agency, rented, cancelled, archived`.

### 2.2 RLS
- **Admin** : tout (`has_role(auth.uid(),'admin')`)
- **Agent** : `assigned_agent_id = get_my_agent_id()`
- **Client reloueur** : ses propres demandes via `user_id`. Aucun accès aux `relouer_notes`. Candidats avec champs sensibles masqués (revenus, permis, ID, contact direct).

### 2.3 Edge function `create-public-user`
- Si signal Relouer (`source='relouer-mon-appartement'` OU `parcours='locataire-sortant'` OU `intention='relouer_mon_appartement'`) → créer ligne `relouer_requests` avec infos logement.
- Forcer `journey_type='property_reletting'` (ou `'mixed'` si chercheur déjà existant).
- Idempotent sur `(user_id, lead_id)`.

### 2.4 Sidebar admin
Nouvel item "Clients & Mandats" : **"Relouer"** → `/admin/relouer` (icône Key).

### 2.5 Page liste `/admin/relouer`
Style identique à `/admin/clients` :
- Header premium bleu clair, KPI (Total, Nouvelles, Photos manquantes, Docs manquants, Prêts à publier, Visites, Candidatures, Reloués ce mois, Sans agent)
- Filtres : recherche, statut, agent, canton, commune, pièces, dispo, complétude
- Tri : date, dispo, statut, agent, candidatures, activité
- Cartes dossier : initiales, nom, badges, adresse, type/pièces/surface, loyer, dispo, agent, compteurs photos/docs/créneaux/candidats

### 2.6 Page détail `/admin/relouer/:id`
Inspirée de `/admin/clients/:id`, **SANS solvabilité/budget/mandat 90j** :
- Bandeau : nom, "Client reloueur", adresse, statut, agent, actions
- Résumé dossier + progression dédiée reloueur
- Logement, Conditions, Régie, Contact visite
- Photos (upload, validation, principale, catégorie, réordonner)
- Documents (upload + validation)
- Créneaux de visite
- Candidats (ajouter, transmettre régie, accepter/refuser)
- Timeline auto + Notes internes (admin/agent only)

### 2.7 Dashboard `/dashboard/relouer`
- Cartes résumé (statut, progression, photos/docs validés, créneaux, visites, candidatures)
- Infos logement éditables, photos, documents, contact régie, contact visite, créneaux
- Timeline simplifiée
- **Zéro référence** à budget/solvabilité/permis/mandat/offres

### 2.8 Storage
- Bucket `relouer-photos` (lecture restreinte par dossier)
- Bucket `relouer-documents` (privé, RLS par dossier)

---

## Schéma `relouer_requests` (extrait)
```sql
CREATE TABLE public.relouer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  assigned_agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new_request',
  prenom text, nom text, email text, telephone text, requester_role text,
  property_street text, property_number text, property_zip text, property_city text,
  property_canton text, property_type text, rooms numeric, surface numeric, floor int,
  has_elevator bool, has_balcony bool, has_terrace bool, has_garden bool,
  has_cellar bool, has_indoor_parking bool, has_outdoor_parking bool, has_box bool,
  furnished bool, pets_allowed bool,
  rent_net numeric, charges numeric, rent_gross numeric, guarantee_amount numeric,
  availability_date date, current_lease_end_date date,
  resignation_sent bool, resignation_date date,
  description text, special_features text,
  agency_name text, agency_contact_name text, agency_email text,
  agency_phone text, agency_address text, lease_reference text,
  visit_contact_type text, visit_contact_name text, visit_contact_email text,
  visit_contact_phone text, visit_instructions text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relouer_requests TO authenticated;
GRANT ALL ON public.relouer_requests TO service_role;
ALTER TABLE public.relouer_requests ENABLE ROW LEVEL SECURITY;
-- policies admin / agent assigné / client owner
```
Même pattern pour les 6 autres tables.

---

## Hors périmètre (Phase 3 séparée)
Matching automatique chercheur ↔ logement (scoring, `property_client_matches`, sections "biens compatibles" / "clients compatibles", notifications).

## Vérifications finales
- `SELECT count(*) FROM clients WHERE journey_type IS NULL` = 0.
- Cendrine absente de `/admin/clients`, présente dans `/admin/relouer`.
- Connexion Cendrine → `/dashboard/relouer`, gestion de son 2.5 pièces.
- Nouveau formulaire Relouer test → lead + `relouer_requests` créés, zéro pollution `/admin/clients`.
- Test critique : un chercheur de **location** reste bien dans `/admin/clients`.
- Mixed → switcher actif dans la sidebar.
- RLS : reloueur A ne voit pas le dossier B.
