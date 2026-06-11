## Diagnostic

J'ai vérifié la base. Deux problèmes différents :

### 1. Carina voit des clients supprimés (vrai bug UI)

Carina a 8 clients anonymisés (`statut = 'inactif'`, `anonymise_at` rempli) qui apparaissent encore dans sa liste :

- Haris Qeska, Braima Braima, Karabrahimi Mondi, Ramadan Zumeraj, Rafaela Carvalho, Hamza Guerouaj, Tosca Rubli, Sofiane Neka.

Cause : `src/pages/agent/MesClients.tsx` (l. 76–95) charge tous les `client_agents` puis tous les `clients` sans filtrer `anonymise_at IS NULL`. La fonction `delete-client` ne supprime PAS les lignes `client_agents` à la fin (elle anonymise le client mais conserve les liens agent ↔ client pour l'historique commission). Résultat : ils restent dans la liste de l'agent.

### 2. Oriane voit Chaltu Abdi Ahmed (donnée réelle, pas un bug UI)

Chaltu a 3 entrées dans `client_agents` :
- Victoria Martins → primaire
- Carina Tavares → co-assignée (créée 2026-04-29)
- **Oriane Dulymbois → co-assignée (créée 2026-05-23)**

Donc Oriane est réellement co-assignée sur Chaltu en base. L'UI fait son travail. Si elle ne doit pas l'être, il faut supprimer la ligne `client_agents` correspondante (`id = bd12a26d-0662-40dc-980a-cc5b73b7b8a2`).

## Plan

### Fix 1 — Masquer les clients anonymisés dans /agent/clients (front uniquement)

`src/pages/agent/MesClients.tsx`, modifier la requête `clients` (l. 92–95) :

```ts
const { data: clientsData, error } = await supabase
  .from('clients')
  .select('*')
  .in('id', clientIds)
  .is('anonymise_at', null);
```

Effet :
- Carina ne verra plus les 8 dossiers anonymisés.
- Les KPI Principaux / Co-assignés / Total portfolio reflèteront le vrai portefeuille vivant.
- Aucun impact sur l'historique commissions (les lignes `client_agents` et `transactions` restent intactes).
- Aucun changement backend, RLS, ou autres pages.

### Fix 2 — Cas Oriane × Chaltu

Avant d'agir, je veux confirmation : faut-il **supprimer** la co-assignation Oriane → Chaltu (`client_agents.id = bd12a26d-0662-40dc-980a-cc5b73b7b8a2`, créée le 23/05/2026) ? Ou est-ce une co-assignation légitime qu'on garde ?

Si OUI on supprime : 1 DELETE ciblé sur cette ligne uniquement. Carina (co) et Victoria (primaire) restent inchangées.

## Hors scope

- Pas de changement de la fonction `delete-client` (le comportement actuel "garder client_agents pour l'historique" est volontaire).
- Pas de changement RLS.
- Pas de modification de `PremiumClientCard.tsx` ni des autres pages.

## Question avant build

Confirme deux choses :
1. OK pour le filtre `anonymise_at IS NULL` dans la liste agent ?
2. Pour Chaltu : on retire Oriane de la co-assignation, ou on la laisse ?
