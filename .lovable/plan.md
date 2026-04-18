
## Compréhension

Tu veux remplacer le contenu actuel de la landing `/construire-renover` par cette nouvelle promesse axée **Rénovation intelligente par IA** (avant / pendant / après chantier), avec un CTA "En savoir plus" qui mène au formulaire existant.

## Plan

### 1. Refonte de `src/pages/ConstruireRenover.tsx`

Garder :
- Header fixe + bouton retour Accueil
- Wrapper `theme-luxury`
- Lien vers `/formulaire-construire-renover` (inchangé)

Remplacer le contenu par 5 sections :

**A. HERO**
- Badge : "🚧 Rénovation intelligente 🚧"
- Titre : "Rénovez plus intelligemment grâce à l'IA"
- Sous-titre : "Réduisez les erreurs, optimisez vos coûts et anticipez les retards grâce à l'intelligence artificielle."
- Paragraphe d'intro : agent IA connecté 24/7 qui suit le projet avant/pendant/après
- CTA principal : "En savoir plus" → `/formulaire-construire-renover`
- Trust badges : Devis gratuit · IA 24/7 · Économies garanties

**B. AVANT LE CHANTIER** (carte avec icône `ClipboardCheck`)
Liste des 11 bénéfices (optimisation plans, analyse devis, audit entreprises, classement étoiles, fournitures, comparaison prix, matériaux locaux/étrangers, permis, amiante, canalisations, risques techniques)

**C. PENDANT LE CHANTIER** (carte avec icône `Activity`)
Liste des 7 bénéfices (suivi temps réel, anticipation retards, optimisation coûts, détection erreurs, prise de décision, suivi centralisé, coordination)

**D. APRÈS LE CHANTIER** (carte avec icône `ShieldCheck`)
Liste des 5 bénéfices (suivi 24/7 installations, garanties, centralisation docs, traçabilité, conservation pour futur)

**E. CTA FINAL**
- Titre : "Ne rénovez plus à l'aveugle"
- Sous-titre : "L'IA peut vous faire économiser des milliers de francs"
- Bouton : "En savoir plus" → `/formulaire-construire-renover`

### 2. Composants utilisés
- `Card` / icônes Lucide existantes (`ClipboardCheck`, `Activity`, `ShieldCheck`, `Sparkles`, `CheckCircle`, `Bot`)
- Aucune dépendance nouvelle
- Conserve `theme-luxury` (ivoire/or)

### 3. Fichiers
- **Modifié** : `src/pages/ConstruireRenover.tsx` uniquement
- **Inchangés** : header, formulaire, routes, espace client

## Garanties
- ✅ Header fixe + bouton Accueil conservés
- ✅ Thème luxury conservé
- ✅ Formulaire `/formulaire-construire-renover` inchangé
- ✅ Aucun impact sur les autres parcours
