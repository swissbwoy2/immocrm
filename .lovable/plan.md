
## Diagnostic

Le dashboard `/client` affiche "Recherche de logement" pour une cliente qui a créé son compte via le formulaire **Construire & Rénover**. Elle devrait voir un dashboard adapté à son projet de rénovation, pas un dashboard de recherche locative.

### Cause racine

Quand l'edge function `create-public-user` crée le profil/role, elle assigne **uniquement** le rôle `client` sans distinguer le **type de parcours** (locataire, acheteur, vendeur, maître d'ouvrage rénovation). Du coup, le dashboard client par défaut affiche le contenu "recherche de logement".

Vérifications à faire :
1. Lire `create-public-user/index.ts` → confirmer qu'aucun champ `type_recherche` ou marqueur "rénovation" n'est stocké
2. Lire `FormulaireConstruireRenover.tsx` → voir quelles données sont passées au signup et si un champ distinctif est envoyé
3. Lire le dashboard `/client` (probablement `src/pages/client/ClientDashboard.tsx` ou équivalent) → voir comment il décide quel contenu afficher
4. Vérifier en DB l'utilisateur `cendrinecardoso` : son `profiles` contient-il un marqueur ? `auth.users.raw_user_meta_data.user_type = 'maitre_ouvrage'` est-il présent ?
5. Vérifier s'il existe une table `projets_renovation` ou similaire (vu dans la mémoire `renovation-intelligente-reference-version`)

## Plan de correction

### 1. Identifier le marqueur de parcours
Rénovation = `user_type: 'maitre_ouvrage'` (déjà présent dans `auth.users.raw_user_meta_data` selon la dernière vérif). Il faut le **propager** dans `public.profiles` (colonne dédiée, ex: `parcours_type` ou `type_client`) pour que le dashboard puisse le lire sans toucher à `auth.users`.

### 2. Modifier `create-public-user` edge function
Accepter un nouveau champ `parcours` dans le payload (`'location' | 'achat' | 'vente' | 'renovation' | 'relocation'`) et l'enregistrer dans `profiles.parcours_type`.

### 3. Migration SQL
- Ajouter colonne `profiles.parcours_type TEXT` (nullable, défaut `'location'` pour ne rien casser)
- Réparer rétroactivement la cliente Cendrine (`UPDATE profiles SET parcours_type = 'renovation' WHERE id = ...`)

### 4. Mettre à jour les 3 formulaires publics
Ajouter `parcours` dans le payload envoyé à `create-public-user` :
- `FormulaireConstruireRenover` → `parcours: 'renovation'`
- `FormulaireRelouer` → `parcours: 'relocation'`
- `FormulaireVendeurComplet` → `parcours: 'vente'`

### 5. Adapter le Dashboard client
Lire `profiles.parcours_type` et afficher le bon header/contenu :
- `renovation` → "Suivi de votre projet de rénovation" (icône 🚧, lien vers espace rénovation)
- `vente` → "Suivi de votre vente" 
- `relocation` → "Suivi de votre relocation"
- `location`/`achat` (défaut) → contenu actuel inchangé

Si un module dashboard rénovation existe déjà (cf. mémoire `renovation-intelligente`), router directement vers celui-ci. Sinon, afficher un placeholder "Votre conseiller rénovation vous contactera sous 24h" avec les infos clés du projet.

### 6. Test end-to-end
- Créer un compte test via `/formulaire-construire-renover`
- Se connecter → vérifier que le dashboard affiche "Projet de rénovation" et non "Recherche de logement"
- Idem pour `/formulaire-relouer` (relocation) et `/formulaire-vendeur` (vente)

## Fichiers touchés

| Fichier | Action |
|---|---|
| Migration SQL | Ajout `profiles.parcours_type` + réparation Cendrine |
| `supabase/functions/create-public-user/index.ts` | Accepter + stocker `parcours` |
| `src/pages/FormulaireConstruireRenover.tsx` | Envoyer `parcours: 'renovation'` |
| `src/pages/FormulaireRelouer.tsx` | Envoyer `parcours: 'relocation'` |
| `src/pages/FormulaireVendeurComplet.tsx` | Envoyer `parcours: 'vente'` |
| Dashboard client (`src/pages/client/...`) | Brancher l'affichage sur `parcours_type` |

## Garanties
- ✅ Comptes existants `client` classiques inchangés (défaut `'location'`)
- ✅ Cliente Cendrine réparée par la migration
- ✅ Aucun impact sur agent/admin/apporteur
- ✅ Idempotent
