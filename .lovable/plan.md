

# Enrichir la fiche mission du coursier avec les details complets de l'offre

## Constat actuel

La boite de dialogue "Details de la mission" du coursier affiche actuellement une version simplifiee de l'offre :
- Seulement 4 champs basiques (pieces, surface, prix, etage) dans une grille
- Description en texte brut
- Lien texte simple vers l'annonce
- Pas de type de bien, pas de disponibilite, pas de commentaires de l'agent

En comparaison, la vue agent (`AgentOffreDetailsDialog.tsx`) affiche :
- Un bloc prix mis en valeur visuellement (gradient)
- Les caracteristiques en 3 colonnes avec style carte (pieces, surface, etage)
- Le type de bien et la disponibilite
- La description avec separateur
- Les informations pratiques stylisees (code immeuble, concierge, locataire) dans des cartes dediees
- Les commentaires de l'agent
- Un apercu visuel de l'annonce via `LinkPreviewCard` (image + titre + favicon)

## Modifications prevues

### Fichier : `src/pages/coursier/Missions.tsx`

Remplacer le bloc "Details du bien" (lignes 337-361) et le bloc "Informations d'acces" (lignes 393-437) par une structure identique a celle de `AgentOffreDetailsDialog.tsx` :

1. **Bloc prix** : Ajouter un encart gradient avec le prix en grand format "CHF X'XXX" et la mention "par mois"

2. **Bloc caracteristiques** : Remplacer la grille 2 colonnes par une grille 3 colonnes avec style carte (fond muted, texte centre, nombre en grand) pour pieces / surface / etage. Ajouter en dessous les lignes "Type de bien" et "Disponibilite" avec icones

3. **Description** : Ajouter un separateur visuel avant la description et utiliser `whitespace-pre-wrap`

4. **Informations pratiques** : Restructurer le bloc code immeuble / concierge / locataire en cartes individuelles avec fond muted, labels en petit texte, et liens telephone cliquables (comme dans la vue agent)

5. **Commentaires agent** : Ajouter un bloc pour `offre.commentaires` avec icone MessageSquare

6. **Apercu de l'annonce** : Remplacer le lien texte simple par le composant `LinkPreviewCard` avec `showInline` pour afficher une carte visuelle avec image et titre

7. **Import** : Ajouter les imports de `Separator`, `ScrollArea`, `LinkPreviewCard`, `Layers` et `Calendar`

## Details techniques

| Element | Avant (coursier) | Apres (aligne sur agent) |
|---------|-------------------|--------------------------|
| Prix | Texte simple dans grille | Encart gradient avec gros chiffres |
| Pieces/Surface/Etage | Grille 2 colonnes texte | 3 cartes centrees stylisees |
| Type de bien | Absent | InfoRow avec icone Building |
| Disponibilite | Absent | InfoRow avec icone Calendar |
| Description | Texte brut sans separateur | Avec Separator et pre-wrap |
| Code immeuble | Texte inline | Carte muted avec icone KeyRound |
| Concierge/Locataire | Texte inline basique | Cartes individuelles avec labels |
| Commentaires | Absent | Bloc dedie avec icone MessageSquare |
| Lien annonce | Texte "Voir l'annonce" | LinkPreviewCard inline (image+titre) |

Les donnees sont deja disponibles car la requete Supabase utilise `offres(*)` qui recupere toutes les colonnes de la table `offres`. Aucune modification de la requete n'est necessaire.

