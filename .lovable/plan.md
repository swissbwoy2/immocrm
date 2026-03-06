

## Plan d'implementation — Architecture Zero Public Write + Garde-fous

### Contexte

Actuellement, le frontend fait des INSERT/UPDATE directs sur `mandates`, `mandate_related_parties` et `mandate_documents` via le client anon. L'architecture cible supprime toutes les ecritures publiques directes et les remplace par 2 nouvelles edge functions securisees + mise a jour de l'existante.

---

### 1. Migration SQL — Supprimer les policies d'ecriture publique

Supprimer 3 policies :
- `"Anon can insert mandates"` sur `mandates`
- `"Anon can insert related parties for unsigned mandates"` sur `mandate_related_parties`
- `"Anon can insert documents for unsigned mandates"` sur `mandate_documents`

Aucune nouvelle policy publique. Seul `service_role` et admin authentifie peuvent ecrire.

---

### 2. Edge function `mandate-create/index.ts` (nouvelle)

Recoit les donnees d'identite, cree le mandat via `service_role`, retourne `{ mandate_id, access_token }`.

Validations strictes :
- Champs obligatoires : `email`, `prenom`, `nom`, `telephone`
- Validation format email basique
- Aucun token requis (premiere interaction)

---

### 3. Edge function `mandate-update-draft/index.ts` (nouvelle)

Recoit `{ mandate_id, access_token, action, data }`.

**Validation systematique avant toute operation :**
1. `mandate_id` et `access_token` presents → sinon 400
2. Le mandat existe avec cet `access_token` → sinon 403
3. `token_invalidated_at IS NULL` → sinon 403
4. `signed_at IS NULL` → sinon 409

**Actions avec whitelist stricte :**

| Action | Table cible | Champs autorises |
|--------|-------------|------------------|
| `update_identity` | mandates | email, prenom, nom, telephone, date_naissance, nationalite, adresse, npa, ville, type_permis, etat_civil, profession, employeur, revenus_mensuels, nombre_enfants, animaux, notes_personnelles |
| `update_search` | mandates | type_recherche, type_bien, zone_recherche, pieces_min, budget_max, date_entree_souhaitee, criteres_obligatoires, criteres_souhaites |
| `add_related_party` | mandate_related_parties | role, prenom, nom, email, telephone, date_naissance, nationalite, type_permis, profession, employeur, revenus_mensuels, lien_avec_mandant |
| `register_document` | mandate_documents | file_name, file_path, file_type, file_size, document_category |
| `update_legal_checkboxes` | mandates | les 11 champs `legal_*` (booleens uniquement) |

Tout champ hors whitelist est ignore. Types valides (string/number/boolean) selon le champ.

Pour `register_document` : validation supplementaire que `file_path` commence par `{mandate_id}/`, que `file_size` est <= 20MB, et que `file_type` est dans une liste autorisee (`application/pdf`, `image/jpeg`, `image/png`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`).

---

### 4. Mise a jour `mandate-submit-signature/index.ts`

Ajouter validation `access_token` :
- Le body doit contenir `access_token`
- Verifier que `access_token` correspond au `mandate_id`
- Verifier `token_invalidated_at IS NULL`
- Le reste du flux reste identique

---

### 5. Storage — Policy path-based maintenue

La policy existante reste : upload autorise uniquement si le dossier est un UUID valide correspondant a un mandat non signe. L'upload storage reste direct (pas via edge function) car la policy RLS le securise deja. Cependant, sans la policy INSERT sur `mandate_documents`, un fichier uploade sans appel a `mandate-update-draft` (action `register_document`) sera orphelin et invisible.

Pas de modification de la policy storage existante.

---

### 6. Frontend — Refactoring `MandatV3.tsx`

- `sessionStorage` : stocker `{ mandateId, accessToken }` au retour de `mandate-create`, restaurer au montage
- `saveMandateToDB` → appel `mandate-create` (premiere fois) ou `mandate-update-draft` action `update_identity` (mise a jour)
- Etape 2 → `mandate-update-draft` action `update_search`
- Etape 3 → `mandate-update-draft` action `add_related_party` (une par tiers)
- Etape 6 → `mandate-update-draft` action `update_legal_checkboxes`
- Etape 7 → `mandate-submit-signature` avec `access_token` ajoute au body
- Nettoyage `sessionStorage` apres signature reussie

---

### 7. Frontend — Refactoring `MandatV3Step4Documents.tsx`

- Upload storage direct (inchange)
- Apres upload reussi → appel `mandate-update-draft` action `register_document`
- Si l'edge function echoue → suppression immediate du fichier storage (`supabase.storage.from('mandates-private').remove([filePath])`)
- Passer `accessToken` en prop depuis `MandatV3.tsx`

---

### 8. `supabase/config.toml`

Ajouter :
```toml
[functions.mandate-create]
verify_jwt = false

[functions.mandate-update-draft]
verify_jwt = false
```

---

### Resume des fichiers

| Fichier | Action |
|---------|--------|
| Migration SQL | Supprimer 3 policies INSERT anon |
| `supabase/functions/mandate-create/index.ts` | Creer |
| `supabase/functions/mandate-update-draft/index.ts` | Creer |
| `supabase/functions/mandate-submit-signature/index.ts` | Modifier (ajouter validation access_token) |
| `supabase/config.toml` | Ajouter 2 entrees |
| `src/pages/MandatV3.tsx` | Refactorer (edge functions + sessionStorage) |
| `src/components/mandat-v3/MandatV3Step4Documents.tsx` | Refactorer (edge function + rollback) |
| `src/components/mandat-v3/MandatV3Step7Signature.tsx` | Pas de changement (recoit deja onSubmitSignature en prop) |

### Confirmation des 2 garde-fous

**1. Refus strict si token absent/invalide/invalide/non lie/mandat signe :**
- Chaque edge function (`mandate-update-draft`, `mandate-submit-signature`) effectue les 4 verifications dans cet ordre exact : presence → correspondance mandate_id ↔ access_token → `token_invalidated_at IS NULL` → `signed_at IS NULL`. Toute violation retourne une erreur HTTP appropriee (400/403/409).

**2. Storage strictement controle :**
- Bucket prive, aucune policy SELECT publique
- Upload limite au path `{mandate_id}/...` via regex UUID + verification mandat non signe
- Enregistrement DB uniquement via edge function avec validation `file_type` (5 MIME autorises), `file_size` (≤ 20MB), et `file_path` (doit commencer par le mandate_id)
- Lecture via signed URLs backend uniquement

