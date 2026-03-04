

## Ajouter l'export groupé sur la page Admin Calendrier

### Modification : `src/pages/admin/Calendrier.tsx`

1. **Import** `downloadMultiEventICSFile`, `type ICSEventData` depuis `@/utils/generateICS`, et `isToday`, `isThisWeek`, `isThisMonth`, `isFuture` depuis `date-fns`.

2. **Ajouter un bloc "Exporter au calendrier"** après les filtres (ligne ~420), identique à celui de `src/pages/agent/Visites.tsx` (lignes 1177-1215). Le bloc filtre les `visites` chargées en mémoire par période (aujourd'hui / semaine / mois / tout à venir) et appelle `downloadMultiEventICSFile` avec les événements ICS construits à partir des données de chaque visite (adresse, date, clients via `getClientName`, agent via `getAgentName`, infos offre).

3. **Description enrichie** : utiliser `buildVisiteICSDescription` (déjà importé) pour chaque événement exporté, comme c'est fait dans le bouton individuel du dialog.

### Résultat
L'admin aura les mêmes 4 boutons d'export groupé que l'agent : "Aujourd'hui", "Cette semaine", "Ce mois", "Tout à venir", avec le nombre de visites entre parenthèses.

