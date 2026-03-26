

## Corriger le comptage des affaires conclues — dès la signature

### Problème
Le trigger `create_transaction_on_cles_remises` ne passe la transaction en `conclue` que lors de la remise des clés. Mais pour les agents, une affaire est conclue dès que le bail est signé (`signature_effectuee = true`). Carina a 2 affaires signées mais voit 0 car ses transactions sont encore en statut `en_cours`.

### Solution

#### 1. Migration SQL — Ajouter un CASE 3 au trigger
Modifier `create_transaction_on_cles_remises()` pour aussi passer la transaction en `conclue` quand `signature_effectuee` passe à `true` :

```sql
-- CASE 3: signature_effectuee -> update transaction to 'conclue'
IF NEW.signature_effectuee = true AND (OLD.signature_effectuee IS NULL OR OLD.signature_effectuee = false) THEN
  UPDATE transactions SET statut = 'conclue', updated_at = now()
  WHERE offre_id = NEW.offre_id AND client_id = NEW.client_id;
END IF;
```

#### 2. Migration SQL — Rattraper les transactions existantes de Carina
Mettre à jour les transactions existantes liées à des candidatures déjà signées :

```sql
UPDATE transactions t
SET statut = 'conclue', updated_at = now()
FROM candidatures c
WHERE t.offre_id = c.offre_id
  AND t.client_id = c.client_id
  AND c.signature_effectuee = true
  AND t.statut = 'en_cours';
```

#### 3. Aucun changement côté frontend
Le dashboard filtre déjà `t.statut === 'conclue'` — une fois les transactions mises à jour, les KPIs "Affaires conclues" et "Ce mois" s'afficheront correctement.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| Nouvelle migration SQL | Ajout CASE signature_effectuee au trigger + rattrapage données |

