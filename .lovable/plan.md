
# Correction du calcul des revenus : utiliser la date de paiement

## Problème identifié

Actuellement, les statistiques de chiffre d'affaires (revenus agence et commissions agents) sont calculées sur la base de `date_transaction` (date de remise des clés), alors que le paiement effectif a lieu à la signature du bail (`date_paiement_commission`).

**Exemple concret :**
- Hihal signe son bail en janvier → paiement reçu en janvier
- Hihal reçoit ses clés en février → transaction "conclue" en février
- **Résultat actuel** : Le revenu apparaît dans les stats de février
- **Résultat attendu** : Le revenu devrait apparaître dans les stats de janvier

## Solution proposée

Modifier les composants de statistiques pour filtrer les revenus sur `date_paiement_commission` plutôt que `date_transaction`.

---

## Modifications techniques

### 1. `AdminStatsSection.tsx`

**Changements :**

| Métrique | Date actuelle | Nouvelle date |
|----------|---------------|---------------|
| Revenus agence | `date_transaction` | `date_paiement_commission` |
| Commissions agents | `date_transaction` | `date_paiement_commission` |
| Graphique revenus | `date_transaction` | `date_paiement_commission` |

Les transactions seront filtrées selon ces critères :
- `statut === 'conclue'` (inchangé)
- `commission_payee === true` (nouveau critère)
- Période basée sur `date_paiement_commission`

**Nombre d'affaires conclues** : reste basé sur `date_transaction` (c'est une métrique d'activité, pas de revenu)

### 2. `AgentStatsSection.tsx`

**Même logique :**
- **Commissions gagnées** : filtrer sur `date_paiement_commission` + `commission_payee === true`
- **Graphique commissions** : utiliser `date_paiement_commission`
- **Affaires conclues** : reste sur `date_transaction` (activité)

### 3. `useAgentGoals.ts`

Pour l'objectif de type `commissions` :
- Filtrer sur `date_paiement_commission` au lieu de `date_transaction`
- Ajouter condition `commission_payee === true`

---

## Logique de filtrage améliorée

Nouveau flux pour les revenus :
```text
┌─────────────────────────────────────────────────────────────┐
│  AVANT (incorrect)                                          │
│  ─────────────────                                          │
│  Filtrer transactions par date_transaction                  │
│  → Tous les "conclue" dans la période                       │
│  → Sommer part_agence / part_agent                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  APRÈS (correct)                                            │
│  ──────────────────                                         │
│  Filtrer transactions où:                                   │
│    - statut = 'conclue'                                     │
│    - commission_payee = true                                │
│    - date_paiement_commission dans la période               │
│  → Sommer part_agence / part_agent                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/components/stats/AdminStatsSection.tsx` | Filtrer revenus sur `date_paiement_commission` |
| `src/components/stats/AgentStatsSection.tsx` | Filtrer commissions sur `date_paiement_commission` |
| `src/hooks/useAgentGoals.ts` | Modifier l'objectif `commissions` |

---

## Impact sur l'affichage

### Cartes de statistiques

| Carte | Comportement |
|-------|--------------|
| "Revenus agence" | Affiche uniquement les paiements effectués dans la période |
| "Comm. agents" | Affiche uniquement les commissions payées dans la période |
| "Affaires conclues" | Reste basé sur la date de transaction (activité) |

### Graphiques

- Le graphique "Revenus de l'agence" affichera les revenus à la date de paiement réel
- Le graphique "Commissions gagnées" (agent) affichera les commissions à la date de paiement

### Leaderboards

- Le classement "Top agents - Commissions" se basera sur les commissions effectivement payées

---

## Gestion des cas particuliers

| Cas | Comportement |
|-----|--------------|
| Transaction conclue mais pas encore payée | N'apparaît pas dans les revenus de la période |
| Transaction payée mais `date_paiement_commission` vide | Utiliser `date_transaction` comme fallback |
| Commission marquée payée sans date | Afficher un warning dans l'admin |

---

## Résultat attendu

**Exemple avec Hihal :**
- Signature bail : 15 janvier → commission marquée payée avec date 15 janvier
- Remise des clés : 10 février → statut passe à "conclue"

**Statistiques de janvier :**
- Revenus agence : inclut la commission Hihal ✓
- Affaires conclues : 0 (clés pas encore remises)

**Statistiques de février :**
- Revenus agence : n'inclut PAS Hihal (déjà comptée en janvier) ✓
- Affaires conclues : 1 (clés remises)

Maurine verra sa commission Hihal dans les stats de janvier, comme c'est réellement le cas.
