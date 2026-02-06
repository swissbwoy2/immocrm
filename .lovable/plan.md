

# Permettre a l'admin de deleguer des visites aux coursiers

## Probleme actuel

Seuls les **agents** peuvent deleguer des visites aux coursiers, via le bouton sur `/agent/visites`. L'admin n'a aucun moyen de le faire depuis son interface.

## Solution

Ajouter une section **"Deleguer une visite"** dans la page `/admin/coursiers` qui permet a l'admin de :
1. Voir la liste des visites eligibles (planifiees, pas encore deleguees a un coursier)
2. Cliquer sur un bouton pour envoyer une visite dans le pool coursier

## Modifications techniques

### Fichier modifie : `src/pages/admin/Coursiers.tsx`

1. **Charger les visites eligibles** : Ajouter une requete pour recuperer les visites avec `statut_coursier IS NULL` et `statut = 'planifiee'`, avec les informations de l'offre associee (adresse, client).

2. **Ajouter une section "Visites a deleguer"** entre les stats et la liste des coursiers :
   - Une carte listant les visites disponibles avec : adresse, date, nom du client
   - Un bouton **"Deleguer au coursier (5.-)"** sur chaque visite
   - Au clic, la visite est mise a jour avec `statut_coursier = 'en_attente'` et `remuneration_coursier = 5`

3. **Rafraichir les donnees** apres chaque delegation pour mettre a jour les compteurs et les listes.

### Pas de modification de base de donnees necessaire

L'admin a deja les droits RLS necessaires pour modifier les visites (via les policies existantes sur la table `visites`). Aucune migration n'est requise.

## Resultat attendu

L'admin pourra depuis `/admin/coursiers` :
- Voir toutes les visites planifiees qui ne sont pas encore envoyees au pool coursier
- Deleguer n'importe quelle visite en un clic
- Suivre les missions en cours et gerer les paiements (deja en place)

