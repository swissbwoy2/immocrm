# STEEVE — prompt de référence du personnage

Ce document sert à garder Steeve identique dans le temps : code, retouches et futurs visuels.
Il ne déclenche aucun service de génération. Le modèle validé est en code dans
`src/components/steeve/mascot/steeve-model.js`. Ce fichier fait foi : toute modification doit le respecter.

## Prompt visuel de référence

> Steeve est une mascotte 3D terminal expressive, élégante et sympathique. Silhouette stylisée compacte avec une
> grande tête rectangulaire aux angles très arrondis, en verre dépoli blanc perle : reflets doux, volume épais,
> aspect nacré et translucide. Aucun violet ni rose. Les deux yeux et la bouche sont de véritables volumes
> anthracite, placés devant la coque avec un petit écart visible, et non dessinés sur une texture. Ils restent
> lisibles à petite taille. Conserver les petits signes de terminal et la silhouette de la version validée. Le
> corps porte un vrai costume blanc cassé stylisé : veste distincte, revers, chemise, col, cravate anthracite,
> bouton, détail de poche, pantalon cohérent et chaussures sombres. Les bras, avant-bras, mains et jambes sont
> articulables. Pas de membres flottants ou de pénétrations visibles. Visage expressif : neutre, sourire,
> curiosité, réflexion et sommeil. Éclairage blanc neutre, fond transparent, modèle léger pour le Web. Les
> proportions, vêtements et matériaux restent identiques pendant tous les mouvements.

## Proportions (unités du modèle : hauteur totale ≈ 3,6, Y vers le haut, face vers +Z)

| Élément | Valeur |
|---|---|
| Tête (coque) | demi-axes 0,80 × 0,72 × 0,43 ; profil « coussin » (exposant 0,60) ; centre à y = 2,86 |
| Traits du visage (signes de terminal) | 4 « + » aux coins (±0,60 ; ±0,51) et 2 lignes de 7 tirets (pas 0,145) : en haut les « cheveux », en bas la « barbe ». Tirets 0,098 × 0,034, « + » de 0,136 et 0,034 d'épaisseur, collés à la coque |
| Visage | groupe détaché, 0,56 devant le centre de la tête (dos des pièces à 0,06–0,10 de la coque) |
| Yeux | volumes arrondis 0,13 × 0,265 × 0,10, à x = ±0,285, y = +0,14 |
| Bouche | à y = −0,205 : trait neutre 0,215 × 0,037 ; sourire (tube) ; trois points (réflexion) ; « o » (curiosité) |
| Torse (veste) | centre y = 1,62 ; largeur ≈ 0,98 ; profondeur 0,36 ; col en V jusqu'à y = 0,32 |
| Bras | épaules à (±0,52 ; 2,025) ; manche haute 0,39, avant-bras 0,33, manchette, main 0,185 × 0,18 |
| Jambes | hanches à (±0,205 ; 1,16) ; pantalon continu 0,87 ; chaussures 0,34 × 0,20 × 0,49 + semelle |

## Matériaux (couleurs sRGB)

| Matériau | Couleur | Caractère |
|---|---|---|
| Coque de tête | `#f6f8fa` | verre dépoli nacré : transmission 0,52, rugosité 0,17, vernis 1 |
| Visage, bouton | `#24282b` | anthracite satiné, légèrement métallique |
| Traits du visage (cheveux, barbe, +) | `#2a2f33` | anthracite, comme les yeux, pour rester lisibles à la taille du widget |
| Veste, manches | `#e9eae6` | ivoire, très légère translucidité |
| Revers, poche | `#d9ddda` | satin |
| Chemise, col, manchettes, pochette | `#ffffff` | coton mat |
| Pantalon | `#d9dcda` | ivoire mat |
| Cravate | `#303438` | soie anthracite |
| Chaussures | `#171a1c` | cuir anthracite |
| Mains | `#f3f5f5` | perle, légère translucidité |

Éclairage : environnement de « softbox » procédural (aucune image HDR), lumière hémisphérique, lumière principale
en haut à gauche et contre-jour à droite. Fond toujours transparent.

## Expressions et gestes

- Expressions : neutre, sourire (accueil, invitation, réussite, danse), réflexion (trois points), curiosité
  (bouche « o » et sourcils), sommeil (yeux fermés en arcs).
- Clignement automatique toutes les 4,8 à 7 secondes, jamais pendant la saisie ni le sommeil.
- Gestes : coucou (bras droit levé), invitation, réussite, petite danse, ajustement du col (« stretch »),
  regard circulaire (« curious »), réaction au défilement, sommeil.
- Tous les mouvements sont amortis dans le temps. La tête mène, le corps suit, les membres reviennent au repos.

## Règles de cohérence

1. Pas de violet, de rose ni de nouvelle couleur de marque. Le personnage reste blanc, ivoire et anthracite.
2. Le visage reste en volumes détachés devant la coque. Jamais une texture ni un dessin plat. Les traits
   « cheveux » et « barbe » restent visibles à toutes les tailles.
3. Le costume reste complet (veste, revers, chemise, col, cravate, bouton, poche, pantalon, chaussures).
   Il ne se déforme pas pendant les gestes.
4. Aucun logo, texte publicitaire ni nouveau personnage ajouté au modèle.
5. Le verre appartient à la scène 3D : il ne réfracte pas le contenu HTML derrière le canevas.
6. Toute évolution passe par `steeve-model.js`, sans image plate, vidéo ou scène Spline intégrée.
7. Inspiration de suivi du regard et de matière : « Rememberall-Robot » d'Aayushi Shukla (Spline).
   Aucun modèle ni texture n'en a été extrait.
