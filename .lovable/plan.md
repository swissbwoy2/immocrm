

## Ajouter le bouton "Calendrier" au dialog de détail visite admin

Le dialog de détail de visite dans `src/pages/admin/Calendrier.tsx` n'a pas le bouton `AddToCalendarButton`, contrairement aux pages agent.

### Modification : `src/pages/admin/Calendrier.tsx`

1. Ajouter l'import de `AddToCalendarButton` en haut du fichier
2. Insérer le bouton dans le `DialogFooter` (ligne 647), à côté de "Supprimer la visite" et "Ouvrir l'annonce", en utilisant les données de `selectedVisiteGroup[0]` pour construire l'événement ICS (adresse, date, clients concernés)

Le bouton permettra de télécharger un fichier `.ics` contenant la visite sélectionnée, compatible iPhone, Google Calendar et Outlook.

