## Diagnostic

La passe précédente de remplacement automatique a cassé beaucoup de choses :

1. **Icônes invisibles** dans toutes les cartes : les wrappers d'icônes sont devenus `bg-gradient-to-br from-primary to-primary` avec une icône `text-primary` → carré vert plein sans icône visible. C'est ce qu'on voit dans ForWho, Stats, Guarantee, Garantie Sérénité.
2. **Boutons illisibles** : plusieurs CTA ont `bg-gradient-to-r from-primary to-primary` + `text-primary` ou `text-foreground` → texte vert sur fond vert, ou contraste cassé.
3. **Bande verte pleine** dans `GuaranteeSection` : `bg-gradient-to-b from-background via-primary to-background` génère une bande verte au milieu.
4. **Bulle CTA verte pleine** sous "Garantie 100% remboursé" : `from-primary via-primary to-primary` + texte `text-primary`.
5. **Hero mobile mal cadré** : une seule image desktop est utilisée pour mobile avec un simple `object-position` → tu veux une image 9:16 dédiée.
6. **Tablette** : aucun breakpoint dédié pour le hero split (cadrage cassé sur 768–1023px).

## Plan d'action ciblé

### A. Hero — image 9:16 dédiée mobile/tablette
1. Générer une image hero verticale 9:16 du chasseur (mêmes codes visuels que l'actuelle horizontale), l'uploader en CDN via `lovable-assets`.
2. Dans `DiagonalSplitReveal.tsx` :
   - Accepter `imageSrcMobile?: string`.
   - Sur `isMobile || isTablet`, utiliser cette image et `objectPosition: 'center center'`.
   - Sur desktop, conserver l'image horizontale existante.
3. `HeroSection.tsx` passe les deux sources.

### B. Réparer icônes invisibles (carrés verts)
Remplacer partout les wrappers cassés `bg-gradient-to-br from-primary to-primary border border-primary/30` + icône `text-primary` par :
- Fond doux `bg-primary/10`
- Bordure `border-primary/20`
- Icône `text-primary` (visible, plus de carré plein)

Fichiers : `ForWhoSection`, `StatsSection`, `GuaranteeSection` (cartes pricing + shield principal + bulle Garantie Sérénité), `HeroSection` (badge Crown + tab actif), `CoverageSection` (badges cantons), `AppShowcaseSection` (barres de progression).

### C. Réparer les boutons illisibles
Standard pour les CTA primary remplis :
- `bg-gradient-to-r from-primary via-primary to-primary` → `bg-primary hover:bg-primary/90`
- `text-foreground` / `text-primary` sur fond primary → `text-primary-foreground`
- Boutons outline : `border-primary/30 text-primary bg-background hover:bg-primary/10` (jamais `text-primary` sur `bg-primary`).

Fichiers : Hero, Stats, ForWho, Guarantee, AppShowcase, BudgetCalc, Coverage, Header (Réserver RDV), StickyMobileCTA.

### D. Réparer les fonds verts pleins parasites
- `GuaranteeSection` ligne 31 : `bg-gradient-to-b from-background via-primary to-background` → `bg-background` (ou dégradé très doux `via-primary/5`).
- Bulle "Garantie 100% remboursé" (ligne 133) : `from-primary via-primary to-primary border-2 border-primary/30` → `bg-primary/10 border border-primary/30`, texte en `text-foreground`/`text-primary` (lisible).
- Bulle "✓ Zéro condition cachée..." (vue mobile capture 3) : même fix.

### E. Calculator — bouton "Calculer mon budget"
Forcer `bg-primary text-primary-foreground hover:bg-primary/90` explicite (ne pas dépendre d'un override cassé).

### F. Hero tablette/mobile — texte split lisible
Conserver `data-split-title` + `textShadow` déjà présent, mais m'assurer que le titre n'est pas masqué derrière l'image mobile mal cadrée (résolu par étape A).

### G. Vérification
1. Browser screenshot 390×844 (mobile), 820×1180 (tablette), 1280×720 (desktop) sur la home.
2. Inspecter : hero (image cadrée + titre lisible), section "Pour qui" (icônes visibles), Stats (icônes visibles), Garantie (pas de bande verte, bulle pricing + bulle CTA lisibles), App Showcase (barres de progression vertes mais sur fond gris), Calculator (bouton visible), Coverage (badges cantons OK).
3. Re-zoom sur chaque bouton CTA pour vérifier contraste texte/fond.

## Hors scope
- Aucun changement de logique métier, de routes, ou de backend.
- Aucun changement des autres pages que la home publique.
- Les couleurs du thème `theme-luxury` (vert + bleu encre) restent telles que définies dans `index.css`.
