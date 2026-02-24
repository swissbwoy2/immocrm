

# Corriger la visibilité historique des offres et visites entre agents

## Probleme identifie

Quand on change l'agent assigne a un client :
- L'ancien agent perd la visibilite sur les offres qu'il a envoyees (la politique de securite supprime son acces)
- Le nouvel agent ne voit pas les offres et visites de l'ancien agent (les requetes filtrent par son propre `agent_id`)

Exemple concret : Carina a envoye des offres pour Noah. Si on assigne Ebenezer a la place, Ebenezer ne voit pas ce que Carina a fait, et Carina perd l'acces a son propre travail.

## Solution en 2 volets

### 1. Politique de securite (RLS) sur la table `offres`

Ajouter une politique SELECT permettant a un agent de TOUJOURS voir les offres qu'il a lui-meme creees, meme s'il n'est plus assigne au client :

```text
offres.agent_id = get_my_agent_id()  -->  acces en lecture garanti
```

Cela garantit que l'ancien agent conserve la visibilite sur son travail historique.

### 2. Requetes applicatives (code frontend)

Modifier les pages agent pour afficher aussi les offres/visites des co-agents du meme client :

| Fichier | Modification |
|---|---|
| `src/pages/agent/OffresEnvoyees.tsx` | Ajouter une 2e requete pour charger les offres des clients co-assignes (via `client_agents`), puis fusionner avec les offres propres |
| `src/pages/agent/Visites.tsx` | Idem : charger les visites des clients co-assignes en plus des visites propres |

### Detail technique

**Migration SQL** : Ajouter une politique RLS sur `offres` :
```text
CREATE POLICY "Agents can view their own offres"
ON offres FOR SELECT
USING (agent_id = get_my_agent_id());
```

**OffresEnvoyees.tsx** (ligne 226-230) :
- Requete actuelle : `.eq('agent_id', agentData.id)` (ne montre que ses propres offres)
- Nouvelle logique : Charger AUSSI les offres ou `client_id` est dans la liste des clients co-assignes via `client_agents`
- Fusionner les deux jeux de donnees en eliminant les doublons
- Marquer visuellement les offres d'autres agents (badge "Envoye par [nom agent]")

**Visites.tsx** (ligne 241-244) :
- Meme approche : ajouter une requete pour les visites des clients co-assignes
- Fusionner et marquer visuellement les visites d'autres agents

### Resultat attendu

- Carina voit toujours les offres qu'elle a envoyees pour Noah, meme apres reassignation
- Ebenezer voit les offres envoyees par Carina pour Noah (son client co-assigne)
- Le suivi historique est preserve dans les deux sens
- Les offres/visites d'un autre agent sont visuellement identifiees

