
# Corrections sur la page Admin/Mandats

## 1. Fixer la barre de progression pour les clients reloges

Actuellement, les clients avec `statut = 'reloge'` continuent d'afficher une barre de progression active et un compteur "J+X" qui s'incremente. 

**Correction :** Quand `client.statut === 'reloge'`, on fige la barre a 100% en vert, on affiche un badge "Reloge" au lieu du compteur, et on masque l'alerte "Proche expiration".

## 2. Ajouter les boutons "Suspendre" et "Stopper" le mandat

Deux nouveaux boutons d'action seront ajoutes sur chaque carte client :

- **Suspendre le mandat** : passe le statut du client a `suspendu` (bouton orange, icone Pause). Un dialog de confirmation sera affiche.
- **Stopper le mandat** : passe le statut du client a `stoppe` (bouton rouge, icone StopCircle). Un dialog de confirmation sera affiche.

Les clients suspendus ou stoppes auront egalement leur barre de progression figee avec un style visuel distinct (orange pour suspendu, rouge pour stoppe).

## Fichier modifie

| Fichier | Modifications |
|---|---|
| `src/pages/admin/Mandats.tsx` | - Detection du statut `reloge`/`suspendu`/`stoppe` pour figer la progression - Ajout des boutons Suspendre et Stopper avec dialogs de confirmation - Badges visuels adaptes - Masquage des alertes pour les mandats figes |

## Detail technique

### Logique de progression figee (lignes 466-549)
```text
Si client.statut === 'reloge'  -> progress=100, barre verte, badge "Reloge", pas de compteur J+
Si client.statut === 'suspendu' -> progress figee, barre orange, badge "Suspendu"
Si client.statut === 'stoppe'   -> progress figee, barre rouge, badge "Stoppe"
```

### Nouveaux boutons (lignes 559-618)
- Bouton "Suspendre" avec icone Pause (variant warning/outline)
- Bouton "Stopper" avec icone StopCircle (variant destructive)
- Chacun ouvre un dialog de confirmation avant de mettre a jour le statut en base

### Nouveaux filtres dans les stats
- Ajout d'un compteur "Reloges" dans les stats en haut de page
- Le filtre statut integrera les nouveaux etats

### Pas de migration necessaire
Le champ `statut` sur la table `clients` est deja un champ texte qui accepte toute valeur. Les nouvelles valeurs `suspendu` et `stoppe` seront simplement inserees via UPDATE.
