
## Problèmes identifiés

**1. Ordre des sections incorrect malgré la modification**

Sur la capture d'écran de `logisorama.ch` (publié), le widget visible juste sous le Hero est le **QuickForm "Zone / Budget / Permis / Situation"** — pas la section "Analyse gratuite de ton dossier".

Vérification nécessaire : le QuickForm est probablement intégré **directement dans `HeroSection.tsx`** (et non une section séparée). Donc déplacer `DossierAnalyseSection` dans `HomePage.tsx` ne suffit pas — il faut soit :
- (A) déplacer `DossierAnalyseSection` **avant** `HeroSection` (au-dessus du Hero) ; ou
- (B) sortir le QuickForm du Hero et le placer après `DossierAnalyseSection`.

→ **Option A retenue** : plus simple, sans risque de casser le tracking/UTM du QuickForm intégré au Hero. La section "Analyse gratuite de ton dossier" passera tout en haut, avant le Hero.

**2. Cache PWA empêche de voir les changements en navigation normale**

L'utilisateur ne voit les mises à jour qu'en navigation privée → le Service Worker PWA sert l'ancienne version cachée. La mémoire `mem://tech/pwa/update-and-session-strategy` indique que `SKIP_WAITING` a été retiré pour préserver les sessions, ce qui force l'utilisateur à fermer tous les onglets.

→ Solution : **forcer une mise à jour ponctuelle** en bumpant la version du Service Worker (ou en ajoutant un mécanisme de notification de mise à jour visible). Le moyen le plus simple et sûr : modifier la chaîne de version du SW pour invalider l'ancien cache **une seule fois**, sans réactiver `SKIP_WAITING` de façon permanente.

## Plan d'action

### Étape 1 — Vérifier où se trouve le QuickForm
Lire `src/components/public-site/sections/HeroSection.tsx` et `src/components/public-site/sections/DossierAnalyseSection.tsx` pour confirmer.

### Étape 2 — Réordonner dans `HomePage.tsx`
Placer `<DossierAnalyseSection />` **au-dessus** de `<HeroSection />` (en eager, sortir du Suspense lazy).

### Étape 3 — Forcer la mise à jour du PWA
Localiser le fichier de configuration du Service Worker (probablement `vite.config.ts` ou `public/sw.js` / `src/sw.ts`) et bumper la version du cache. Cela force tous les navigateurs à invalider l'ancien cache au prochain chargement.

## Fichiers à modifier

1. `src/pages/public-site/HomePage.tsx` — réordonner sections
2. Fichier de config PWA (à identifier) — bump cache version

## Garanties
- Aucun changement sur le QuickForm intégré au Hero (UTM, tracking préservés)
- Aucun impact sur `/login`, `/nouveau-mandat`, espace privé
- Le bump de cache PWA est ponctuel — la stratégie anti-`SKIP_WAITING` reste en place
