## 🎯 Objectif

Remplacer **uniquement la couche visuelle** des 5 calendriers (`PremiumCalendarView` + `PremiumXxxDayEvents`) par un nouveau composant inspiré du design 21st.dev EventManager, **sans casser** :
- Le workflow candidatures (`bail_conclu → attente_bail` + facture finale AbaNinja)
- Les visites (planifiée / proposée / déléguée / feedback avec médias)
- La sync Google Calendar + invitations ICS
- Les filtres par client, les notifications, les RLS, les rôles

## ⚠️ Décision architecturale clé

Je **n'utilise PAS** `npx shadcn add https://21st.dev/r/vaib215/event-manager` directement, parce que :
1. Le composant est en anglais avec un modèle de données générique (`Event { startTime, endTime, color, category }`) qui ne match PAS notre `CalendarEvent` (event_date, event_type, agent_id, client_id, priority, all_day…) ni nos `visites`.
2. Il gère son **propre state interne** (`useState<Event[]>(initialEvents)`) → incompatible avec notre architecture où le state vient de Supabase via `loadData()`.
3. Le code du PDF a des bugs syntaxiques (`> 0 & 0`, JSX cassé).

**À la place** : je crée un **nouveau composant `EventManagerCalendar`** dans `src/components/calendar/` qui :
- **Reprend le design exact** de 21st.dev (header avec navigation, vues Mois/Semaine/Jour/Liste, filtres, dropdowns couleurs/tags/catégories, drag & drop, dialog de détail)
- **Branche directement** sur notre modèle existant `CalendarEvent` + `visites` (pas de conversion lossy)
- **Garde** tous les hooks de callback existants (`onCreate`, `onEdit`, `onDelete`, `onVisiteClick`, etc.)

## 📁 Fichiers créés

### 1. `src/components/calendar/EventManagerCalendar.tsx` (nouveau, ~600 lignes)
Composant principal avec props :
```ts
interface EventManagerCalendarProps {
  events: CalendarEvent[];
  visites?: any[];               // Optionnel selon le rôle
  onDateSelect: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onVisiteClick?: (visite: any) => void;
  onCreateClick?: () => void;
  onDrop?: (item: CalendarEvent, newDate: Date) => void;  // Drag & drop
  defaultView?: 'month' | 'week' | 'day' | 'list';
  role: 'admin' | 'agent' | 'client' | 'coursier' | 'proprietaire';
  categories?: string[];         // Filtres par event_type
  showFilters?: boolean;
}
```

Caractéristiques visuelles (calque 21st.dev) :
- **Header** : titre du mois/semaine + chevrons gauche/droite + bouton "Aujourd'hui" + Select de vue (Mois/Semaine/Jour/Liste) + bouton "+ Nouvel événement"
- **Barre filtres** : Recherche (Input avec icône loupe) + DropdownMenu Couleurs (checkboxes) + DropdownMenu Catégories (checkboxes : Visite/Signature/EDL/RDV tél/Rappel/Tâche/Réunion/Autre) + DropdownMenu Tags + bouton "Effacer filtres" (visible si actifs) + Badges actifs supprimables
- **Vue Mois** : grille 7 colonnes, jour courant surligné en `bg-primary`, événements sous forme de pastilles colorées (max 3 par jour + "+N de plus"), drop zones
- **Vue Semaine** : grille 8 colonnes (heures + 7 jours), créneaux horaires avec lignes, événements positionnés selon `event_date`
- **Vue Jour** : timeline verticale avec heures, événements détaillés
- **Vue Liste** : groupée par date, cartes complètes avec titre, heure, badges couleur/catégorie/tags
- **Drag & drop** : les events peuvent être déplacés entre jours/heures → callback `onDrop`
- **Dialog détail** : modal avec edit inline (titre, description, dates, couleur, catégorie, tags) + boutons Modifier/Supprimer

### 2. `src/components/calendar/event-manager/` (sous-composants)
- `MonthView.tsx`, `WeekView.tsx`, `DayView.tsx`, `ListView.tsx`
- `EventCard.tsx` (carte événement réutilisable)
- `EventFilters.tsx` (barre de filtres)
- `useEventColors.ts` (mapping `event_type` → couleur depuis `eventTypeColors` existant)

### 3. Adapters par rôle
Chaque page calendrier conserve sa logique métier et utilise `EventManagerCalendar` à la place de `PremiumCalendarView` :
- `src/pages/admin/Calendrier.tsx` → remplace `<PremiumCalendarView ... />` par `<EventManagerCalendar role="admin" categories={[...]} ... />`
- `src/pages/agent/Calendrier.tsx` → idem `role="agent"` (garde le workflow candidatures intact)
- `src/pages/client/Calendrier.tsx` → idem `role="client"` (categories restreintes : visite, rdv, signature)
- `src/pages/coursier/Calendrier.tsx` → idem `role="coursier"` (categories : visite_deleguee, mission)
- `src/pages/proprietaire/Calendrier.tsx` → idem `role="proprietaire"`

## 🇫🇷 Localisation française complète

Tous les labels (zéro anglais) :
| 21st.dev (EN) | Notre version (FR) |
|---|---|
| Month / Week / Day / List | Mois / Semaine / Jour / Liste |
| Search events | Rechercher un événement |
| Filter | Filtrer |
| Colors | Couleurs |
| Categories | Catégories |
| Tags | Étiquettes |
| Clear filters | Effacer les filtres |
| New event | Nouvel événement |
| Today | Aujourd'hui |
| Create / Save / Delete | Créer / Enregistrer / Supprimer |
| No events | Aucun événement |

Catégories métier (au lieu de Meeting/Task/Reminder/Personal) :
- `visite` → "Visite"
- `visite_deleguee` → "Visite déléguée" 🔥
- `signature` → "Signature bail"
- `etat_lieux` → "État des lieux"
- `rdv_telephonique` → "RDV téléphonique"
- `rappel` → "Rappel"
- `tache` → "Tâche"
- `reunion` → "Réunion"
- `autre` → "Autre"

Couleurs : réutilise `eventTypeCalendarColors` déjà défini dans `src/components/calendar/types.ts` (pas de duplication).

Dates en français via `date-fns/locale` `fr` (déjà importé partout).

## 🔒 Préservation logique métier

**Aucun fichier suivant n'est touché** :
- `EventForm.tsx` (formulaire création/édition) — réutilisé tel quel dans le dialog
- `PremiumAgentDayEvents.tsx`, `PremiumClientDayEvents.tsx`, etc. — toujours utilisés en sidebar/popup pour le détail métier
- `useGoogleCalendarSync`, `useNotifications`, `AddToCalendarButton`
- Toute la logique `handleUpdateCandidatureStatus`, `handleCreateEvent`, ICS, AbaNinja
- Les RLS, edge functions, `send-calendar-invite`

`PremiumCalendarView.tsx` reste en place (deprecated mais pas supprimé) au cas où on veut rollback rapide.

## 🎨 Cohérence design avec l'app

- Utilise les composants shadcn existants : `Button`, `Card`, `Input`, `Select`, `Dialog`, `Badge`, `DropdownMenu` (tous déjà installés)
- Respecte les tokens du design system (`bg-primary`, `bg-card`, `text-muted-foreground`, etc.) — **PAS de couleurs hardcodées** type `bg-blue-500` en dur
- Mode sombre supporté (déjà actif dans l'app)
- Touch targets ≥44px (respect de la mémoire mobile-optimization)
- Responsive : vue Mois → grille adaptative ; vues Semaine/Jour → scroll horizontal sur mobile ; vue Liste = vue par défaut sur mobile

## 📦 Dépendances

**Aucune nouvelle dépendance npm** — tout est déjà disponible :
- `lucide-react` ✅
- `@radix-ui/*` (via shadcn) ✅
- `date-fns` + `date-fns/locale` ✅
- `framer-motion` (déjà installé pour animations légères) ✅

## ✅ Plan d'implémentation (ordre d'exécution)

1. Créer `src/components/calendar/event-manager/` avec les sous-composants (MonthView, WeekView, DayView, ListView, EventCard, EventFilters)
2. Créer `EventManagerCalendar.tsx` (composant principal qui orchestre les 4 vues)
3. Brancher dans `agent/Calendrier.tsx` (le plus complexe → si OK, les autres suivent)
4. Brancher dans `admin/Calendrier.tsx`
5. Brancher dans `client/Calendrier.tsx`
6. Brancher dans `coursier/Calendrier.tsx`
7. Brancher dans `proprietaire/Calendrier.tsx`
8. Test visuel rapide en preview

## 🧪 Vérification post-implémentation

- [ ] Les 5 calendriers s'affichent avec le nouveau design
- [ ] Vues Mois/Semaine/Jour/Liste fonctionnent
- [ ] Drag & drop déplace bien les events (et persiste en DB pour agent/admin)
- [ ] Filtres recherche / couleurs / catégories opérationnels
- [ ] Création d'événement → toujours envoie ICS + sync Google
- [ ] Workflow candidature `bail_conclu → attente_bail` génère toujours la facture
- [ ] Visites déléguées coursier toujours affichées correctement
- [ ] Aucune régression console (sauf le warning ResizeObserver bénin déjà présent)

## 🚫 Hors périmètre (ne sera PAS fait)

- ❌ Modifier la base de données ou les RLS
- ❌ Toucher aux edge functions (`send-calendar-invite`, etc.)
- ❌ Changer la logique candidatures / factures
- ❌ Supprimer `PremiumCalendarView` (deprecated only)
- ❌ Refonte UX du formulaire `EventForm` (réutilisé tel quel)