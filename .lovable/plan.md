## Plan — Les deux

### Phase A — Artéfacts (`/mnt/documents/`)

1. **`charte-graphique-immo-rama.md`** — copie de la charte fournie (132 lignes), inchangée.
2. **`immo-rama-tokens.css`** — bloc Tailwind v3 (`@layer base { :root { ... } .dark { ... } }`) avec tous les tokens HSL light + dark + variables marque (`--sage-dark`, `--sage`, `--sage-light`, `--cream`), `--radius: 0.5rem`, prêt à coller dans n'importe quel projet Lovable. Commentaire en tête avec le `<link>` Google Fonts à mettre dans `index.html`.
3. **`charte-graphique-immo-rama.pdf`** — généré via `reportlab` :
   - Page 1 — Couverture (titre, eyebrow sage, sous-titre éditorial alpin)
   - Page 2 — Palette marque + tokens light (swatches rectangulaires + token + hex + usage)
   - Page 3 — Tokens dark
   - Page 4 — Typographie (samples tailles hero/h2/body/eyebrow ; mention des polices Playfair + Plus Jakarta, rendu en Times/Helvetica embarquées)
   - Page 5 — Layout & spacing
   - Page 6 — Composants signature (boutons, cartes, images, stats)
   - Page 7 — Direction & interdits
   - QA obligatoire : `pdftoppm -jpeg -r 150` → inspection page par page → corrections si overflow.
4. Émettre 3 `<presentation-artifact>` (md, css, pdf).

### Phase B — Alignement projet sur la charte (UI/UX uniquement, public site)

Scope : composants `src/components/public-site/*` + pages publiques. **Aucune** modification SaaS interne, routes, data, edge functions.

**Audit vs charte (écarts identifiés) :**

| Élément | Actuel | Cible charte |
|---|---|---|
| Header hauteur | `py-3` variable | `h-20` fixe, `bg-background/90 backdrop-blur-md` |
| Boutons CTA header | `rounded-sm`, hauteur sm, mix sage/sage-dark | `px-8 py-4 text-xs font-bold uppercase tracking-widest`, rectangulaire |
| `luxury-shimmer-btn` | `border-radius: 0.25rem` | `border-radius: 0` (rectangulaire éditorial) |
| Cartes publiques | hover variable | `border border-border hover:border-accent hover:bg-secondary transition-colors` |
| Eyebrows | non standardisés | `text-xs uppercase tracking-[0.2em] font-bold text-accent` (classe utilitaire `.eyebrow`) |
| Images public | divers ratios | aspect 4/3, `hover:scale-105 duration-700` |
| Top banner | `bg-primary py-2` | OK (conserver) |

**Changements :**

1. **`src/index.css`** — passer `--radius` des CTA luxury à `0`, ajouter classes utilitaires `.eyebrow` et `.immo-btn` (px-8 py-4 uppercase tracking-widest bg-primary hover:bg-accent), uniformiser hover des cards `.theme-luxury` sur `border-accent + bg-secondary`.
2. **`src/components/public-site/PublicSiteHeader.tsx`** — hauteur `h-20` fixe, retirer `rounded-sm` des boutons éditoriaux principaux (garder rond pour les icons-only secondaires si nécessaire), ajuster taille CTA pour cohérence `px-8 py-4` sur desktop (mobile reste compact).
3. **`src/components/ui/button.tsx`** — ajouter variante `immo` (additive, ne touche pas aux variantes existantes) : `rounded-none bg-primary text-primary-foreground hover:bg-accent uppercase tracking-widest text-xs font-bold px-8 py-4 h-auto`.
4. **`src/components/public-site/PublicSiteFooter.tsx`** — vérifier alignement (fond `bg-primary text-primary-foreground` déjà OK), uniformiser eyebrows et liens hover sage-light.
5. **`src/pages/public-site/HomePage.tsx`** + sections publiques (`src/components/public-site/sections/*`) — appliquer `.eyebrow` aux suréticettes, ratios 4/3 sur images, hover scale-105 duration-700.

**Vérification :**
- `code--view` du build, puis `browser--view_preview` desktop (1240px) + mobile (390px) sur `/`, `/vendre-mon-bien`, `/relouer-mon-appartement`, `/chasseur-appartement`, `/construire-renover`.
- Screenshot avant/après si nécessaire pour valider rectangularité + eyebrows + hover cards.

### Hors scope

- Aucune modification SaaS interne (`/admin/*`, `/agent/*`, `/client/*`, etc.).
- Pas de refonte des shadcn components hors ajout variante `immo`.
- Pas de changement routes, contenu textuel, Supabase, edge functions, PDF, emails.
