

# Plan : Fix lisibilité formulaire /nouveau-mandat (urgent)

## Diagnostic du bug visible sur ton screenshot

Tu vois un formulaire quasi illisible parce qu'il y a **3 problèmes de contraste cumulés** :

### Bug 1 — Titres de step invisibles (le plus grave)
Dans **Step1, Step2, Step3, Step5, Step6, Step7**, tous les `<h2>` utilisent :
```
bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text
```
**Il manque `text-transparent`** → le navigateur ignore `bg-clip-text` sans cette classe. Sur le screenshot, "Informations personnelles" apparaît en bleu/transparent fantôme au lieu du beau gradient doré attendu.

### Bug 2 — Labels de champs en bleu illisible
Les `<Label>` de Step1 (E-mail, Téléphone, Prénom, Nom, Adresse, Date de naissance, Nationalité, Type de permis) sont rendus en **bleu pâle** (couleur héritée par défaut au lieu du `text-foreground`). Cause probable : un `text-primary` mal placé ou une couleur OKLCH héritée du wrapper.

### Bug 3 — Header "Mandat de recherche" presque invisible
`from-primary via-primary/80 to-accent` sur fond doré → gradient doré sur fond doré = fantôme.

## Corrections à apporter (mode default, ~8 fichiers)

### A. Fix titres de step — 6 fichiers
Dans `MandatFormStep1.tsx`, `Step2`, `Step3`, `Step5`, `Step6`, `Step7` :

**Avant** :
```tsx
<h2 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
```

**Après** :
```tsx
<h2 className="text-2xl md:text-3xl font-bold font-serif bg-gradient-to-r from-[hsl(38_55%_70%)] via-[hsl(38_55%_60%)] to-[hsl(38_45%_48%)] bg-clip-text text-transparent">
```

→ Ajoute `text-transparent` (fix critique), passe en `font-serif` (Cormorant) et utilise le **gradient doré luxury** cohérent avec la landing v3.

### B. Fix labels de champs — Step1 (et vérifier Step2-7)
Forcer la couleur des labels en blanc ivoire lisible :

**Avant** :
```tsx
<Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium">
```

**Après** :
```tsx
<Label htmlFor="email" className="flex items-center gap-2 text-sm font-medium text-foreground/90">
```

Et changer les icônes Lucide de `text-primary/70` (trop pâle) → `text-[hsl(38_55%_60%)]` (doré lisible).

### C. Fix header `/nouveau-mandat` — `src/pages/NouveauMandat.tsx` ligne 437
**Avant** :
```tsx
<h1 className="... from-primary via-primary/80 to-accent bg-clip-text text-transparent">
  Mandat de recherche
</h1>
```

**Après** :
```tsx
<h1 className="text-4xl md:text-5xl font-bold font-serif bg-gradient-to-r from-[hsl(38_55%_75%)] via-[hsl(38_50%_60%)] to-[hsl(38_45%_48%)] bg-clip-text text-transparent drop-shadow-[0_0_30px_hsl(38_45%_48%/0.4)]">
  Mandat de recherche
</h1>
```

### D. Fix sous-titres "Vos coordonnées et situation personnelle"
Passer de `text-muted-foreground` (trop pâle sur dark) à `text-foreground/70` pour garantir 4.5:1 de contraste.

### E. Augmenter contraste des Inputs
Sur les `<Input>` actuels (`bg-background/50 backdrop-blur-sm`) → passer à `bg-background/80 border-[hsl(38_45%_48%/0.3)] focus:border-[hsl(38_45%_60%)] text-foreground placeholder:text-muted-foreground/60` pour que les placeholders et le texte saisi restent lisibles.

## Hors scope de ce fix

- Création du dossier `src/components/forms-premium/` (refonte cinématique complète) → ça reste pour Claude Code dans la mission v5 que tu lui as déjà transmise
- Animations GSAP, particules 3D, BorderBeam → mission v5 Claude Code
- Step4 n'est pas touché car pas dans le scope du screenshot, mais sera revérifié

## Validation après fix

1. Reload `/nouveau-mandat` → titre "Mandat de recherche" visible en doré brillant
2. Step 1 → "Informations personnelles" lisible en gradient doré font-serif
3. Tous les labels (E-mail, Téléphone, Prénom, etc.) lisibles en blanc ivoire
4. Naviguer Step 1 → 2 → 3 → ... → 7 et confirmer lisibilité partout
5. Test mobile 375px : taille minimum 16px sur inputs (évite zoom iOS)
6. `bun run build` = 0 erreur

## Prochaine étape

Approuve ce plan → je passe en mode default et je corrige immédiatement les 8 fichiers pour rendre le formulaire lisible. Pendant ce temps Claude Code peut continuer la refonte cinématique complète (mission v5).

