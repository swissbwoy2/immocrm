

## Ajout du rôle "closeur" + Import CSV leads avec dédoublonnage par formulaire/pub

### Contexte

- La table `leads` n'a pas de colonne `formulaire` pour différencier les campagnes/pubs
- Le rôle "closeur" n'existe pas encore dans l'enum `app_role`
- Les RLS sur `leads` n'autorisent que les admins
- Le CSV Wix contient : Nom, Email, Source, **Formulaire** (ex: "Logisorama futur", "LOGISORAMA5.0", "NEW ACHETEUR-copy"), Canal, Téléphone

### Modifications

#### 1. Migration DB

- Ajouter `'closeur'` à l'enum `app_role`
- Ajouter colonne `formulaire TEXT` à la table `leads` (pour stocker la campagne/pub d'origine)
- Ajouter RLS sur `leads` : SELECT pour les closeurs (`has_role(auth.uid(), 'closeur')`)
- Créer un index unique `(email, formulaire)` pour empêcher les doublons par formulaire

#### 2. AuthContext + ProtectedRoute

- Ajouter `'closeur'` au type `UserRole` et à `VALID_ROLES`
- Ajouter activation closeur on login (comme coursier/agent)

#### 3. Edge function `import-leads-csv/index.ts` (nouveau)

- Reçoit le contenu CSV parsé (array de leads) + le nom du fichier
- Parse les colonnes Wix : Nom → prenom/nom, Adresse e-mail → email, Formulaire → formulaire, Téléphone → telephone, Source → source
- Utilise `INSERT ... ON CONFLICT (email, formulaire) DO NOTHING` pour éviter les doublons
- Retourne le nombre d'insérés vs ignorés (doublons)

#### 4. Page Closeur (`src/pages/closeur/Dashboard.tsx`)

- Dashboard simple avec la liste des leads (même vue que admin/Leads mais en lecture + relance)
- Accès aux leads Facebook (filtre par formulaire)
- Bouton d'import CSV (visible admin + closeur)

#### 5. Import CSV dans `src/pages/admin/Leads.tsx`

- Bouton "📥 Importer CSV" dans le header
- Dialog avec drag & drop de fichier CSV
- Parsing côté client (Papa Parse déjà utilisé dans le projet ?)
- Mapping automatique des colonnes Wix
- Preview des données avant import
- Appel à l'edge function pour l'insertion avec dédoublonnage
- Toast avec résultat : "85 leads importés, 24 doublons ignorés"
- Filtre par formulaire dans la liste des leads

#### 6. Routes `App.tsx`

- Ajouter routes `/closeur` et `/closeur/leads` avec `allowedRoles={['closeur']}`
- Ajouter `'closeur'` aux routes admin leads (`allowedRoles={['admin', 'closeur']}`) — non, closeur a sa propre page
- Route admin leads reste admin-only, mais on ajoute le bouton d'import CSV

#### 7. Navigation closeur

- Sidebar avec : Dashboard, Leads, Relancer

### Fichiers modifiés/créés

| Fichier | Action |
|---|---|
| Migration SQL | Enum + colonne formulaire + RLS closeur + index unique |
| `supabase/functions/import-leads-csv/index.ts` | Nouveau — import CSV avec dédoublonnage |
| `src/contexts/AuthContext.tsx` | Ajouter 'closeur' au type + activation |
| `src/components/ProtectedRoute.tsx` | Ajouter 'closeur' à VALID_ROLES |
| `src/pages/closeur/Dashboard.tsx` | Nouveau — dashboard closeur |
| `src/pages/admin/Leads.tsx` | Ajouter import CSV + filtre formulaire |
| `src/App.tsx` | Routes closeur |
| `src/components/AppLayout.tsx` | Nav closeur dans la sidebar |

