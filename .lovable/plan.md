# Micro-durcissement recherche /agent/clients

Les 4 ajustements de la spec sont déjà en place. Reste uniquement une sécurisation du nom complet dans la recherche.

## `src/pages/agent/MesClients.tsx`

Dans le bloc `matchSearch` (autour de la ligne 379-385), remplacer :

```ts
`${client.prenom} ${client.nom}`.toLowerCase().includes(q)
```

par :

```ts
`${client.prenom ?? ""} ${client.nom ?? ""}`.toLowerCase().includes(q)
```

Objectif : éviter qu'un client avec `prenom` ou `nom` undefined produise la chaîne `"undefined undefined"` qui pourrait matcher accidentellement la recherche `"undefined"`.

## Hors scope
- Aucun autre changement.
- Pas de modification du badge co-assigné (déjà conforme avec fallback `"Co-assigné avec agent inconnu"` sans duplication).
- Pas de touche au backend, DB, RLS, types, autres pages.

## Validation
- Build TS OK.
- Recherche fonctionne sur prénom, nom, nom complet, email, téléphone.
- Comportement identique pour les clients dont prénom + nom sont bien renseignés.
