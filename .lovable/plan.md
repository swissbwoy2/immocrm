
## Changement demandé

Remplacer les textes du Hero de la homepage publique par :

- **Headline principal** : "Ton futur appartement, Notre Mission !"
- **Sous-titre** : "Confie la recherche ou la relocation de ton appartement à des experts de l'immobilier en Suisse romande !"
- **Badge / accroche** : "Agence N°1 de relocation en Suisse romande ! Chasseur premium"

## Fichier concerné

**Unique fichier modifié** : `src/components/public-site/sections/HeroSection.tsx`

(Aucun impact sur `src/components/landing/HeroSection.tsx` qui appartient à l'ancienne landing privée et reste intact.)

## Mapping précis

| Élément actuel | Nouveau contenu |
|---|---|
| Badge top "⭐ Chasseur immobilier N°1 en Suisse romande" | "⭐ Agence N°1 de relocation en Suisse romande • Chasseur premium" |
| Headline location : "Tu n'es plus seul face à la **pénurie de logements !**" | "Ton futur appartement, **Notre Mission !**" |
| Headline achat : "Trouve ton bien idéal **avant qu'il soit sur le marché**" | Conservé (concerne l'onglet Achat, hors demande) |
| Sous-titre location : "Délègue ta recherche à **des experts dévoués...**" | "Confie la recherche ou la relocation de ton appartement à **des experts de l'immobilier en Suisse romande !**" |

## Garanties

- Aucune logique modifiée (UTM, tracking, CTA, liens)
- Aucun changement sur les onglets Achat/Location ni sur les boutons
- Aucun impact sur le privé, `/login`, `/nouveau-mandat`
- Seul le contenu textuel de l'onglet "Location" du Hero public est touché
