
## Diagnostic confirmé

Le problème visible n’est pas seulement en base, il est surtout dans le rendu du dashboard.

### Cause racine actuelle
Dans `src/pages/client/Dashboard.tsx` :
- le dashboard charge bien `profiles.parcours_type` (`select('actif, prenom, nom, parcours_type')`)
- mais au moment d’afficher le header, il passe seulement `isAcheteur` à `PremiumDashboardHeader`
- il ne passe jamais `parcoursType={clientProfile?.parcours_type}`

Dans `src/components/premium/PremiumDashboardHeader.tsx`, la logique est :
- si `parcoursType` est absent → fallback sur `isAcheteur ? 'achat' : 'location'`
- donc un compte rénovation retombe automatiquement sur `location`
- résultat : badge “Recherche de logement”

## Ce que je vais corriger

### 1. Corriger le header du dashboard client
Modifier `src/pages/client/Dashboard.tsx` pour transmettre explicitement :
- `parcoursType={clientProfile?.parcours_type}`

Effet attendu :
- `renovation` → “Projet de rénovation”
- `vente` → “Vente de votre bien”
- `relocation` → “Relocation de votre bien”
- `achat/location` → comportement actuel conservé

### 2. Ajouter une normalisation défensive
Toujours dans le dashboard, sécuriser la valeur lue depuis le profil :
- si `parcours_type` est vide/invalide → fallback propre
- sinon utiliser la valeur exacte

But :
- éviter qu’un profil incomplet revienne encore sur “Recherche de logement” sans contrôle

### 3. Adapter le contenu principal pour les comptes rénovation
Aujourd’hui, même après correction du header, le reste du dashboard reste orienté location (`offres`, `visites`, `candidatures`, bouton `Compléter mon dossier` vers `/mandat-v3`).

Je vais donc ajouter une branche spécifique si `parcours_type === 'renovation'` :
- carte d’accueil “Suivi de votre projet de rénovation”
- message cohérent avec la promesse rénovation
- CTA vers l’espace rénovation si disponible
- sinon bloc d’attente clair au lieu des cartes “recherche de logement”

### 4. Exposer correctement l’espace rénovation côté client
Le module rénovation existe déjà dans `src/features/renovation/...`, mais les routes actuelles sont seulement :
- `/agent/renovation`
- `/admin/renovation`
- `/proprietaire/renovation`

Il n’existe pas de route client dédiée dans `src/App.tsx`.

Je vais donc :
- soit créer `/client/renovation` et `/client/renovation/:id` si le client doit accéder au module
- soit garder le dashboard client classique mais avec un bloc rénovation dédié si ce module n’est pas encore prêt pour le rôle `client`

### 5. Vérifier la cohérence des nouveaux formulaires
Le code des formulaires est déjà bon en lecture :
- `FormulaireConstruireRenover` envoie `parcours: 'renovation'`
- `FormulaireRelouer` envoie `parcours: 'relocation'`
- `FormulaireVendeurComplet` envoie `parcours: 'vente'`

Je vérifierai quand même lors de l’implémentation que :
- `create-public-user` stocke bien `profiles.parcours_type`
- les comptes déjà créés avant le correctif sont réparés si nécessaire

## Fichiers à toucher
- `src/pages/client/Dashboard.tsx`
- `src/App.tsx` si on ouvre des routes client rénovation
- éventuellement composants/sections du dashboard client pour une variante rénovation dédiée
- éventuellement une migration ciblée seulement si des profils existants ont encore la mauvaise valeur

## Résultat attendu
Un client inscrit via **Construire & Rénover** ne verra plus “Recherche de logement”, mais un dashboard cohérent avec son parcours rénovation, avec contenu et CTA adaptés.
