# Bouton « Déposer une annonce » au bon endroit sur la landing

## Constat

Le bouton ajouté précédemment a été placé dans le bloc hero secondaire (`HeroSection`, à côté de « Déjà client ? Se connecter »), pas sous le grand CTA vert visible sur ta capture.

Le CTA visé — « Active ta recherche MAINTENANT et décroche ton bail » — se trouve dans la section d'accroche `DossierAnalyseSection`, tout en bas du bloc texte (juste après les cartes « Commission » et « Confiance »).

## Ce qui sera fait

- Ajouter, directement SOUS le bouton vert « Active ta recherche MAINTENANT et décroche ton bail », un bouton secondaire « Déposer une annonce » qui ouvre `/inscription-annonceur`.
- Style : bouton secondaire en contour vert Logisorama (fond transparent, bordure et texte verts, survol vert léger), même largeur/comportement responsive que le CTA principal (pleine largeur sur mobile, largeur auto sur desktop), avec une petite icône adaptée.
- Retirer le bouton « Déposer une annonce » posé par erreur dans le bloc hero à côté de « Déjà client ? Se connecter », pour éviter le doublon.

Le reste de la page (bannière, stories, sections) reste inchangé.

## Détails techniques

- `src/components/public-site/sections/DossierAnalyseSection.tsx` : ajout d'un `<Link to="/inscription-annonceur">` (ou `<a href>` cohérent avec le CTA existant) immédiatement après le lien `/nouveau-mandat`, dans un conteneur `flex flex-col sm:flex-row gap-3`.
- `src/components/public-site/sections/HeroSection.tsx` : suppression du bouton ajouté au tour précédent, retour au seul lien « Déjà client ? Se connecter ».
- Publication à la fin.
