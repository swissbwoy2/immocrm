# STEEVE — référence du personnage

Ce document sert à garder Steeve identique dans le temps. Il ne déclenche aucun service de génération.
Le modèle en code fait foi : `src/components/steeve/mascot/steeve-model.js`.
Il vient du pack « steeve-3d-logisorama-v1 » (25.10.2026), seule référence à partir de cette version.
L'ancien robot du kit « steeve-cursor-kit 3 » est abandonné.

Sources maîtres (dans le pack) :
- `references/01-corps-face-trois-quarts-profil.png` ;
- `references/02-tete-visage-tenue.png`.

Référence historique : le grand Steeve des flyers, pas la miniature ancienne dans l'ordinateur.

## Prompt visuel de référence

> Mascotte 3D compacte et sympathique, blanche, en costume ivoire, avec une tête surdimensionnée en rectangle
> arrondi. Tête épaisse, douce, légèrement bombée, face laiteuse claire et pourtour blanc nacré brillant. Yeux
> noirs verticaux en forme de pilule et petite bouche noire souriante, en volumes séparés, lisibles à la taille
> d'un bouton Web. Petit tiret « − » en haut à gauche, signe « + » en haut à droite et discret repère au bord
> droit. Aucun nez, oreille, antenne, cheveu, visage plein noir ou nouvel emblème. Veste ivoire à texture fine de
> tissu, revers crantés, chemise blanche à col pointu, cravate anthracite, un bouton noir, deux poches basses à
> rabat. Pantalon droit assorti. Mains blanches arrondies avec une petite transition sombre au poignet.
> Chaussures noires arrondies, légèrement brillantes, semelles sombres. Éclairage de studio neutre, reflets
> modérés, aucun violet ni rose, fond transparent.

## Proportions (unités du modèle : hauteur 3,8, Y vers le haut, face vers +Z)

| Élément | Valeur |
|---|---|
| Tête | boîte arrondie 1,80 × 1,47 × 0,98 (rayon 0,30), centre à y = 3,065 |
| Pourtour et face | anneau poli 1,744 × 1,412 ; face laiteuse bombée 1,49 × 1,157 |
| Yeux | pilules 0,16 × 0,345, à x = ±0,381 |
| Bouche | sourire sculpté de 0,27 de large, à y = −0,34 |
| Signes | « − » à (−0,454 ; 0,443), « + » à (0,479 ; 0,443), repère fin au bord droit |
| Torse | veste 1,10 × 1,19, profondeur 0,42, centre à y = 1,75 |
| Bras | épaules à (±0,59 ; 2,18), repos inclinés de 0,19 rad ; manche haute 0,58, avant-bras 0,47, moufle |
| Jambes | hanches à (±0,299 ; 1,19) ; pantalon 1,025 ; chaussures 0,49 × 0,29 × 0,74 |

## Matériaux (couleurs sRGB)

| Matériau | Couleur |
|---|---|
| Coque de tête (céramique nacrée) | `#f4f4f2` |
| Face laiteuse, pourtour poli | `#fafafa` |
| Yeux, bouche, expressions | `#070909` |
| Signes « − » et « + », bouton | `#181a19` |
| Costume (laine ivoire, micro-tissage) | `#e9e5da` ; revers `#eeeadf` |
| Chemise | `#ffffff` |
| Cravate | `#151718` |
| Mains | `#f6f6f4` |
| Chaussures et semelles | `#101212` / `#101110` |

## Expressions (volumes noirs ajoutés, masqués au repos)

| Expression | Visage |
|---|---|
| neutre | yeux pilules, sourire du personnage |
| smile | sourire élargi |
| laugh | yeux rieurs (∩ ∩), grande bouche ouverte |
| wink | œil gauche ouvert, œil droit rieur |
| surprise | yeux agrandis, sourcils levés, bouche en « o » |
| sad | sourcils en accent, bouche à l'envers |
| oops | sourcils inquiets, petite bouche en « o » |
| curious | un sourcil levé, petite bouche en « o » |
| thinking | sourcil levé, trois points |
| serious | sourcils froncés, bouche droite |
| sleep | yeux fermés (∪ ∪), petite bouche droite |

Les sourcils n'apparaissent que pendant ces expressions. Au repos, le visage reste celui de la référence.

## Gestes

Coucou, invitation, montrer la messagerie, pouce levé, rire, surprise, clin d'œil, oui, non, haussement
d'épaules, applaudissements, tristesse, célébration, révérence, saut, tour sur soi-même, oups, danse, curiosité,
étirement, réflexion, sommeil. Voir `steeve-gestes.png`.

## Règles de cohérence

1. Une seule géométrie et les mêmes matériaux pour tous les états. Seules les pièces du visage changent.
2. Pas de violet ni de rose, pas de nouvel emblème, pas de cheveux ni d'accessoire ajouté.
3. Le visage reste en volumes noirs détachés, jamais une texture.
4. Le personnage reste fixé dans son coin : il ne poursuit jamais le curseur sur la page.
5. Le verre et la nacre appartiennent à la scène 3D : ils ne réfractent pas le contenu HTML derrière le canevas.
6. Reconstruction depuis des planches 2D : les côtés non montrés sont interprétés. Il n'y a pas d'identité
   photographique parfaite.
