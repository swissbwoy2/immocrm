

# Affichage complet des horaires de visite pour le coursier

## Probleme

1. **Heure de fin manquante** : Les cartes de mission et le dialogue de detail n'affichent que l'heure de debut (ex: "jeu. 12 fevr. a 18:00") mais pas l'heure de fin (`date_visite_fin`). Le coursier ne sait pas combien de temps dure la visite.

2. **Dialogue trop sommaire** : Le dialogue de detail du coursier est un dialogue custom alors que l'utilisateur souhaite qu'il soit aussi complet que la vue `AgentOffreDetailsDialog` utilisee par les agents.

## Solution

### Modification de `src/pages/coursier/Missions.tsx`

**1. Afficher l'heure de fin sur les cartes de mission (ligne ~162-165)**

Remplacer l'affichage de la date/heure pour inclure `date_visite_fin` quand il existe :

- Avant : `jeu. 12 fevr. a 18:00`
- Apres : `jeu. 12 fevr. de 18:00 a 18:30`

Si `date_visite_fin` est null, garder le format actuel.

**2. Afficher l'heure de fin dans le header du dialogue de detail (ligne ~306)**

Meme logique : afficher le creneau complet "de HH:mm a HH:mm" quand `date_visite_fin` existe.

**3. Ajouter une section "Creneau de visite" dans le dialogue de detail**

Ajouter un bloc visuel bien visible (avec icone Clock) montrant clairement :
- Date complete
- Heure de debut -> heure de fin
- Duree estimee (calcul automatique)

Cela sera place juste apres le prix et avant les caracteristiques.

### Modification de `src/pages/coursier/Carte.tsx`

Meme correction pour les cartes de la page Carte : afficher le creneau complet dans les info-bulles et la liste laterale.

### Resume des fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/coursier/Missions.tsx` | Affichage heure de fin dans les cartes + dialogue de detail + section creneau |
| `src/pages/coursier/Carte.tsx` | Affichage heure de fin dans la liste laterale et les info-bulles de la carte |

### Detail technique

Format d'affichage conditionnel :
```typescript
// Si date_visite_fin existe
const startTime = format(new Date(mission.date_visite), "HH:mm");
const endTime = format(new Date(mission.date_visite_fin), "HH:mm");
// -> "jeu. 12 fevr. de 18:00 a 18:30"

// Sinon
// -> "jeu. 12 fevr. a 18:00"
```

Pas de modification de base de donnees necessaire, le champ `date_visite_fin` existe deja dans la table `visites`.
