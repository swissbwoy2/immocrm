## Refonte du Hero — orientation "RDV gratuit au bureau"

Objectif : transformer le hero actuel (orienté "Activer ma recherche") en un hero orienté **prise de RDV gratuit au bureau de Crissier** pour analyse de dossier, avec deux gros CTA Location / Achat qui pointent vers `/rendez-vous`.

### Périmètre
- **Fichier modifié** : `src/components/landing/premium/PremiumHero.tsx` (réécriture du contenu, structure conservée).
- **Fichier modifié** : `src/components/landing/premium/StickyMobileCTA.tsx` (CTA principal → "Réserver mon RDV gratuit", CTA secondaire vers activation en ligne).
- **Aucun changement backend**, aucune modif de routes, aucune modif des autres sections de la landing.

### Nouvelle structure du Hero

1. **Badge top** (remplace "Chasseur N°1")
   `📍 À nos bureaux de Crissier · Analyse gratuite`

2. **Logo + slogan** (inchangés)

3. **H1 (douleur + promesse)**
   *Fais analyser ton dossier gratuitement avant d'envoyer tes candidatures*

4. **Sous-titre**
   *Tu cherches un logement en Suisse romande ? En 30 minutes, un expert Logisorama vérifie ton dossier, tes critères et tes chances réelles auprès des régies.*

5. **Deux blocs côte à côte (grid md:grid-cols-2)**
   - **Gauche — Analyse personnalisée** : 4 puces ✅ (atouts / blocages / améliorations / logements à viser) + ligne objectif.
   - **Droite — 500+ familles accompagnées** : 4 puces (⭐ 🏠 📩 🤝) + tag "RDV gratuit · Sans engagement · 30 minutes".

6. **Phrase de conversion juste avant les CTA**
   *Ne laisse plus ton dossier être refusé sans comprendre pourquoi. Réserve ton analyse gratuite maintenant.*

7. **Deux gros CTA verticaux (ou 2 colonnes desktop)** — remplacent les onglets Location/Achat actuels :
   - 🏠 **Je cherche une location** → `Réserver mon analyse gratuite` → `/rendez-vous?type=location`
   - 🔑 **Je veux acheter un bien** → `Réserver mon analyse gratuite` → `/rendez-vous?type=achat`
   - Sous-texte : *Choisis ton projet et réserve directement ton créneau au bureau.*

8. **Lien secondaire discret** : *Activer ma recherche en ligne* → `/nouveau-mandat`

9. **Réassurance finale** : Gratuit · Sans engagement · 30 min · Bureau de Crissier

### Suppressions
- Sélecteur d'onglets Location / Achat (remplacé par les 2 gros CTA).
- Mini-form (Zone / Budget / Permis) → déplacé hors du hero (supprimé du hero, le formulaire complet reste sur `/nouveau-mandat`).
- Bloc "Achat" legacy long → remplacé par le CTA achat.
- Variantes A/B headline et `useSearchType` côté hero (le contexte reste utilisé ailleurs, on n'y touche pas).

### StickyMobileCTA
- CTA principal : **Réserver mon RDV gratuit** → `/rendez-vous`
- CTA secondaire (lien petit en dessous) : *Activer ma recherche en ligne* → `/nouveau-mandat`

### Détails techniques
- Tokens sémantiques uniquement (`primary`, `foreground`, `muted-foreground`, `card`, `border`) — pas de couleurs en dur.
- Icônes lucide existantes : `Key`, `Home`, `MapPin`, `Calendar`, `CheckCircle`, `ArrowRight`, `Sparkles`, `Users`.
- Animations `animate-fade-in` conservées.
- Responsive : blocs gauche/droite empilés en mobile, côte à côte ≥ md. CTA Location/Achat empilés mobile, 2 colonnes ≥ sm.
- SEO : H1 unique conservé, alt logo conservé.

### Hors périmètre
- Pas de modif de `/rendez-vous` (la page lit déjà `?type=` ou non — à vérifier au moment du build, sinon on passe juste sans param).
- Pas de modif des sections suivantes (`SocialProofBar`, `TeamSection`, etc.).
- Pas de modif backend / DB / edge functions.
