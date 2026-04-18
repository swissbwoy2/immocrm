
## Objectif
Ajouter un menu hamburger sur chaque landing page du tunnel pour permettre la navigation entre les parcours.

## Pages concernées
1. `src/pages/RelouerMonAppartement.tsx`
2. `src/pages/ConstruireRenover.tsx`
3. `src/pages/VendreMonBien.tsx` (a déjà `VendeurFloatingNav`, on enrichit ou on remplace)
4. La home `/` (Index) — à confirmer si concerné

## Approche

### 1. Créer un composant réutilisable `LandingHamburgerMenu`
Fichier : `src/components/landing/LandingHamburgerMenu.tsx`

Contenu :
- Bouton hamburger (icône `Menu` de lucide-react) en haut à droite du header
- Utilise `Sheet` de shadcn (slide depuis la droite) pour le panneau
- Liens de navigation :
  - 🏠 Accueil (`/`)
  - 🔍 Acheter / Chercher (`/`)
  - 🏠 Louer (`/`)
  - 💰 Vendre mon bien (`/vendre-mon-bien`)
  - 🔄 Relouer mon appartement (`/relouer-mon-appartement`)
  - 🚧 Construire / Rénover (`/construire-renover`)
  - 📞 Nous contacter (ancre ou page)
  - 👤 Espace client (`/auth`)

Style : thème luxury (ivoire/or), liens avec icônes Lucide.

### 2. Intégration dans les headers fixes existants
Dans chaque landing :
- `RelouerMonAppartement.tsx` → ajouter `<LandingHamburgerMenu />` dans le header fixe (à côté du bouton "← Accueil" actuel, ou en remplacement)
- `ConstruireRenover.tsx` → idem
- `VendreMonBien.tsx` → ajouter dans `VendeurFloatingNav` ou en complément

### 3. Responsive
- Mobile : hamburger seul
- Desktop : hamburger + bouton "← Accueil" visible

## Garanties
- ✅ Aucune logique métier modifiée
- ✅ Routes existantes inchangées
- ✅ Thème luxury respecté
- ✅ Composant réutilisable (DRY)
- ✅ Formulaires intacts
