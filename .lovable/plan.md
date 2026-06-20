
# Recentrage Logisorama.ch sur le parcours chercheur

Objectif : Logisorama reste centré sur la recherche/chasseur d'appartement. Les parcours propriétaires (vente, mise en location, construction) basculent en redirection externe vers Immo-rama.ch. Le portail annonces passe en maintenance. Aucune donnée, aucun compte, aucun formulaire de recherche, aucune route admin/agent/client n'est touché.

## 1. Redirections externes (propriétaires)

Les routes publiques suivantes sont remplacées par un composant `ExternalRedirect` qui exécute `window.location.replace(...)` au montage :

| Route Logisorama | Destination Immo-rama |
|---|---|
| `/vendre-mon-bien` | `https://immo-rama.ch/vendre-mon-bien` |
| `/formulaire-vendeur` | `https://immo-rama.ch/vendre-mon-bien` |
| `/relouer-mon-appartement` | `https://immo-rama.ch/relouer-mon-appartement` |
| `/formulaire-relouer` | `https://immo-rama.ch/relouer-mon-appartement` |
| `/construire-renover` | `https://immo-rama.ch/project-management` |
| `/formulaire-construire-renover` | `https://immo-rama.ch/project-management` |
| `/rendez-vous-proprietaire` | `https://immo-rama.ch` |

Les anciens composants pages (`VendreMonBien.tsx`, `RelouerMonAppartement.tsx`, `ConstruireRenover.tsx`, `FormulaireVendeurComplet.tsx`, `FormulaireRelouer.tsx`, `FormulaireConstruireRenover.tsx`, `RendezVousProprietaire.tsx`) restent dans le code mais ne sont plus utilisés en route publique (réutilisables côté admin si besoin).

## 2. Portail annonces → page maintenance

Routes `/annonces`, `/annonces/recherche`, `/annonces/:slug` remplacées par une nouvelle page `PortailMaintenance.tsx` (design Logisorama : `LandingFormShell` + carte premium semantic tokens, cohérente avec la home).

Contenu :
- Titre : « Portail annonces en maintenance »
- Texte : « Notre portail d'annonces est actuellement en cours d'amélioration… »
- CTAs : « Activer ma recherche » (`/nouveau-mandat`), « Prendre rendez-vous » (`/rendez-vous`), « Retour à l'accueil » (`/`)
- Balise `<meta name="robots" content="noindex,nofollow" />` via `useEffect`

Les routes annonceur (`/espace-annonceur/*`, `/inscription-annonceur`, `/connexion-annonceur`) et toute la zone admin/agent/client restent intactes (backoffice).

## 3. Nettoyage navigation publique

**`src/components/landing/LandingHamburgerMenu.tsx`** — nouvelle liste :
- Accueil (`/`)
- Trouver un logement (`/nouveau-mandat`)
- Acheter un bien (`/chasseur-appartement`)
- Rendez-vous (`/rendez-vous`)
- Espace client (`/login`)
- Section « Services propriétaires » discrète avec liens externes (target=_blank) : Vendre, Relouer, Project Management → Immo-rama.ch

**`src/components/landing/FloatingNav.tsx`** — inchangé sur la structure (déjà ciblé chercheur : Mon espace client, Essayer la démo, Réserver RDV, Activer ma recherche). Vérification des liens.

**`src/components/landing/LandingFooter.tsx`** :
- Suppression du bloc « Portail Annonces » (4 liens `/annonces*`)
- Remplacement par bloc « Recherche d'appartement » : Activer ma recherche, Chasseur, Prendre RDV, Se connecter
- Suppression du lien « Vendre mon bien » des liens rapides
- Ajout d'un bloc « Services propriétaires » avec 3 liens externes vers Immo-rama (Vendre, Relouer, Project Management), `target="_blank" rel="noopener"`

**`src/components/public-site/sections/HeroSection.tsx`** — retrait des 3 tuiles `/relouer`, `/vendre`, `/construire`. Ne reste que la recherche locataire/acheteur.

**`src/components/public-site/PublicSiteFooter.tsx`** — mêmes nettoyages que `LandingFooter`.

**`src/components/landing/SeoLocalSection.tsx`** — les `<Link to="/vendre-mon-bien">` et `<Link to="/relouer-mon-appartement">` deviennent `<a href="https://immo-rama.ch/...">` externes.

## 4. SEO

- `public/sitemap.xml` (ou `scripts/generate-sitemap.ts` selon ce qui existe) : retirer toutes les entrées `/vendre-mon-bien`, `/formulaire-vendeur`, `/relouer-mon-appartement`, `/formulaire-relouer`, `/construire-renover`, `/formulaire-construire-renover`, `/annonces*`, et toute entrée IA publique. Garder : `/`, `/nouveau-mandat`, `/chasseur-appartement`, `/rendez-vous`, `/login`, `/demo`, pages légales.
- `public/robots.txt` : ajouter `Disallow: /annonces` et `Disallow: /vendre-mon-bien`, `Disallow: /relouer-mon-appartement`, `Disallow: /construire-renover`, `Disallow: /formulaire-vendeur`, `Disallow: /formulaire-relouer`, `Disallow: /formulaire-construire-renover` (en plus du wildcard existant).
- `index.html` : conserver tel quel (déjà orienté chasseur). Pas de changement de title/description.

## 5. Harmonisation visuelle des formulaires

Le travail déjà fait sur `/nouveau-mandat` (LandingFormShell + composants `Landing*`) sert de référence. Vérification rapide que les autres formulaires encore publics utilisés par le parcours chercheur (`/rendez-vous`, `/chasseur-appartement` si formulaire) reprennent les mêmes tokens (`bg-card/60`, `border-border/50`, primary emerald). Aucun nouveau composant créé sauf si un écart visible existe — à confirmer pendant l'implémentation.

## 6. Routes IA publiques

Audit confirmé : aucune route publique IA n'existe (`/agent-ia`, `/relocation-ia`, `/affiliation-ia` n'existent pas dans `src/App.tsx`). Les pages `AgentIA.tsx` et `ai-relocation/*` sont uniquement sous `/admin/*` (protégées). **Aucun changement nécessaire** : elles ne sont pas visibles publiquement. Si un menu admin pointe vers ces pages, on le laisse (usage interne).

## Détails techniques

### Nouveau composant `src/components/ExternalRedirect.tsx`
```tsx
import { useEffect } from 'react';
export function ExternalRedirect({ to }: { to: string }) {
  useEffect(() => { window.location.replace(to); }, [to]);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      Redirection vers Immo-rama.ch…
    </div>
  );
}
```

### `src/App.tsx`
Remplacement de 7 `element={...}` par `element={<ExternalRedirect to="https://immo-rama.ch/..." />}`. Remplacement des 3 routes `/annonces*` par `element={<PortailMaintenance />}`. Imports inutiles supprimés.

### Nouvelle page `src/pages/PortailMaintenance.tsx`
Utilise `LandingFormShell` (cohérence visuelle home), carte `bg-card/60 backdrop-blur border-border/50`, CTAs gradient primary.

## Hors périmètre (intouché)
- Backoffice admin/agent/client/coursier/proprietaire/annonceur
- Authentification, Supabase, edge functions, données
- Formulaire `/nouveau-mandat` (déjà refait)
- Pages légales
- Composants `Premium*` (utilisés ailleurs)

## Validation
- Clic « Vendre mon bien » depuis n'importe quel menu/footer → `immo-rama.ch/vendre-mon-bien`
- `/annonces` → page maintenance Logisorama (pas de 404)
- Plus aucun lien interne vers `/vendre-mon-bien`, `/relouer-mon-appartement`, `/construire-renover`, `/annonces*`
- Menu hamburger ne contient plus les 3 parcours propriétaires
- Footer affiche un bloc « Services propriétaires » externe clair
- Espace client, login, `/nouveau-mandat`, `/rendez-vous`, `/chasseur-appartement` fonctionnent
