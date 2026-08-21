# Amélioration UI/UX des tableaux de bord (admin, agent, client)

Objectif : lisibilité, hiérarchie et robustesse responsive, sans toucher à une seule requête, condition de rôle, navigation, mutation ou texte métier. Toutes les modifications sont de la présentation (classes Tailwind, structure de wrapper visuel, props d'animation).

## Principes de sécurité de l'édition

- Aucun changement dans les fonctions `loadData`, hooks, `supabase.from(...)`, calculs, `onClick`, `navigate(...)`, conditions `userRole`/parcours.
- Aucune section ni donnée supprimée. On regroupe visuellement, on ne retire pas.
- Chaque fichier est modifié par petites retouches ciblées (classes + wrappers), donc réversibles indépendamment.

## Fichiers à modifier (6)

### 1. `src/components/premium/PremiumKPICard.tsx` (composant partagé — le plus fort levier)

- Titre KPI : remplacer `truncate` par un affichage sur 2 lignes maximum (`line-clamp-2`, `leading-tight`, `break-words`) → supprime la troncature observée à 1116 px.
- Sous-titre : `line-clamp-2` au lieu de `truncate`.
- Valeur : retirer `truncate` (le nombre ne doit jamais être coupé), garder `tabular-nums` pour éviter le jitter du compteur animé.
- Hauteur cohérente : `h-full flex flex-col justify-between` + `min-h-[92px] sm:min-h-[104px]` sur la carte, pour que toutes les cartes d'une ligne aient la même hauteur quel que soit le nombre de lignes de titre.
- Accessibilité : quand `onClick` est fourni, rendre la carte focusable (`role="button"`, `tabIndex=0`, activation clavier Entrée/Espace) et ajouter `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Reduced motion : `AnimatedNumber` court-circuité (affichage direct de la valeur) si `window.matchMedia('(prefers-reduced-motion: reduce)')` est vrai ; classes hover `hover:-translate-y-0.5` passées en `motion-safe:`.
- Le contrat de props reste strictement identique (aucun appelant à modifier).

### 2. `src/components/dashboard/v2/PremiumPageShellV2.tsx`

- Réduire les halos décoratifs (`blur-3xl`) en `motion-safe:` et opacité plus faible, pour alléger la page sans changer la structure.
- Animation d'entrée `initial/animate` désactivée sous `prefers-reduced-motion` (garde `opacity: 1` initiale).

### 3. `src/components/dashboard/v2/PremiumPageHeaderV2.tsx`

- En-tête plus compact et plus lisible au-dessus de la ligne de flottaison : titre `text-xl md:text-2xl`, `flex-wrap` sur la ligne titre + badge, `min-w-0` pour éviter les débordements à 1116 px.
- Ajouter une bordure basse discrète (`pb-3 border-b border-border/40`) pour marquer la hiérarchie « en-tête / contenu ».
- Animation d'entrée respectant `prefers-reduced-motion`.

### 4. `src/components/common/DashboardBanner.tsx` (réduction de la domination visuelle)

- Encadrer la bannière dans un conteneur à hauteur contrainte : `max-h-[132px] md:max-h-[168px] overflow-hidden rounded-xl` avec l'image en `object-cover`, au lieu des ~250 px actuels sur un viewport de 612 px.
- Le CTA et le contenu restent rendus par `DashboardAdBanner` (aucune prop, aucun lien, aucun tracking modifié) ; on n'ajoute qu'une contrainte de hauteur et un léger `opacity`/contraste de l'overlay si nécessaire pour garder le CTA lisible.
- Marges réduites : `mb-3 md:mb-4`.
- Si `DashboardAdBanner` a besoin d'un mode compact, on lui passera une classe via la prop `className` existante — sans nouvelle logique.

### 5. `src/pages/admin/Dashboard.tsx`

- Grille KPI : remplacer `grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8` (8 colonnes = titres écrasés) par `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5`, `gap-3 md:gap-4`, `items-stretch`. Testé mentalement à 375 / 768 / 1024 / 1116 / 1440 px : jamais plus de 4 colonnes sur ~860 px de contenu.
- Hiérarchie : introduire de petits titres de section (`<h2>` `text-sm font-semibold uppercase tracking-wide text-muted-foreground`) au-dessus des blocs existants (KPI, statistiques, projections agence, listes), sans déplacer ni supprimer de bloc.
- Regroupement visuel des blocs secondaires (`AdminStatsSection`, `RecommendationStats`, `AgencyProjectionSection`) dans une section commune avec espacement homogène `space-y-6` au lieu des `mb-8` disparates → page nettement moins longue perçue.
- Bouton « Messages » : retirer `hover:scale-105` (mouvement superflu) tout en gardant `onClick` et badge.

### 6. `src/pages/agent/Dashboard.tsx`

- Même normalisation de grille KPI : `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4 items-stretch` (remplace la chaîne 2/3/3/4/5 actuelle).
- Titres de section au-dessus des groupes existants (Activité, Visites, Clients, Documents), même style que l'admin.
- Uniformiser les espacements (`space-y-6`) et retirer les effets décoratifs redondants (gradients hover empilés) là où ils n'apportent rien, sans changer les cartes ni leurs contenus.
- Remplacer les emojis utilisés comme icônes par des icônes Lucide déjà importées ou triviales à importer (ex. 🚀 → `Rocket`, 🔄 → `RefreshCw`) uniquement dans le JSX d'affichage — jamais dans les chaînes de messages envoyées (les emojis dans les messages in-app restent inchangés).

### 7. `src/pages/client/Dashboard.tsx`

- Grilles : `grid-cols-2 ... lg:grid-cols-4` harmonisées avec les deux autres rôles ; suppression des `mb-4/mb-8` hétérogènes au profit d'un `space-y-6` cohérent.
- Réduction des effets décoratifs/animations répétés (délais en cascade, halos) : conserver une seule animation d'entrée par section, `motion-safe:` partout.
- Emojis d'affichage (« 🚀 Vos candidatures en cours ») → icône Lucide + texte. Les emojis présents dans les messages envoyés (ligne ~343) ne sont **pas** touchés.

## Accessibilité et mouvement

- Toutes les transitions de survol/translation passent en `motion-safe:`.
- Cartes cliquables : focus visible et activation clavier.
- Aucune image/section ne change de dimension après chargement (hauteurs min sur les KPI, hauteur max fixe pour la bannière) → pas de layout shift.

## Vérification

1. `tsgo` (typecheck) + build Vite.
2. Contrôle visuel via Playwright headless aux largeurs 375, 768, 1024, 1116, 1440 px sur `/admin`, `/agent`, `/client`.
3. Checklist de régression :
   - Admin : chargement des KPI, clics KPI → `/admin/clients`, `/admin/agents`, bouton Messages + badge, sections Stats / Recommandations / Projections agence toujours présentes, pull-to-refresh mobile.
   - Agent : 10+ KPI tous présents et cliquables, listes visites / clients / documents intactes, bannière affichée avec son CTA.
   - Client : parcours location vs achat (acheteur en attente d'activation) inchangés, renouvellement de mandat, bannière pub, liens rapides.
   - Aucune erreur console, aucune requête réseau nouvelle ou manquante.

## Réversibilité

Les changements sont limités à des classes et à des wrappers de présentation dans 7 fichiers ; chacun peut être annulé isolément sans impact sur les autres.
