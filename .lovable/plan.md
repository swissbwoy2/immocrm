## Refonte du hero — sur le BON composant (public-site)

J'avais modifié le mauvais hero (Landing.tsx, jamais affiché). Le `/` rend `HomePage` (public-site), dont le hero visible est `DossierAnalyseSection` qui utilise `<CinematicHero>` ("Analyse gratuite de ton dossier" / "Commence maintenant"). Voici les vraies modifs.

### Périmètre
- **`src/components/public-site/sections/DossierAnalyseSection.tsx`** : nouveau contenu CinematicHero + 2 gros CTA Location/Achat avant le formulaire.
- **`src/components/ui/cinematic-hero.tsx`** : aucune modif structurelle (on passe juste de nouveaux props + on ajoute une 3e ligne de titre via `tagline2`/children si besoin).
- **`src/components/public-site/PublicSiteHeader.tsx`** : CTA principal top → "Réserver mon RDV gratuit" (`/rendez-vous`), "Activer ma recherche" devient secondaire.
- **`src/components/public-site/sections/StickyMobileCTA.tsx`** : CTA principal → "Réserver mon RDV gratuit" (`/rendez-vous`) + lien secondaire "Activer ma recherche en ligne".
- Ne pas toucher `src/components/landing/premium/PremiumHero.tsx` (pas affiché sur `/`). Restaurer l'ancien `landing/premium/StickyMobileCTA.tsx` à son état original.

### Contenu CinematicHero (nouveaux props)
- `brandName` : `À nos bureaux de Crissier · Analyse gratuite` (avec icône MapPin via children/badge — sinon on garde brandName court : `Bureau de Crissier`).
- `tagline1` : `Fais analyser ton dossier`
- `tagline2` : `gratuitement avant tes candidatures`
- `cardHeading` : `Analyse personnalisée de ton dossier`
- `cardDescription` : `Nos experts te disent ce qui joue en ta faveur, ce qui bloque tes candidatures, comment l'améliorer et quels logements viser. Objectif : maximiser tes chances rapidement.`
- `metricValue` : `500+`
- `metricLabel` : `familles accompagnées avec succès`
- `ctaHeading` : `Réserve ton analyse gratuite`
- `ctaDescription` : `30 min · Bureau de Crissier · Sans engagement`

### Bloc CTA injecté via `children` du CinematicHero (ou juste après)
Phrase de conversion :
> *Ne laisse plus ton dossier être refusé sans comprendre pourquoi. Réserve ton analyse gratuite maintenant.*

Deux gros boutons (grid sm:grid-cols-2) :
- 🔑 **Je cherche une location** → `Réserver mon analyse gratuite` → `/rendez-vous?type=location`
- 🏠 **Je veux acheter un bien** → `Réserver mon analyse gratuite` → `/rendez-vous?type=achat`

Sous-texte : *Choisis ton projet et réserve directement ton créneau au bureau.*

### Suite du formulaire existant
Conservé intégralement (steps qualification → coordonnées → submitted, RLS, lead_phone_appointments). Il devient un parcours secondaire "préfères tout faire en ligne ?", positionné juste sous les 2 CTA RDV avec un H2 doux : *Ou réponds à quelques questions en ligne pour pré-qualifier ton dossier.*

### Header public-site
- Bouton principal (or, shimmer) : **Réserver mon RDV gratuit** → `/rendez-vous` (icône `Calendar`).
- Bouton secondaire (outline) : *Activer ma recherche* → `/nouveau-mandat`.
- "Mon espace client" et "Essayer la démo" : inchangés.

### Sticky mobile (public-site)
- Bouton plein : **Réserver mon RDV gratuit** → `/rendez-vous`
- Lien petit dessous : *Activer ma recherche en ligne* → `/nouveau-mandat`

### Hors périmètre
- Aucune modif backend / RLS / edge function.
- Aucune modif des autres sections (HeroSection, AppShowcase, Pricing, etc.).
- Pas de modif du formulaire existant ni de son flux de soumission.
- Tokens sémantiques uniquement, pas de couleurs en dur ajoutées.
