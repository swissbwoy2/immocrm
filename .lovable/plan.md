
## Diagnostic à faire

Le compte `cendrinecardoso@gmail.com` est un client (`parcours_type='renovation'`). Quand elle se connecte, elle arrive sur `/client` qui rend `src/pages/client/Dashboard.tsx`. Ce dashboard a été modifié pour passer `parcoursType` au header — mais le **contenu** reste celui de la recherche de logement.

Donc ce que voit Cendrine :
- header = "Projet de rénovation" ✅
- corps du dashboard = cartes "offres / candidatures / visites / mandat-v3" ❌

Ce n'est PAS le bon dashboard pour un parcours rénovation.

## Vérifications à faire avant de coder

1. Lire `src/pages/client/Dashboard.tsx` actuel pour confirmer qu'il n'y a pas encore de branchement par parcours
2. Confirmer en DB que `cendrinecardoso` a bien `parcours_type='renovation'`
3. Vérifier RLS sur `renovation_projects` pour le rôle `client`
4. Vérifier `AppSidebar` côté client (menu identique pour tous les parcours actuellement)

## Plan de correction

### 1. Transformer `/client` en dispatcher
`src/pages/client/Dashboard.tsx` devient un router selon `profiles.parcours_type` :
- `renovation` → `<RenovationClientDashboard />`
- `vente` → `<VenteClientDashboard />`
- `relocation` → `<RelocationClientDashboard />`
- `location` / `achat` / défaut → comportement actuel (dashboard locatif inchangé)

### 2. Créer `RenovationClientDashboard`
Nouveau fichier `src/pages/client/dashboards/RenovationClientDashboard.tsx` :
- Header parcours rénovation (réutilise `PremiumDashboardHeader` avec `parcoursType='renovation'`)
- Charge les `renovation_projects` du client (`client_id = auth.uid()`)
- Si projet existant : carte "Mon projet" + statut + lien vers détails
- Si aucun projet : empty state "Votre conseiller rénovation vous contactera sous 24h"
- Cartes : Documents, Messagerie, Notifications
- AUCUN bloc "offres / candidatures / mandat-v3"

### 3. Créer `VenteClientDashboard` et `RelocationClientDashboard`
Squelettes propres (header + empty state + accès messagerie/documents) pour ne pas qu'un client vente/relocation tombe sur du contenu locatif.

### 4. Filtrer le menu latéral
Dans `src/components/AppSidebar.tsx`, le case `'client'` doit lire `profile.parcours_type` et masquer les entrées non pertinentes pour rénovation/vente/relocation (ex : "Offres", "Candidatures", "Carte" si elles existent — à confirmer en lisant le fichier).

### 5. Vérifier RLS `renovation_projects`
Si le client ne peut pas lire son propre projet, ajouter une policy SELECT minimale via migration.

### 6. Test end-to-end
Login `cendrinecardoso` → `/client` → doit voir un dashboard rénovation cohérent.

## Fichiers touchés
| Fichier | Action |
|---|---|
| `src/pages/client/Dashboard.tsx` | Refactor en dispatcher |
| `src/pages/client/dashboards/RenovationClientDashboard.tsx` | Créé |
| `src/pages/client/dashboards/VenteClientDashboard.tsx` | Créé |
| `src/pages/client/dashboards/RelocationClientDashboard.tsx` | Créé |
| `src/components/AppSidebar.tsx` | Menu client filtré par `parcours_type` |
| Migration RLS | Si lecture `renovation_projects` bloquée pour client |

## Garanties
- ✅ Clients location/achat existants : zéro changement
- ✅ Module rénovation admin/agent/proprio (figé) : non touché
- ✅ Sécurité RLS préservée
