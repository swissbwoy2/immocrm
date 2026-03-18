

## Diagnostic — Pourquoi tout est a zero sur le dashboard Agent (et Client)

### Cause racine

Lors de l'optimisation de performance precedente, les colonnes des requetes `offres` ont ete reduites pour gagner en rapidite. Mais **4 colonnes inexistantes** ont ete incluses dans le `select`, ce qui fait echouer silencieusement la requete PostgREST (erreur 400, zero resultats retournes) :

| Colonne demandee | Existe ? | Correction |
|---|---|---|
| `source` | Non | Supprimer |
| `lien` | Non | Remplacer par `lien_annonce` |
| `statut_client` | Non | Supprimer |
| `note_interet` | Non (existe sur `visites_vente`, pas sur `offres`) | Supprimer |

### Fichiers impactes

| Fichier | Ligne | Correction |
|---|---|---|
| `src/pages/agent/Dashboard.tsx` | ~106 | Corriger le `.select()` : retirer `source, lien, statut_client, note_interet`, ajouter `lien_annonce` |
| `src/pages/client/Dashboard.tsx` | ~140 | Meme correction |
| `src/pages/agent/Dashboard.tsx` | ~269-287 | Le filtre `clientReactions` qui utilise `o.statut` pour les reactions (interesse, visite_planifiee, etc.) doit etre revise — ces valeurs sont probablement dans `statut` directement |

### Impact

- **Dashboard Agent** : offres = 0, stats = 0, reactions = 0, taux de conversion = 0
- **Dashboard Client** : offres recues = 0
- Candidatures et commissions restent corrects (requetes separees qui ne touchent pas la table `offres`)

### Correction

Remplacer les selects par les colonnes reelles de la table `offres` :
```
'id, date_envoi, adresse, client_id, prix, pieces, surface, lien_annonce, agent_id, statut, titre, type_bien, clients(user_id)'
```

