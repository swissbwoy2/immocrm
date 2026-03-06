

## Plan — 3 corrections landing page

### 1. Réintégrer SocialProofBar (widget Google Reviews)

**Fichier : `src/pages/Landing.tsx`**
- Ajouter l'import : `import { SocialProofBar } from '@/components/landing/SocialProofBar';`
- Insérer `<SocialProofBar />` entre `<PremiumHero />` et `<TeamSection />` (ligne 85)

### 2. Renforcer l'étape 3 de HowItWorksSection

**Fichier : `src/components/landing/premium/HowItWorksSection.tsx`**
- Remplacer l'étape 3 (lignes 16-20) :
  - **Titre** : `"Vous visitez… ou nous visitons pour vous"`
  - **Texte** : `"Quand vous êtes au travail, en vacances ou indisponible, nous visitons pour vous et vous faisons un retour complet. Dossier optimisé, candidature déposée, suivi auprès de la régie — vous n'avez qu'à choisir votre futur logement."`

### 3. Nouveau hero location (pénurie du logement)

**Fichier : `src/components/landing/premium/PremiumHero.tsx`**

Remplacer les constantes headlines (lignes 10-16) :
- **A** : `"Vous n'êtes plus seul face à la pénurie du logement."`
- **B** : `"Seulement 1% de logements disponibles : faites enfin équipe avec Immo-Rama."`
- **C** : `"Dans un marché bloqué, Immo-Rama devient votre allié incontournable pour trouver plus vite."`

Remplacer le bloc location (lignes 123-147) :
- **Eyebrow** : `"AGENCE N°1 DE RELOCATION EN SUISSE ROMANDE"` (font-semibold)
- **H1** : `{ACTIVE_HEADLINE}` (inchangé structurellement)
- **Sous-titre** : `"Avec à peine 1% de logements disponibles en Suisse romande, Immo-Rama devient votre allié incontournable pour rechercher, cibler et décrocher plus rapidement le bon appartement."`
- **Nouveau bloc de soutien** (ajouté entre sous-titre et social proof) : `"Recherche ciblée · Dossier optimisé · Visites déléguées · Accompagnement jusqu'au bail"` — affiché en `font-medium text-foreground/80` avec séparateurs `·` en `text-primary`
- Social proof, mini-form, CTAs et bloc offre restent identiques

### Fichiers modifiés (3)

| Fichier | Changement |
|---|---|
| `src/pages/Landing.tsx` | Import + render SocialProofBar après PremiumHero |
| `src/components/landing/premium/PremiumHero.tsx` | Nouveaux headlines, eyebrow, sous-titre, bloc de soutien |
| `src/components/landing/premium/HowItWorksSection.tsx` | Étape 3 : visite déléguée |

