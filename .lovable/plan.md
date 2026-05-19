## Problème

Le hero a un fond hardcodé sombre (`bg-[hsl(30_15%_5%)]`) mais les classes `text-foreground` / `text-muted-foreground` utilisent les tokens du thème public-site qui sont **sombres** (`--foreground: 30 15% 12%`). Résultat : texte foncé sur fond foncé → invisible.

## Correctif

Dans `src/components/public-site/sections/DossierAnalyseSection.tsx`, uniquement sur le nouveau bloc HERO (avant le bloc formulaire) :

1. **H1** : `text-foreground` → `text-[hsl(40_30%_96%)]` (ivoire clair).
2. **Sous-titre** : `text-muted-foreground` → `text-white/70`.
3. **Cards Commission / Confiance** :
   - Titres `text-foreground` → `text-white`.
   - Sous-lignes `text-muted-foreground` → `text-white/60`.
   - Fond `bg-white/5` OK (déjà translucide).
4. **Ligne "Active ta recherche MAINTENANT"** : `text-muted-foreground` → `text-white/70` ; garder le mot `MAINTENANT` en `text-primary`.
5. **Badge "Bureau de Crissier"** dans l'image : déjà sur fond noir, OK.
6. Le bloc formulaire en dessous garde ses tokens sémantiques (il s'affiche bien car son fond reste cohérent avec le thème).

Aucun autre fichier modifié. Aucune logique touchée.
