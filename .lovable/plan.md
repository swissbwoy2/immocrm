

# Rendre le widget Google Reviews visible immediatement

## Probleme identifie

Le widget Elfsight ne s'affiche pas pour deux raisons :

1. L'attribut `data-elfsight-app-lazy` force le chargement paresseux -- le widget ne se charge que quand l'utilisateur scrolle jusqu'a lui
2. Le `SocialProofBar` est place apres le `HeroSection` qui occupe tout l'ecran (`min-h-screen`), donc le widget est invisible sans scroller

## Solution proposee

### 1. Supprimer le lazy loading du widget

**Fichier** : `src/components/landing/SocialProofBar.tsx`

- Retirer l'attribut `data-elfsight-app-lazy` du div du widget pour qu'il se charge immediatement au chargement de la page

### 2. Remonter le SocialProofBar juste apres le bandeau superieur

**Fichier** : `src/pages/Landing.tsx`

- Deplacer `<SocialProofBar />` de sa position actuelle (apres HeroSection) a juste avant le HeroSection (apres le top banner)
- Ordre des sections :
  1. FloatingNav
  2. Top banner (Immo-rama.ch)
  3. **SocialProofBar** (widget Google Reviews + badges)
  4. HeroSection
  5. QuickLeadForm
  6. ... reste inchange

### 3. Adapter le style du SocialProofBar pour sa nouvelle position

**Fichier** : `src/components/landing/SocialProofBar.tsx`

- Reduire le padding vertical (de `py-10 md:py-16` a `py-6 md:py-8`) pour un rendu compact en haut de page
- Garder les badges "+500 familles relogees" et "Experts relocation depuis 2016" au-dessus du widget
- S'assurer que le widget s'affiche proprement sur mobile

## Resume des modifications

| Fichier | Changement |
|---------|-----------|
| SocialProofBar.tsx | Retirer `data-elfsight-app-lazy`, reduire le padding |
| Landing.tsx | Deplacer SocialProofBar avant HeroSection |

