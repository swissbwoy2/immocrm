

## Corrections et offres dynamiques depuis la base de données

### Corrections de contact
- Email : `info@immo-rama.ch` (pas christ@immo-rama.ch)
- Téléphone : `+41 76 483 91 99` (pas +41 21 588 01 45) — dans le header ET la signature

### Offres réelles depuis la base de données

Au lieu de faux listings en dur, l'edge function va :
1. Requêter la table `offres` pour récupérer 3 offres aléatoires :
   - 1 studio (pieces <= 1.5)
   - 1 x 2.5 pièces (pieces entre 2 et 2.5)
   - 1 x 3.5 pièces (pieces entre 3 et 3.5)
2. Utiliser `ORDER BY random() LIMIT 1` pour chaque catégorie
3. Injecter les données réelles (adresse, prix, pièces, surface) dans le template HTML
4. Si aucune offre n'existe pour une catégorie, elle est simplement omise
5. Les photos restent des images Unsplash génériques (la table `offres` n'a pas de colonne photo)

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/send-lead-relance/index.ts` | Corriger email/tel, transformer `generateMarketingEmail()` pour accepter les offres en paramètre, ajouter la requête DB pour récupérer les 3 offres aléatoires avant l'envoi |
| `src/pages/admin/Leads.tsx` | Mettre à jour l'aperçu dans le dialog avec les bonnes coordonnées |

### Détail technique

La fonction `generateMarketingEmail` recevra un nouveau paramètre `offres: Array<{adresse, prix, pieces, surface}>` et générera dynamiquement les cartes d'offres. Avant la boucle d'envoi, on fait 3 requêtes :

```text
SELECT * FROM offres WHERE pieces <= 1.5 ORDER BY random() LIMIT 1
SELECT * FROM offres WHERE pieces >= 2 AND pieces <= 2.5 ORDER BY random() LIMIT 1
SELECT * FROM offres WHERE pieces >= 3 AND pieces <= 3.5 ORDER BY random() LIMIT 1
```

Chaque email aura donc des offres différentes (le random est par exécution de la function, pas par lead — pour simplifier on peut aussi randomiser par batch).

