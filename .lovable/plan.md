## Problème

Aujourd'hui, `scanClientExtracts` s'arrête au **1er document** dont l'IA donne une date avec confidence ≥ 0.5, en partant du plus récemment **uploadé**. Mais la date d'**upload** ≠ date d'**émission** :

- Un client peut uploader un vieux extrait hier → on le prend et on dit "échu"
- Alors qu'il a aussi uploadé il y a 2 mois un extrait fraîchement émis → toujours **valide**

Résultat : faux négatifs ("échu" affiché alors qu'un valide existe).

## Solution

Scanner **TOUS** les extraits du client, puis garder celui dont la **`date_emission` extraite par l'IA est la plus récente** (et confidence ≥ 0.5).

### 1. `supabase/functions/_shared/extract-poursuites.ts`

Refactorer `scanClientExtracts` :
- Boucler sur tous les documents `extrait_poursuites` du client (pas de short-circuit)
- Collecter tous les résultats IA valides (`date_emission` + `confidence ≥ 0.5`)
- Retourner celui avec la `date_emission` **maximale** (la plus récente)
- Conserver `scanned` / `total` pour les logs
- Garder un fallback : si aucun ≥ 0.5, retourner `null` comme avant

```ts
const validResults = [];
for (const doc of docs) {
  const ai = await extractFromPdf(supabase, doc, lovableKey);
  if (ai?.date_emission && (ai.confidence ?? 0) >= 0.5) {
    validResults.push({ document_id: doc.id, ...ai });
  }
}
// Garder la date d'émission la plus récente
const best = validResults.sort((a, b) =>
  b.date_emission.localeCompare(a.date_emission)
)[0] ?? null;
```

### 2. Impact

- `extract-poursuites-date` (1 client) : bénéficie automatiquement de la nouvelle logique
- `extract-poursuites-batch` (masse) : idem, aucune modif nécessaire
- Le champ `extrait_poursuites_document_id` pointera désormais vers le document **le plus récent en date d'émission**, pas en date d'upload

### 3. Coût / performance

- On scanne maintenant **tous** les extraits d'un client au lieu de s'arrêter au 1er
- En pratique : 1-3 extraits par client en moyenne → impact mineur
- Le délai de 800ms entre clients dans le batch reste suffisant

### 4. Re-scan

Après déploiement, l'utilisateur pourra cliquer sur **"Re-scanner tout"** dans `/admin/suivi-extraits` pour mettre à jour les clients qui auraient été marqués "échu" à tort.

## Fichiers modifiés

- `supabase/functions/_shared/extract-poursuites.ts` (logique de sélection du meilleur extrait)

Aucune modif UI ni DB nécessaire.
