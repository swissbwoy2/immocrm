## Diagnostic

J'ai trouvé **deux problèmes distincts**.

### 1. Bug d'intervalle de dates (cause principale)

Le filtre **"Aujourd'hui"** (et "Hier") du dashboard utilise :

```ts
{ from: new Date(), to: new Date() }   // ex: from=13:55:00, to=13:55:00
```

`from` et `to` ont l'**heure courante**. Le filtre `isWithinInterval` ne matche donc que les offres envoyées exactement à la seconde courante. Vos offres ont été envoyées à 13:09 et 13:24 — donc avant `from=13:55` → résultat **0** affiché.

C'est valable pour : Offres envoyées, Affaires conclues, Nouveaux clients, Commissions, etc. — tous les KPI du `AgentStatsSection`.

### 2. La carte du haut "OFFRES ENVOYÉES = 0" (capture d'écran)

Cette carte appelle `countUniqueOffres(offres)` sur **toutes les offres**, pas seulement celles d'aujourd'hui. Si elle affiche 0, c'est probablement un bug de la fonction `countUniqueOffres` ou un `offres` vide au moment du rendu. À vérifier — mais d'après la base : Carina a bien 739 offres dont 41 aujourd'hui → la page "Offres envoyées" en montre 445 (filtre différent), c'est cohérent.

Note importante : le sous-titre "Aujourd'hui" sur la carte est **trompeur** — elle compte en réalité TOUTES les offres uniques, pas celles du jour.

## Plan de correction

### Fix 1 — Préréglages de date (`src/components/stats/DateRangeFilter.tsx`)

Utiliser `startOfDay` et `endOfDay` :

```ts
import { startOfDay, endOfDay } from 'date-fns';

{ label: "Aujourd'hui",  getValue: () => ({ from: startOfDay(new Date()),                to: endOfDay(new Date()) }) },
{ label: "Hier",         getValue: () => ({ from: startOfDay(subDays(new Date(), 1)),    to: endOfDay(subDays(new Date(), 1)) }) },
{ label: "7 derniers jours", getValue: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
{ label: "30 derniers jours", getValue: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
```

Idem pour le picker custom (`from`/`to` doivent être normalisés en début/fin de jour).

### Fix 2 — Carte KPI "Offres envoyées" du haut (`src/pages/agent/Dashboard.tsx` ligne 346-351)

Faire correspondre le sous-titre à la valeur affichée :
- Soit afficher le **total unique** (cohérent avec `countUniqueOffres(offres)`) avec sous-titre "total"
- Soit afficher uniquement **les offres uniques d'aujourd'hui** (avec un filtre `date_envoi >= startOfDay(today)`)

Recommandation : afficher **les offres uniques d'aujourd'hui** (cohérent avec le sous-titre actuel), et ajouter une seconde info "X au total" en dessous.

### Résultat attendu

- Filtre "Aujourd'hui" → affiche les ~41 offres envoyées aujourd'hui (dédupliquées en X offres uniques)
- Filtre "7 jours", "Ce mois" etc. → bornes de jour correctes
- Carte KPI haut : valeur et sous-titre cohérents

### Hors-scope (à confirmer plus tard)

- Le faux UUID `67f3a2c5-…` que j'avais identifié dans ma précédente analyse était en réalité le `agents.id` légitime de Carina (la table `agents` a un `id` ≠ du `profiles.id`). **Aucune migration de données n'est nécessaire.**