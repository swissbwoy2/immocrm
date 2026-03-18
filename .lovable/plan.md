

## Diagnostic

J'ai analysé en profondeur le code et la base de données. Voici ce que j'ai trouvé :

1. **Les données existent** : 1118 offres en base, la plus récente date d'hier (17 mars 2026)
2. **Les requêtes sont correctes** : les colonnes invalides ont été corrigées dans le message précédent
3. **Les clés étrangères sont valides** : toutes les FK utilisées dans les `select()` existent

### Cause probable : le Service Worker force la déconnexion

Tu es actuellement redirigé sur `/login` — ce qui signifie que la session d'authentification a été perdue. Le Service Worker contient encore du code agressif (lignes 20-29 de `main.tsx`) qui force l'activation immédiate d'un nouveau SW via `SKIP_WAITING`. Quand un nouveau SW s'active, il peut invalider le cache et perdre la session, ce qui :
- Redirige vers `/login`
- Fait que toutes les requêtes protégées par RLS retournent 0 résultats

### Corrections à appliquer

| Fichier | Changement |
|---|---|
| `src/main.tsx` | Supprimer les blocs `SKIP_WAITING` (lignes 19-29) qui forcent l'activation immédiate du nouveau SW et causent la perte de session |
| `src/main.tsx` | Garder uniquement le check périodique avec `!document.hidden` (déjà en place) |

### Ce qui change

- Plus de `SKIP_WAITING` → le nouveau SW ne s'active qu'au prochain chargement complet (comportement normal)
- La session auth n'est plus perdue au changement d'onglet
- Les stats ne seront plus à zéro car l'utilisateur reste connecté

### Résultat attendu

Après cette correction + reconnexion + hard refresh :
- La session persiste entre les changements d'onglets
- Les offres, transactions, candidatures se chargent normalement
- Les stats affichent les vraies valeurs

