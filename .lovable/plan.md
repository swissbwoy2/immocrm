

# Supprimer le badge "+500 familles" et le bouton flottant "Demarrer"

## Problemes identifies

1. **Badge "+500 familles relogees"** : Affiche un chiffre qui fait une mauvaise reference aux avis Google (18 avis reels). A supprimer pour eviter la confusion.

2. **Bouton flottant "Demarrer" (fusee)** : Sur mobile, il chevauche la banniere de cookies. Quand l'utilisateur clique sur "Accepter", il clique accidentellement sur "Demarrer" en dessous. A supprimer completement.

## Modifications

### 1. SocialProofBar.tsx - Supprimer le badge "+500 familles relogees"

Retirer le `div` contenant l'icone `Users` et le texte "+500 familles relogees" (lignes 9-14). Le badge "Experts relocation depuis 2016" sera conserve et centre seul.

### 2. Landing.tsx - Supprimer le bouton flottant CTA

Retirer entierement le bloc "Floating CTA - Activer ma recherche" (lignes 104-126), incluant :
- Le conteneur `fixed bottom-4 right-4`
- Le halo anime (glow)
- Le bouton avec les textes "Activer ma recherche" (desktop) et "Demarrer" (mobile)
- L'import de `ArrowRight` de lucide-react (plus utilise)
- L'import de `Link` de react-router-dom (verifier s'il est encore utilise ailleurs dans le fichier)

Les utilisateurs pourront toujours acceder a la page `/nouveau-mandat` via les autres CTA presents dans la page (HeroSection, QuickLeadForm, etc.).

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `src/components/landing/SocialProofBar.tsx` | Supprimer le badge "+500 familles relogees" |
| `src/pages/Landing.tsx` | Supprimer le bouton flottant CTA et les imports inutilises |
