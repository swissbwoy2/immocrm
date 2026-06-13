
# Refonte site Immo-Rama — Plan

## Étape 0 — Créer le nouveau projet (à faire par toi)

Je travaille toujours dans **un seul projet à la fois**. Pour démarrer la refonte :

1. Dans Lovable, en haut à gauche → **New Project**
2. Nom : `immo-rama-site` (ou ce que tu veux)
3. Une fois créé, ouvre ce nouveau projet et **redonne-moi ce même brief** — j'enchaîne directement avec l'étape 1.

Pendant ce temps, voici ce qu'on va construire (valide ou ajuste avant que tu ouvres le nouveau projet) :

---

## Étape 1 — Design system (aligné Logisorama)

Repris depuis ce projet :
- Palette : vert sapin `hsl(142 45% 40%)` (primary) + dorés/ivoire pour accents premium
- Typo : pair serif éditorial pour titres + sans moderne pour body (Cormorant + Karla, ou équivalent existant)
- Composants : tokens HSL, shadcn, motion subtile (framer-motion), safe-areas iOS
- Header sticky avec banner « Propulsé par Logisorama »
- Footer corporate Immo-Rama (IDE CHE-442.303.796, Christ Ramazani)

## Étape 2 — Les 8 pages du menu

| Route | Page | Contenu clé |
|---|---|---|
| `/` | **Accueil** | Hero "L'immobilier accessible" + push appli Logisorama + 4 services + témoignages |
| `/annonces` | **Annonces** | Liste biens en location/vente (statique V1, branchable plus tard sur la base Logisorama) |
| `/gerance` | **Gérance** | Services au propriétaire : encaissement, états des lieux, comptabilité |
| `/achat-vente` | **Achat-Vente** | Estimation gratuite, accompagnement vente, recherche acheteur |
| `/relogement` | **Relogement** | Service ciblé locataires en recherche urgente |
| `/relocation` | **Relocation & mise en valeur** | Service complet pour propriétaires : relooking, photo pro, mise sur le marché |
| `/a-propos` | **À propos** | Histoire, valeurs, équipe (Christ Ramazani), IDE, certifications |
| `/contact` | **Contact** | Formulaire (Lovable Cloud), carte Google, horaires, WhatsApp |

## Étape 3 — Contenu

- Textes : repris du Wix actuel (déjà scrapé) + réécrits pour cohérence Logisorama
- Photos : on garde celles du Wix (tu m'envoies les meilleures en upload, ou je récupère via screenshot)
- CTA principal partout : **« Activer ma recherche »** → renvoi vers logisorama.ch

## Étape 4 — Backend (minimal)

- **Lovable Cloud** activé pour : formulaire contact + newsletter
- 1 table `contact_submissions` + edge function d'envoi email vers `info@immo-rama.ch`
- Pas d'auth (site vitrine pur)

## Étape 5 — SEO & déploiement

- Meta tags FR, sitemap, robots, JSON-LD `RealEstateAgent`
- Lighthouse cible : 95+ mobile
- Une fois prêt : tu pointes `immo-rama.ch` vers le nouveau projet Lovable et tu débranches Wix

---

## Ce qui n'est PAS dans ce plan

- ❌ Annonces dynamiques connectées au backend Logisorama (V2)
- ❌ Espace client (ils utilisent déjà logisorama.ch pour ça)
- ❌ Système de paiement
- ❌ Migration de données depuis Wix (rien à migrer côté CMS)

---

**Action attendue de toi :**
1. Crée le nouveau projet Lovable
2. Ouvre-le et écris-moi « OK on démarre la refonte Immo-Rama »
3. J'attaque par le design system + page Accueil, puis on enchaîne les autres pages une par une
