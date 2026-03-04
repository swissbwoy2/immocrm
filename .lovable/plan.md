

## Ajouter le bouton "Calendrier" aux endroits manquants

Le bouton `AddToCalendarButton` existe dans le code mais n'est visible que sur les cartes de visite de la page Visites (petit icone sans label). Il manque a deux endroits cles visibles dans les captures d'ecran :

### 1. Panel droit du Calendrier agent (`PremiumAgentDayEvents.tsx`)

Ajouter un `AddToCalendarButton` dans chaque carte de visite groupee, juste avant les boutons d'action (autour de la ligne 408). Le bouton sera place apres les details clients et avant "Marquer comme effectuee".

```text
// Apres la section clients (~ligne 386), avant les action buttons (~ligne 408)
<AddToCalendarButton
  event={{
    title: `Visite - ${firstVisite.adresse}`,
    description: `${group.length} client(s)`,
    location: firstVisite.adresse,
    startDate: toSwissTime(firstVisite.date_visite),
  }}
  size="sm"
  variant="outline"
  className="w-full"
/>
```

Import a ajouter en haut du fichier : `import { AddToCalendarButton } from './AddToCalendarButton';`

### 2. Dialog de detail de visite (`Visites.tsx`)

Ajouter le bouton dans le `DialogFooter` du Detail Dialog (ligne 1574), a cote des boutons existants (Accepter/Refuser/Supprimer).

```text
// Dans DialogFooter, ajouter avant le bouton Supprimer (~ligne 1611)
<AddToCalendarButton
  event={{
    title: `Visite - ${selectedVisite?.adresse}`,
    description: `Visite pour ${selectedVisite?.client_profile?.prenom} ${selectedVisite?.client_profile?.nom}`,
    location: selectedVisite?.adresse || '',
    startDate: new Date(selectedVisite?.date_visite),
  }}
  recipientEmail={selectedVisite?.client_profile?.email}
  size="sm"
  variant="outline"
/>
```

### Resultat
- Le bouton "Calendrier" sera visible sur le panneau droit du calendrier agent et dans le dialog de detail des visites
- Compatible iPhone (telecharge .ics), Google Calendar, Outlook

