# Cohérence des compteurs mandat (Dashboard ↔ Mon contrat)

## Constat (compte démo Dupont)

| Endroit | Texte affiché | Source de la date de départ |
|---|---|---|
| Dashboard client | « Il vous reste **6j 3h** sur votre mandat » | `client.date_ajout` / `created_at` (≈ J84) |
| Mon contrat | « Votre mandat se termine dans **0 jour** » | `client.mandat_date_signature` (18 déc 2025 → J90 dépassé) |
| Mon contrat | « renouvelé automatiquement le **18 mars 2026** » | Affiche la fin *passée*, pas la prochaine date de renouvellement |

Deux problèmes :
1. **Source de vérité différente** : Dashboard ignore `mandat_date_signature`, Mon contrat le priorise → écarts de plusieurs semaines.
2. **Date de renouvellement dans le passé** : quand J91+ a déjà eu lieu mais que la base n'a pas encore été mise à jour par le cron, on affiche la date de fin originale au lieu de la prochaine échéance.

## Correctifs

### 1. Source unique de vérité

Créer un util `src/utils/mandatDates.ts` exporté :

```ts
getMandatDates(client) → { start, end, daysSinceSignature, daysRemaining, isAutoRenewed }
```

Règle de priorité (alignée sur l'edge function `mandate-expiry-reminders`) :
- `mandat_date_signature` en priorité,
- sinon `date_ajout`,
- sinon `created_at`.

Soustraire `mandate_pause_days` du calcul (déjà fait dans MonContrat, à ajouter au Dashboard).

### 2. Projection « auto-renouvelé » si la fin est dépassée

Si `now > end` ET `client.refund_status` ∉ {pending, processed} ET pas d'annulation : considérer que le mandat a été renouvelé automatiquement → recalculer `end = end + 90j` (autant de fois que nécessaire pour repasser dans le futur) et remettre le compteur `daysSinceSignature` modulo 90.

Le texte devient : « Renouvelé automatiquement le {nouvelle date} » au lieu de la date passée.

### 3. Câblage

- `src/pages/client/Dashboard.tsx` (lignes 454–464) : remplacer le calcul local par `getMandatDates(client)`.
- `src/pages/client/MonContrat.tsx` (lignes 216–234) : remplacer `getMandatDates` local par l'import.
- `src/pages/client/dashboards/RelocationClientDashboard.tsx` : vérifier qu'il consomme la même source (à inspecter).

Aucun changement DB, aucun changement d'edge function.

## Pourquoi ça résoudra l'écran démo

- Dashboard et Mon contrat afficheront **le même nombre de jours** (basé sur `mandat_date_signature`).
- La phrase « renouvelé automatiquement le 18 mars 2026 » deviendra « le 16 juin 2026 » (= 18 mars + 90j, projeté dans le futur).
- Le bouton « Demander un remboursement » restera grisé puisque le compteur sera bien remis à 0 après renouvellement auto.
