

## Distinction leads "Chercheur" vs "Vendeur" + qualification contextuelle

### Probleme actuel

La table `leads` a une colonne `type_recherche` mais elle n'est ni remplie à l'import CSV, ni utilisée dans les filtres ou l'affichage. Tous les leads sont traités de la même maniere, sans distinction entre un prospect qui cherche un appartement et un vendeur/proprietaire.

### Ce qui change

#### 1. Ajout d'un filtre "Type de lead" dans l'UI

Nouveau filtre Select avec 3 options :
- **Tous les types**
- **Chercheur** (recherche d'appartement — location ou achat)
- **Vendeur** (propriétaire qui veut vendre/confier un mandat)

#### 2. Badge visuel par type de lead

- **Chercheur location** : badge bleu "Location"
- **Chercheur achat** : badge vert "Achat"  
- **Vendeur** : badge orange/violet "Vendeur"
- **Non défini** : badge gris "À classifier"

#### 3. Qualification contextuelle selon le type

**Lead chercheur (location)** — criteres affichés :
- Salarié / non salarié
- Permis B, C ou Suisse
- Sans poursuites (ou avec garant)

**Lead chercheur (achat)** — criteres affichés :
- Accord bancaire
- Apport personnel
- Budget

**Lead vendeur** — pas de qualification solvabilité, badge different

#### 4. Import CSV : mapper `type_recherche`

Le nom du formulaire/pub permet de deviner le type :
- Formulaire contenant "acheteur", "acheter", "achat" → `type_recherche = 'Acheter'`
- Formulaire contenant "vendeur", "vendre", "estimation", "mandat" → `type_recherche = 'Vendre'`
- Sinon → `type_recherche = 'Louer'` (défaut, la majorité des leads)

L'edge function `import-leads-csv` sera mise à jour pour déduire automatiquement le type depuis le nom du formulaire.

#### 5. Possibilité de changer le type manuellement

Ajouter un select dans le dialog de notes/detail du lead pour modifier `type_recherche` manuellement.

### Fichiers modifiés

| Fichier | Changement |
|---|---|
| `supabase/functions/import-leads-csv/index.ts` | Déduire `type_recherche` depuis le nom du formulaire |
| `src/pages/admin/Leads.tsx` | Filtre par type, badge type, qualification contextuelle (acheteur vs locataire vs vendeur), select de modification type |
| `src/pages/closeur/Dashboard.tsx` | Badge type + qualification contextuelle |
| `src/components/ClientTypeBadge.tsx` | Réutiliser/étendre pour les leads (ajout variante "Vendeur") |

### Detail technique

- Le type Lead sera étendu avec `type_recherche` (déjà dans la DB)
- Filtre query : `query.eq("type_recherche", typeFilter)` 
- Import : logique de détection par mots-clés dans le champ `formulaire`
- Stats header : `X chercheurs • Y vendeurs • Z qualifiés`

