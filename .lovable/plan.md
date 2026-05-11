## Refonte Tableau de bord Client — inspiration Post App + maquette Logisorama

Oui, c'est tout à fait possible — et ça va vraiment moderniser l'espace client. On garde **strictement** notre palette actuelle (primary bleu Logisorama, fond sombre, cards `bg-card/80` + bordures `border-border/60`, accents primary/glow). Aucune trace du jaune Post.

### Ce qu'on reprend des références (sans copier les couleurs)

**De l'app Post (IMG_4104 / 4105) :**
- Header "Bonjour [Prénom]" XL avec accent visuel fort
- Section "Actuel" avec **grandes cards d'événements** (offres récentes) ultra lisibles, badges de statut colorés
- Grille de **2 tuiles d'action principales** côte à côte (équivalent de "Mes envois / Affranchir")
- Tuiles secondaires pleine largeur avec icône ronde à gauche (Messagerie, Calendrier…)
- Une carte avec **mini-aperçu visuel à droite** (équivalent "Où nous trouver" → on met un mini calendrier ou une carte des biens)

**De la maquette Logisorama (IMG_4106) :**
- Cards d'offres avec **vraie image du bien** + adresse + pièces/m² + prix CHF
- Bloc "Prochaines visites" avec date stylée (jour/mois en gros)
- Bloc "Dossier de candidature" avec checklist validée

### Nouvelle structure du dashboard client (location)

```text
┌─────────────────────────────────────────────┐
│ Bonjour, [Prénom]              🔔   👤      │  ← Header premium, accent primary
│ Voici le suivi de votre recherche.          │
└─────────────────────────────────────────────┘

┌─── Dernières offres reçues ────── Voir tout ┐
│ ┌────────┬──────────────────────────────┐  │  ← KPI cards style Post
│ │ [img]  │ Lausanne — Centre        ♡   │  │     avec aperçu image du lien
│ │ bien   │ 4.5 p · 120 m²               │  │     (lien_annonce → og:image
│ │        │ CHF 3'450.– /mois            │  │     ou photo de l'offre)
│ │        │ [Nouvelle] [À traiter]       │  │
│ └────────┴──────────────────────────────┘  │
│ (2-3 dernières offres, scroll horizontal    │
│  sur mobile)                                │
└─────────────────────────────────────────────┘

┌──────────────────┬──────────────────┐
│ 📁 Mon dossier   │ 📅 Calendrier    │  ← 2 tuiles XL côte à côte
│ 4/5 documents    │ 2 visites cette  │     (style Mes envois / Affranchir)
│ Compléter →      │ semaine          │
└──────────────────┴──────────────────┘

┌─────────────────────────────────────────────┐
│ 📨 Mes offres reçues             12  →     │  ← Tuile pleine largeur
│ 3 nouvelles à traiter                       │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 💬 Messagerie                    2  →      │
│ Votre agent : Élise M. · En ligne           │
└─────────────────────────────────────────────┘

┌─── Prochaines visites ─────── Voir tout ───┐
│  25  Lausanne — Appartement 4.5 p           │
│  MAI 14:00                                  │
│  ─────────────────────────────────          │
│  27  Genève — Appartement 3.5 p             │
│  MAI 16:30                                  │
└─────────────────────────────────────────────┘

┌─── Mandat & dossier ───────────────────────┐
│ Progression du mandat ████████░░ 67 j / 90 │
│ Dossier complet ✓  Solvabilité ✓           │
└─────────────────────────────────────────────┘
```

### Composants à créer / modifier

1. **Nouveau** `src/components/client/dashboard/DernieresOffresKPI.tsx`
   - Card horizontale : image (1ère photo de l'offre OU `og:image` du `lien_annonce` via `LinkPreviewCard` déjà existant), adresse, pieces/surface/prix, badges statut
   - 2-3 plus récentes, lien "Voir tout" → `/client/offres-recues`

2. **Nouveau** `src/components/client/dashboard/QuickTileXL.tsx`
   - Tuile carrée premium avec icône ronde primary/10, titre, sous-titre, badge compteur
   - Variant `large` (2 par ligne) et `wide` (pleine largeur)

3. **Nouveau** `src/components/client/dashboard/ProchainesVisitesCard.tsx`
   - Liste compacte : bloc date à gauche (25 / MAI gros) + adresse + heure
   - Reprend le style de la maquette Logisorama

4. **Refonte** `src/pages/client/Dashboard.tsx` (`ClientDashboardLocation`)
   - Remplace la structure actuelle (cards éparpillées) par la nouvelle hiérarchie ci-dessus
   - Garde toute la logique existante : `loadData`, alerts solvabilité, modal activation, renouvellement mandat, realtime visites, pull-to-refresh
   - Garde `MissingDocumentsAlert`, `SolvabilityAlert`, `PurchaseSolvabilityAlert`, `AccountActivationModal` au-dessus du nouveau layout
   - `PremiumMandatProgress`, `PremiumAgentCard` regroupés dans la section bas

### Couleurs (strict)

- Aucun jaune. On utilise `primary` (bleu Logisorama), `bg-card/80 backdrop-blur-sm`, `border-border/60`, accents `from-primary/10 via-primary/5`, badges existants (`secondary`, `destructive` pour "nouveau"/"urgent")
- Style cohérent avec `PremiumKPICardV2` et `PremiumPageShellV2` déjà en place

### Hors scope

- Pas de changement aux dashboards Vente / Rénovation / Relocation (autres parcours)
- Pas de modification BDD ni edge functions
- Pas de changement aux pages détaillées (`/client/offres-recues`, `/client/calendrier`, `/client/dossier`) — uniquement le dashboard `/client`
- Pas de touche au site public ni à `DossierAnalyseSection`

Confirme-moi si je lance l'implémentation, ou si tu veux ajuster la liste des tuiles (ex : ajouter "Mes candidatures", retirer "Messagerie", inverser l'ordre).