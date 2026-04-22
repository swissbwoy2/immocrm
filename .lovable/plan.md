

# Refonte UX — Page `Leads Meta Ads` (`/admin/meta-leads`)

## Vision

Appliquer le **même design premium** que Leads Shortlist (Hero pulse + KPI animés + Pipeline Kanban / Liste / Cartes + Side panel détail), tout en exposant **toute la richesse Facebook Lead Ads** : campagne, formulaire, questions/réponses brutes, date Meta native, attribution publicitaire.

```text
┌────────────────────────────────────────────────────────────────┐
│  📣 Leads Meta Ads        [Pipeline] [Liste] [Cartes]          │
│  Pulse : 109 leads · 5 campagnes · 3 nouveaux aujourd'hui      │
│  [Importer CSV] [Sync Meta] [Actualiser]                       │
├────────────────────────────────────────────────────────────────┤
│  ┌──KPI──┐ ┌──KPI──┐ ┌──KPI──┐ ┌──KPI──┐                     │
│  │ Total │ │Quali- │ │Conver-│ │Camp.  │                     │
│  │ 109   │ │fiés 42│ │tis 8  │ │ 5     │                     │
│  └───────┘ └───────┘ └───────┘ └───────┘                     │
├────────────────────────────────────────────────────────────────┤
│  🔍 Recherche      [Statut▾] [Formulaire▾] [Campagne▾] [Période▾]│
├────────────────────────────────────────────────────────────────┤
│  Pipeline 6 colonnes : Nouveau · Contacté · Qualifié ·         │
│                       Non qualifié · Converti · Archivé        │
└────────────────────────────────────────────────────────────────┘
   click card → side panel slide-in (full Facebook details)
```

## Composants & écrans

### 1. Header `MetaLeadsHero`
Réplique de `LeadsHero` :
- Titre "📣 Leads Meta Ads" + pulse temps réel (total · campagnes uniques · nouveaux 24h)
- Toggle de vue **Pipeline | Liste | Cartes**
- Boutons actions : `Importer CSV` · `Sync Meta` · `Actualiser` regroupés dans un menu sur mobile

### 2. Bandeau KPI animés `MetaLeadsKpiStrip`
4 cartes glass animées (AnimatedCounter Framer Motion) :
- **Total leads** + delta 7j
- **Qualifiés** (`lead_status='qualified'`) + ratio % du total
- **Convertis** (`lead_status='converted'`) avec mini ring chart
- **Campagnes actives** (count distinct `campaign_name` ou `form_name` si Meta API absente)

### 3. Filtres unifiés `MetaLeadsFilters`
- Searchbar globale (nom, email, téléphone, ville)
- Filtres compacts : **Statut** · **Formulaire** (dropdown alimenté par les `form_name` distincts) · **Campagne** (alimenté par `campaign_name` distincts) · **Source** (csv_import / meta_api / organic) · **Période**
- Chips "filtres actifs" effaçables
- Chip ★ "À traiter" : `new` + créés < 48h

### 4. Vue Pipeline `MetaLeadsPipeline` (par défaut)
Kanban 6 colonnes alignées sur les `STATUS_OPTIONS` existants :
1. **Nouveau** (`new`) — bleu
2. **Contacté** (`contacted`) — jaune
3. **Qualifié** (`qualified`) — vert
4. **Non qualifié** (`not_qualified`) — gris
5. **Converti** (`converted`) — violet
6. **Archivé** (`archived`) — rouge

Chaque carte (`MetaLeadCard`) :
- Avatar initiales gradient
- Nom + email
- Badge **formulaire** (icône 📋) + badge **source** (`csv_import` orange / `meta_api` bleu Facebook / `organic` vert)
- Si `campaign_name` présent : pastille campagne tronquée
- Date Meta native (`lead_created_time_meta` si présent, sinon `created_at`) en relatif ("il y a 2j")
- Drag-and-drop entre colonnes → UPDATE `lead_status`

### 5. Vue Liste `MetaLeadsListView`
Rows aérées 80px :
- Avatar | Identité (nom + email) | Formulaire | Campagne | Date | Statut | Bouton "Ouvrir"
- Plus de table dense ; actions concentrées dans le side panel

### 6. Vue Cartes `MetaLeadsCardsView`
Grille responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4` pour vue d'ensemble visuelle.

### 7. Side Panel détail `MetaLeadDetailSheet` (Sheet shadcn, side-right desktop / bottom mobile, w=520)

Sections (dans cet ordre, accordéons collapsibles pour densité) :

**A. Identité & Contact**
- Avatar XL + nom complet + statut badge
- Email (clic-to-mail) · Téléphone (clic-to-call + WhatsApp) · Ville · Code postal

**B. Formulaire Facebook** ⭐ NOUVEAU — **section principale**
- **Nom du formulaire** (`form_name`) en titre
- **Date de soumission Meta** (`lead_created_time_meta`) avec format complet `EEEE d MMMM yyyy à HH'h'mm` Europe/Zurich + "il y a Xj"
- **Date d'import dans le CRM** (`imported_at`) en sous-texte
- **Questions/Réponses du formulaire** :
  - Si `raw_answers` (JSONB) présent → boucle `Object.entries()` avec UI question/réponse stylée :
    ```text
    ┌────────────────────────────────────────┐
    │ 🟦 Quel type de bien recherchez-vous ? │
    │    → Appartement 3.5 pièces            │
    ├────────────────────────────────────────┤
    │ 🟦 Quel est votre budget mensuel ?     │
    │    → 2'500–3'000 CHF                   │
    └────────────────────────────────────────┘
    ```
  - Si `raw_answers` absent mais `raw_meta_payload.field_data` présent (format Meta API natif) → fallback sur ce champ
  - Si CSV import → afficher les champs reconstitués depuis `raw_meta_payload` (budget, type_recherche, etc.)
  - État vide stylé "Aucune réponse de formulaire enregistrée"

**C. Attribution publicitaire** (collapsible, replié par défaut si vide)
- **Campagne** : `campaign_name` + ID
- **Adset** : `adset_name` + ID
- **Annonce** : `ad_name` + ID
- **Page Facebook** : `page_name` + ID
- **Référence pub** : `ad_reference_label` avec lien `ad_reference_url` (ouvre dans nouvel onglet)
- Badge "Organique" si `is_organic=true`

**D. UTM & Tracking** (collapsible, pour leads CSV)
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` extraits de `raw_meta_payload`

**E. Gestion CRM**
- **Statut** (Select) avec les 6 options
- **Assigné à** (Select agents actifs)
- **Notes** (Textarea, sauvegarde auto debounced 800ms)

**F. JSON brut Meta** (collapsible, dev/debug)
- Bloc `<pre>` avec `JSON.stringify(raw_meta_payload, null, 2)` pour inspection complète
- Bouton "Copier JSON"

**G. Actions principales** (footer sticky)
- 🚀 Convertir en client (créer une entrée `clients` depuis le lead)
- ✉️ Envoyer email de relance
- ☎️ Marquer contacté
- 🗑️ Archiver (soft) / Supprimer (danger zone)

### 8. Hot Leads — Carrousel `MetaLeadsHotCarousel`
Au-dessus du pipeline, prioritaires :
- Leads `new` créés < 24h (jamais touchés)
- Leads `qualified` non assignés
- Cards horizontales avec CTA direct "Assigner" / "Contacter"

### 9. Détails techniques
- **Animations** : Framer Motion `layout`, `AnimatePresence`, AnimatedCounter
- **Drag-and-drop** : `@dnd-kit/core` (déjà installé) — UPDATE `lead_status` au drop
- **Realtime** : nouveau hook `useMetaLeadsRealtime` (subscription `meta_leads` INSERT/UPDATE) → refresh automatique des colonnes
- **Mobile** : Pipeline en swipe `snap-x snap-mandatory`, side panel en bottom-sheet `<md`, filtres en scroll horizontal, touch targets 44px
- **Couleurs** : tokens semantic existants, badges source aux couleurs Meta (bleu Facebook `#1877F2` pour meta_api)
- **Accessibilité** : focus visible, ARIA labels, support `prefers-reduced-motion`

## Données & logique

**Aucune migration DB nécessaire** — toutes les colonnes existent (`raw_answers`, `raw_meta_payload`, `lead_created_time_meta`, `campaign_name`, `form_name`, `lead_status`, `assigned_to`, `notes`, etc.)

Détection Q&A multi-format (priorité descendante) :
1. `raw_answers` (JSONB clé/valeur direct)
2. `raw_meta_payload.field_data` (format Meta API natif : `[{name, values:[]}]`)
3. `raw_meta_payload` aplati (pour leads CSV migrés : budget, type_recherche, etc.)

Conversion en Client : nouveau bouton qui crée une ligne `clients` depuis le lead Meta + marque `lead_status='converted'`.

## Fichiers touchés

```text
[REWRITE] src/pages/admin/MetaLeads.tsx                        (orchestrateur léger)
[NEW]     src/components/admin/meta-leads/types.ts             (MetaLead, STAGES, helpers)
[NEW]     src/components/admin/meta-leads/MetaLeadsHero.tsx    (header pulse + toggle)
[NEW]     src/components/admin/meta-leads/MetaLeadsKpiStrip.tsx (4 KPI animés)
[NEW]     src/components/admin/meta-leads/MetaLeadsFilters.tsx (search + chips + filtres)
[NEW]     src/components/admin/meta-leads/MetaLeadsPipeline.tsx (Kanban 6 colonnes dnd)
[NEW]     src/components/admin/meta-leads/MetaLeadsListView.tsx (liste aérée)
[NEW]     src/components/admin/meta-leads/MetaLeadsCardsView.tsx (grille fiches)
[NEW]     src/components/admin/meta-leads/MetaLeadCard.tsx     (carte réutilisable)
[NEW]     src/components/admin/meta-leads/MetaLeadsHotCarousel.tsx (priorités)
[NEW]     src/components/admin/meta-leads/MetaLeadDetailSheet.tsx (side panel détaillé Q&A)
[NEW]     src/components/admin/meta-leads/MetaFormAnswers.tsx  (composant Q&A multi-format)
[NEW]     src/hooks/useMetaLeadsRealtime.ts                    (subscription meta_leads)
[KEEP]    Dialog Sync Meta + Dialog Import CSV existants (déplacés dans menu actions Hero)
```

## Validation

1. Page `/admin/meta-leads` reproduit exactement la même UX premium que `/admin/leads`
2. Les 109 leads CSV migrés s'affichent correctement avec leurs métadonnées (budget, type_recherche dans Q&A)
3. Pipeline 6 colonnes alimenté par `lead_status` ; drag-and-drop met à jour la DB en realtime
4. Side panel affiche **toutes** les questions/réponses du formulaire Facebook avec design soigné
5. Date Meta native (`lead_created_time_meta`) affichée distinctement de la date d'import
6. Attribution complète visible : campagne, adset, ad, page Facebook, référence pub avec lien
7. Bloc JSON brut accessible pour debug
8. KPI animés et carrousel "À traiter" fonctionnels
9. Realtime : nouveau lead Meta synchronisé apparaît automatiquement
10. Mobile : pipeline swipe, side panel bottom-sheet, filtres scrollables — aucun overflow horizontal
11. Aucune régression sur les fonctions existantes (Sync Meta, Import CSV, edit notes/statut/assigné)

