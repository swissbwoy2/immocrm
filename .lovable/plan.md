

# Refonte UX — Page `Leads Shortlist` (`/admin/leads`)

## Diagnostic actuel

La page est aujourd'hui un **gros tableau dense** (7 colonnes, ~10 infos par ligne, 12 boutons icônes par row, filtres en `Select` côté gauche et boutons CSV à droite). Elle ressemble effectivement à un export Excel : pas de hiérarchie visuelle, pas de pipeline, pas de focus sur "qui appeler maintenant".

## Vision cible

Transformer la page en **CRM commercial premium** orienté action, avec 3 vues, des KPI animés, un pipeline Kanban, et un panneau latéral détail (au lieu de tout afficher dans la table).

```text
┌────────────────────────────────────────────────────────────────┐
│  🎯 Leads Shortlist          [Pipeline] [Liste] [Cartes]       │
│  Pulse : 47 leads · 12 RDV · 5 chauds aujourd'hui              │
├────────────────────────────────────────────────────────────────┤
│  ┌──KPI──┐ ┌──KPI──┐ ┌──KPI──┐ ┌──KPI──┐                     │
│  │ Total │ │ RDV   │ │ Quali │ │ Taux  │  (animés Framer)     │
│  │  47 ↑ │ │ tél 12│ │ 28    │ │ 59%   │                     │
│  └───────┘ └───────┘ └───────┘ └───────┘                     │
├────────────────────────────────────────────────────────────────┤
│  🔍 Recherche globale    [Type ▾] [Source ▾] [Période ▾]      │
├────────────────────────────────────────────────────────────────┤
│  Vue PIPELINE (par défaut) :                                   │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐          │
│  │Nouveau  │RDV pris │Contacté │Qualifié │Client   │          │
│  │ (12)    │ (8)     │ (15)    │ (7)     │ (5)     │          │
│  │ ┌─────┐ │ ┌─────┐ │         │         │         │          │
│  │ │card │ │ │card │ │         │         │         │          │
│  │ └─────┘ │ └─────┘ │         │         │         │          │
│  └─────────┴─────────┴─────────┴─────────┴─────────┘          │
└────────────────────────────────────────────────────────────────┘
   click card → side panel slide-in (détail + actions)
```

## Composants & écrans

### 1. Header animé `LeadsHero`
- Titre + sous-titre "pulse" temps réel : "47 leads · 12 RDV téléphoniques · 5 nouveaux aujourd'hui"
- Toggle de vue segmenté : **Pipeline** | **Liste** | **Cartes**
- Boutons primaires (Relancer tous, Importer CSV, Exporter) regroupés dans un menu actions à droite pour désencombrer

### 2. Bandeau KPI animés
4 cartes glass animées (Framer Motion + AnimatedCounter) :
- **Total leads** (variation 7j en delta)
- **RDV téléphoniques** (`en_attente` orange + `confirme` vert)
- **Qualifiés** (% du total)
- **Taux de contact** (contacted/total avec mini ring chart SVG animé)

Chaque carte cliquable → applique un filtre rapide.

### 3. Barre de filtres unifiée
- Une seule **searchbar globale** (nom/email/téléphone/localité)
- Filtres compacts : Type · Source · Statut · Période (7j/30j/all) · "Avec RDV téléphonique"
- Chip "filtres actifs" effaçables individuellement
- Chip ★ "Hot leads" : qualifiés + non contactés + RDV à venir < 48h

### 4. Vue Pipeline (par défaut) — `LeadsPipelineBoard`
Kanban avec 5 colonnes :
1. **Nouveau** (créé < 24h, non contacté)
2. **RDV téléphonique** (a un `lead_phone_appointments`)
3. **Contacté** (`contacted=true`)
4. **Qualifié** (`is_qualified=true`)
5. **Converti en client** (lead avec compte client lié)

Chaque carte lead :
- Avatar initiales gradient
- Nom + ville + budget
- Badges type (🔑/🏠/🏢) + source
- Si RDV : pastille orange "📞 Sam 14h30" / verte si confirmé
- Hover → ombre + cursor-pointer + actions rapides flottantes

Drag-and-drop entre colonnes pour changer le statut (`@dnd-kit/core` déjà compatible). Animation fluide Framer Motion `layout`.

### 5. Vue Liste premium (alternative à Pipeline, pas la table actuelle)
Liste verticale aérée avec rows épaisses (80px) :
- Avatar | Identité | Recherche | Source | RDV | Statut | 1 bouton "Ouvrir" (→ side panel)
- Plus de 12 boutons par ligne — actions concentrées dans le side panel

### 6. Vue Cartes
Grille responsive 3-4 colonnes de cartes "fiche lead" pour vue d'ensemble visuelle (utile pour briefing matinal).

### 7. Side Panel détail `LeadDetailSheet` (Sheet shadcn slide right, w=480)
Remplace les ~12 boutons par ligne. Sections :
- **Identité & contact** (clic-to-call, clic-to-email, clic-to-WhatsApp)
- **RDV téléphonique** : date, statut, bouton "Confirmer + envoyer .ics" (intégration existante)
- **Qualification** : checks visuels (salarié, permis, poursuites, garant) avec icônes vert/rouge
- **Origine & UTM** : carte synthétique
- **Actions principales** (boutons larges, pas icônes) :
  - 🚀 Inviter comme client (existant)
  - ✉️ Envoyer relance email (existant)
  - ☎️ Marquer contacté
  - 📝 Notes (textarea inline, sauvegarde auto debounced)
  - 🗑️ Supprimer (en bas, danger zone)
- Timeline activités (créé / RDV / contacté / qualifié / invité)

### 8. Hot Leads — Carrousel haut
Au-dessus du pipeline, un carrousel horizontal "🔥 À traiter en priorité" :
- RDV téléphonique dans les prochaines 24h non confirmés
- Leads qualifiés non contactés depuis > 48h
- Cards horizontales avec CTA direct "Confirmer RDV" / "Appeler maintenant"

### 9. Détails techniques UI
- **Animations** : `framer-motion` `layout`, `AnimatePresence` sur les cartes, KPI counter animé, transitions douces 200ms
- **Couleurs** : conformes aux tokens existants (semantic), pas de texte clair sur fond clair (validation contraste)
- **Mobile** : Pipeline → swipe horizontal entre colonnes, Liste responsive, side panel devient bottom sheet
- **Accessibilité** : touch targets 44px, `cursor-pointer` partout, focus visible, labels ARIA, support `prefers-reduced-motion`
- **Realtime** : abonnement Supabase sur `leads` + `lead_phone_appointments` pour mise à jour live des colonnes

## Données & logique

Aucune **migration DB nécessaire**. Toute la logique utilise les colonnes existantes :
- `contacted`, `is_qualified`, `type_recherche`, `created_at` → colonnes pipeline
- `lead_phone_appointments.status` → colonne RDV
- Détection "converti en client" : LEFT JOIN sur `clients.email = leads.email`
- Drag-and-drop déclenche `UPDATE leads SET contacted/is_qualified` selon colonne cible

## Fichiers touchés

```text
[REWRITE] src/pages/admin/Leads.tsx                       (orchestrateur léger : header + KPI + tab vues)
[NEW]     src/components/admin/leads/LeadsHero.tsx        (header pulse + toggle vue)
[NEW]     src/components/admin/leads/LeadsKpiStrip.tsx    (4 KPI animés)
[NEW]     src/components/admin/leads/LeadsHotCarousel.tsx (carrousel priorités)
[NEW]     src/components/admin/leads/LeadsFilters.tsx     (search + chips)
[NEW]     src/components/admin/leads/LeadsPipeline.tsx    (Kanban dnd-kit + Framer)
[NEW]     src/components/admin/leads/LeadsListView.tsx    (liste aérée 1 row 80px)
[NEW]     src/components/admin/leads/LeadsCardsView.tsx   (grille fiches)
[NEW]     src/components/admin/leads/LeadCard.tsx         (carte lead réutilisable)
[NEW]     src/components/admin/leads/LeadDetailSheet.tsx  (side panel détail + actions)
[NEW]     src/components/admin/leads/AnimatedCounter.tsx  (compteur animé Framer)
[NEW]     src/hooks/useLeadsRealtime.ts                   (subscription leads + RDV)
[KEEP]    Dialogs Relance + Import CSV existants (déplacés dans menu actions)
```

## Validation

1. Pipeline visible par défaut, 5 colonnes alimentées correctement
2. Drag d'une carte de "Nouveau" → "Contacté" met à jour la DB en realtime
3. KPI animent au chargement et changent live après une action
4. Carrousel "Hot Leads" affiche les RDV à venir + qualifiés froids
5. Click carte → side panel s'ouvre avec toutes les infos + actions
6. Toutes les fonctions existantes (relance, invite client, confirm RDV, notes, delete, import/export CSV) sont préservées et accessibles via le side panel ou menu actions
7. Mobile : pipeline en swipe, side panel en bottom sheet
8. Aucun problème de contraste (vérifié light + dark)
9. Realtime : nouveau lead apparaît dans "Nouveau" sans refresh
10. Aucune migration ni régression sur la table `leads`

