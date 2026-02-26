
## Ajouter la video "Temoignage clients" sur la landing page

### Position dans la page
QuickLeadForm -> **[NOUVEAU] TestimonialVideoSection** -> VideoSection (Instagram)

### Fichiers

**1. Copier la video dans le projet**
- Copier `user-uploads://copy_8EFFD82A-0728-4919-BE43-45CE4AC5D9B9.mov` vers `public/videos/temoignage-clients.mov`
- Le dossier `public/` est prefere car les fichiers video volumineux ne doivent pas etre bundles par Vite

**2. Creer `src/components/landing/TestimonialVideoSection.tsx`**
- Section avec le meme style que VideoSection pour la coherence visuelle
- Badge "Temoignage clients" avec icone Users
- Titre accrocheur (ex: "Ils nous ont fait confiance")
- Lecteur video natif HTML5 `<video>` avec :
  - controls pour lecture/pause
  - poster optionnel
  - preload="metadata" pour ne pas charger toute la video au chargement
  - rounded-2xl, shadow, border comme la section Instagram
  - playsinline pour mobile

**3. Modifier `src/pages/Landing.tsx`**
- Ajouter le lazy import de TestimonialVideoSection
- L'inserer juste avant VideoSection dans le Suspense :
  ```
  <TestimonialVideoSection />
  <VideoSection />
  ```

### Structure du composant

```text
<section>
  Badge: "Temoignage clients" (icone Users)
  Titre: "Ils nous ont fait confiance"
  Sous-titre: "Decouvrez l'experience de nos clients en Suisse romande"
  <video> avec le fichier .mov
</section>
```
