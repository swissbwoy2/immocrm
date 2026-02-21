

# Corriger le statut des visites proposees par l'agent

## Probleme actuel

Quand un agent envoie une offre avec des creneaux de visite, les visites sont creees avec le statut **`planifiee`** immediatement. L'agent voit donc "X visites a venir" dans son calendrier, comme si tout etait confirme -- alors que le client n'a peut-etre meme pas vu l'offre.

Le systeme a deja un champ `source: 'proposee_agent'` et des badges visuels ("Creneau propose" en gris vs "Visite confirmee" en bleu), mais le **statut** sous-jacent est le meme (`planifiee`), ce qui cree la confusion.

## Solution

Introduire un nouveau statut **`proposee`** pour les visites creees par l'agent lors de l'envoi d'une offre. La visite ne passera a `planifiee` que lorsque le client choisit un creneau.

### Changements

| Fichier | Modification |
|---|---|
| `src/pages/agent/EnvoyerOffre.tsx` | Changer `statut: 'planifiee'` en `statut: 'proposee'` (ligne 341) lors de la creation de la visite |
| `src/pages/admin/EnvoyerOffre.tsx` | Meme changement pour l'envoi d'offre cote admin |
| `src/pages/agent/Calendrier.tsx` | Exclure les visites `proposee` du compteur "visites a venir" ; les afficher differemment (grise, icone horloge) |
| `src/pages/client/Calendrier.tsx` | Meme exclusion du compteur pour le client |
| `src/components/calendar/PremiumCalendarView.tsx` | Utiliser le statut `proposee` au lieu de `source === 'proposee_agent'` pour determiner la couleur grise |
| `src/components/calendar/PremiumDayEvents.tsx` | Utiliser le statut `proposee` pour afficher le badge "Creneau propose" au lieu de verifier la source |
| `src/components/ResendOfferDialog.tsx` | S'assurer que le renvoi d'offre utilise aussi `statut: 'proposee'` |

### Logique de transition des statuts

```text
Agent envoie offre avec creneaux
       |
       v
  statut: 'proposee'     <-- NOUVEAU (grise dans le calendrier)
       |
  Client choisit un creneau
       |
       v
  statut: 'planifiee'    <-- Comme avant (bleu dans le calendrier)
       |
  Visite effectuee
       |
       v
  statut: 'effectuee'
```

### Impact sur les compteurs

- Le compteur "X visites a venir" dans le calendrier agent ne comptera que les visites `planifiee` (confirmees), pas les `proposee`
- Un compteur separe "X creneaux en attente" sera affiche pour que l'agent sache combien de propositions attendent une reponse client
- Cote client, les creneaux `proposee` apparaitront avec un appel a l'action clair ("Choisissez un creneau")

### Pas besoin de migration SQL

Le champ `statut` est de type `text` sans contrainte CHECK, donc le nouveau statut `proposee` fonctionnera directement sans migration de base de donnees.
