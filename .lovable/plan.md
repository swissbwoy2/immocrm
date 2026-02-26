

## Remplacer la video .mov par un embed Instagram Reel

### Modification

**`src/components/landing/TestimonialVideoSection.tsx`**
- Remplacer le lecteur `<video>` natif par un `<iframe>` Instagram embed
- URL du reel : `https://www.instagram.com/reel/DVPQODmCNBU/embed/`
- Meme format que VideoSection : iframe avec `loading="lazy"`, `allowFullScreen`, hauteur 520px
- Supprimer la reference au fichier .mov

### Resultat
La section "Temoignage clients" affichera le reel Instagram directement dans la page, avec le meme style que la section video de presentation en dessous.

