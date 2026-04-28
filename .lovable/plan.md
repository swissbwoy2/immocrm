# Module de Formation Agents — Logisorama Academy

Module complet intégré dans l'app, accessible depuis le menu agent. Combine **maîtrise de l'outil Logisorama** (priorité #1) + **savoir-faire métier de relocation** (basé sur le PDF fourni) + **Flatfox.ch** ajouté.

## Accès

- Entrée menu agent **« Formation »** (icône `GraduationCap`) dans une nouvelle section "Aide & Formation" de la sidebar
- Route index : `/agent/formation`
- Route chapitre : `/agent/formation/:chapitreId`
- Bouton « Centre de formation » sur le Dashboard agent

## Structure des chapitres (12 chapitres)

### Partie A — Maîtrise de l'application Logisorama (priorité)

**1. Bienvenue & Philosophie**
- Présentation Logisorama by Immo-rama.ch
- Valeurs : simplicité, facilité, efficacité
- Vue d'ensemble du parcours agent et de ce module

**2. Tour de l'interface agent**
- **Sidebar** : toutes les sections (Tableau de bord, Mes Clients, Candidatures, Visites, Calendrier, Documents, Messagerie, Boîte de réception, Offres, Transactions, Carte, Contacts, Propriétaires, Biens en vente, Notifications, Paramètres)
- **Dashboard agent** : KPIs (clients actifs, visites de la semaine, offres en cours, commissions du mois), filtres de période
- **Notifications** : cloche, badges par type (nouveau message, candidature, activation client…)
- **Messagerie flottante** : chat instantané avec admin/clients
- **Mode hors-ligne** et **PWA** (installer l'app sur mobile/iOS)
- **Présence en ligne** (badge vert, mise à jour 60s)

**3. Mes Clients & vue détaillée**
- Liste, filtres, statuts (actif, reloge, suspendu, stoppé)
- Fiche client : onglets Info, Documents, Candidatures, Visites, Notes, Historique
- **Co-assignation** (`client_agents`) : un client peut être suivi par plusieurs agents
- Mandats : statut, gel automatique en cas de reloge/suspendu/stoppé
- Vérification mensuelle des documents (cycle du 25 au 5)

**4. Tri & suivi des dossiers (workflow Logisorama)**
- Filtres par statut, NPA, type de bien, nombre de pièces (incréments 0.5)
- Documents requis et déduplication (`nom_type_document` unique)
- Visibilité des documents et règles de transfert
- Historique d'actions visibles selon `agent_id`
- Checklist quotidienne du tri matinal

**5. Calendrier & Visites**
- Vue calendrier, synchronisation Google Calendar
- Cycle de vie d'une visite : **proposée → confirmée → effectuée → debrief**
- Délégation à un coursier (5.- CHF par visite, payés par l'agent)
- Invitations ICS automatiques (timezone Europe/Zurich)
- Prévention des doublons (index unique de booking)

**6. Messagerie, Boîte de réception & Emails**
- Messagerie interne (admin ↔ agent ↔ client)
- Boîte de réception emails synchronisée
- Envoi d'emails depuis l'app, historique, templates
- Bonnes pratiques de communication

### Partie B — Métier de la relocation (issu du PDF)

**7. Accueil & Qualification du client**
- Premier contact, écoute active, reformulation
- Critères : situation, type de bien, zone, budget (règle du 1/3 du revenu), date cible
- Présentation du service Immo-Rama (acompte 300.-, mandat 3 mois renouvelable, satisfait ou remboursé, commission = 1 mois loyer brut)
- Script d'appel modèle

**8. Mandat & dossier de candidature complet**
- Signature mandat via **Mandat V3** dans Logisorama
- Pièces obligatoires : ID, 3 fiches de salaire, attestation OP < 3 mois, attestation employeur, etc.
- Vérification de cohérence (salaire annoncé vs fiches, adresse OP, traductions)
- Constitution d'un dossier "prêt à postuler"

**9. Recherche active de logements** *(inclut Flatfox.ch)*
- **Sites d'annonces** (grille interactive avec logos cliquables) :
  - **Flatfox.ch** *(ajouté — manquait dans le PDF)*
  - Homegate.ch
  - ImmoScout24.ch
  - Immobilier.ch (agrégateur romand)
  - Newhome.ch
  - Comparis.ch (comparateur)
  - Anibis.ch (petites annonces)
  - Groupes Facebook locaux
- Création d'alertes quotidiennes
- Tableau de suivi des biens repérés
- Off-market via réseau Immo-Rama
- Réactivité : agir vite

**10. Communication régies & propriétaires**
- Scripts d'appel (avec bouton "Copier")
- Modèles d'emails de prise de contact et d'envoi de dossier
- "Vendre" la candidature dès le premier échange
- Registre des échanges

**11. Visites & envoi d'offres**
- Checklist organisation d'une journée de visites
- Fiche critères à emporter, débrief client après visite
- **Envoi d'offre dans Logisorama** : contraintes (lien `client_agents` requis, slot de visite obligatoire)
- Lettre de motivation personnalisée pour dossiers convoités

**12. Suivi jusqu'aux clés & conclusion**
- Relances client/régie
- Signature du bail, état des lieux d'entrée
- **Clés remises** dans Logisorama → déclenche automatiquement la transaction
- Commission : split 45% agent / 55% agence (location = loyer seul, hors TVA)
- Archivage du dossier

**Bonus — Quiz final** : 10 questions tirées des chapitres, score affiché, badge "Agent certifié Logisorama" stocké en base.

## Composition d'un chapitre (blocs typés)

Moteur de rendu unique consommant un tableau déclaratif de blocs :

- `text` — markdown (titres, paragraphes, listes)
- `video` — lecteur natif 16:9, poster, placeholder « Vidéo bientôt disponible » si pas encore d'URL
- `screenshot` — capture annotée de l'interface Logisorama
- `feature-tour` — carte avec icône + nom de section + lien direct vers la page (ex: « Ouvrir Mes Clients »)
- `checklist` — cases cochables, **persistance Supabase par agent**
- `tip` / `warning` / `info` — encarts colorés
- `table` — tableaux d'exemple
- `script` — script d'appel / email avec bouton "Copier"
- `sites-grid` — grille de sites d'annonces (chapitre 9, logos depuis `src/assets/partners/`)
- `quiz` — QCM avec feedback immédiat
- `cta` — bouton vers une vraie page Logisorama

## Suivi de progression

Migration SQL (schema) :
```sql
create table public.formation_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  chapitre_id text not null,
  completed_at timestamptz,
  checklist_state jsonb not null default '{}',
  quiz_score int,
  updated_at timestamptz not null default now(),
  unique(user_id, chapitre_id)
);
alter table public.formation_progress enable row level security;
create policy "read own" on public.formation_progress
  for select using (auth.uid() = user_id or has_role(auth.uid(),'admin'));
create policy "insert own" on public.formation_progress
  for insert with check (auth.uid() = user_id);
create policy "update own" on public.formation_progress
  for update using (auth.uid() = user_id);
```

- Barre de progression globale sur l'index (X/12 chapitres)
- Badge "Nouveau" sur chapitres < 14 jours
- Bouton "Reprendre où je m'étais arrêté"

## UI / UX

- **Index** : hero avec progression + 2 sections de cartes (« L'application » + « Le métier ») clairement séparées
- **Chapitre** : layout 2 colonnes desktop (sommaire latéral sticky avec scroll-spy + contenu), single column mobile avec sommaire repliable, navigation chapitre précédent/suivant en pied de page
- Mobile-first : touch ≥ 44px, vidéos 16:9 responsive
- Réutilisation `Card`, `Progress`, `Checkbox`, `Badge`, `Button`
- Mode sombre supporté

## Évolutivité

- Ajouter/modifier un chapitre = éditer 1 fichier `src/features/formation/content/<id>.ts` puis l'enregistrer dans le registre. **Aucune migration nécessaire**
- Vidéos uploadées via Supabase Storage bucket `formation-videos` (lecture publique, écriture admin) — bucket créé quand vous fournirez les premières vidéos
- Checklists et quiz déclaratifs

## Fichiers créés

- `src/features/formation/types.ts`
- `src/features/formation/content/index.ts` + 12 fichiers chapitres
- `src/features/formation/components/{BlockRenderer,ChapterCard,ChapterSidebar,InteractiveChecklist,QuizBlock,VideoBlock,ScriptBlock,SitesGrid,FeatureTour}.tsx`
- `src/features/formation/hooks/useFormationProgress.ts`
- `src/pages/agent/Formation.tsx` (index)
- `src/pages/agent/FormationChapitre.tsx` (détail)

## Fichiers modifiés

- `src/App.tsx` — 2 routes lazy
- `src/components/AppSidebar.tsx` — entrée "Formation" agent

## Hors périmètre V1

- Upload vidéos via UI admin (à ajouter dans Paramètres plus tard)
- Certificat PDF de fin de formation
- Notifications de rappel "complétez votre formation"
- Dashboard admin de suivi des progressions agents
- Traductions (FR uniquement)
