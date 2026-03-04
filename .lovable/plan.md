

## Export calendrier groupé (jour / semaine / mois / année)

### Principe

Ajouter une fonction `generateMultiEventICS` dans `src/utils/generateICS.ts` qui génère un seul fichier `.ics` contenant **plusieurs VEVENT** (le format ICS supporte nativement plusieurs événements dans un même fichier). Puis ajouter un bouton d'export groupé sur la page Visites et le panneau calendrier.

### Modifications

#### 1. `src/utils/generateICS.ts` — Nouvelle fonction multi-événements

Ajouter `generateMultiEventICSContent(events: ICSEventData[])` qui produit un seul VCALENDAR avec N VEVENT à l'intérieur, et `downloadMultiEventICSFile(events, filename)` pour le téléchargement.

#### 2. `src/pages/agent/Visites.tsx` — Bouton d'export groupé

Ajouter un dropdown/select en haut de la page (à côté des filtres existants) avec les options :
- **Aujourd'hui** — exporte toutes les visites du jour
- **Cette semaine** — visites de la semaine en cours
- **Ce mois** — visites du mois en cours
- **Tout** — toutes les visites à venir

Le bouton filtre les visites déjà chargées en mémoire selon la période choisie, génère le fichier `.ics` multi-événements et le télécharge.

#### 3. `src/components/calendar/PremiumAgentDayEvents.tsx` — Export du jour

Ajouter un bouton "Exporter la journée" en haut du panneau latéral droit qui exporte toutes les visites + événements du jour sélectionné en un seul fichier `.ics`.

### Résultat
- Un seul fichier `.ics` contenant toutes les visites de la période → s'importe en une fois sur iPhone, Google Calendar, Outlook
- Export rapide sans avoir à cliquer visite par visite

