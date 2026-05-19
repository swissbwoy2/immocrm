## Corriger la lisibilité du H2 "Étape 1"

**Problème** : Dans `src/components/public-site/sections/DossierAnalyseSection.tsx` ligne 314, le titre utilise `text-foreground` qui résout en couleur sombre, alors qu'il est posé sur le fond dégradé sombre `from-[hsl(30_15%_8%)]` → invisible.

**Fix** : Remplacer la classe par une couleur claire forcée, cohérente avec le hero au-dessus :

- `text-foreground` → `text-[hsl(40_30%_96%)]` (ivoire clair, comme le H1 hero)
- Mettre "Étape 1" en doré pour la hiérarchie : wrap `Étape 1` dans `<span className="text-primary font-bold">`

**Bonus lisibilité** dans la même section (toujours sur fond sombre) :
- Le sous-texte `text-muted-foreground` ("Réponds à ces questions…") → `text-white/70`
- Vérifier les labels du formulaire en dessous — si d'autres `text-foreground` / `text-muted-foreground` apparaissent invisibles, les forcer en `text-white` / `text-white/70`.

Aucun changement de logique, uniquement classes Tailwind.