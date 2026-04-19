
## Vérification dashboard Relocation

Le fichier `src/pages/client/dashboards/RelocationClientDashboard.tsx` est bien en place (visible dans le contexte fourni) et il est branché dans le dispatcher `src/pages/client/Dashboard.tsx` via :

```
if (pt === 'relocation') return <RelocationClientDashboard profile={profile} />;
```

### Contenu actuel du dashboard Relocation
- Header `PremiumDashboardHeader` avec `parcoursType="relocation"` → affiche "Relocation de votre bien" avec icône `KeyRound`
- Empty state : "Votre relocation est en cours de préparation" + CTA "Contacter mon conseiller"
- 3 cartes raccourcis : Documents, Messagerie, Notifications
- Aucun bloc parasite locatif (offres / candidatures / mandat-v3)

### Vérifications restantes à faire

1. Confirmer en base qu'il existe au moins un compte avec `parcours_type='relocation'` pour tester (sinon création d'un compte test via `/formulaire-relouer`)
2. Vérifier que `FormulaireRelouer.tsx` envoie bien `parcours: 'relocation'` à l'edge function `create-public-user` — sinon les nouveaux comptes relocation atterriront sur le dashboard locatif par défaut
3. Vérifier que la sidebar client n'affiche pas d'entrées non pertinentes (Offres, Candidatures, Carte) pour un compte relocation

### Réponse courte
Oui, le dashboard Relocation est bien en place côté UI. Mais il reste à confirmer que les nouveaux inscrits via le formulaire "Relouer mon bien" reçoivent bien `parcours_type='relocation'` à la création du compte, sinon ils ne verront jamais ce dashboard.

### Plan proposé si tu veux qu'on sécurise tout
1. Lire `src/pages/FormulaireRelouer.tsx` et confirmer/corriger l'envoi du `parcours`
2. Lire l'edge function `create-public-user` pour vérifier qu'elle écrit bien `parcours_type` dans `profiles`
3. Requête de contrôle en DB : combien de profils ont `parcours_type='relocation'` aujourd'hui
4. Si nécessaire, migration ciblée pour réparer d'éventuels comptes relocation existants mal taggés
5. Filtrer la sidebar client par `parcours_type` (cohérence avec le travail déjà fait sur rénovation)

Aucun changement appliqué tant que ce plan n'est pas approuvé.
