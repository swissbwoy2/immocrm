

## Compréhension

Tu veux que chaque parcours mène à un **vrai formulaire de création de compte complet** (pas un mini-lead form), avec toutes les infos métier nécessaires + activation de l'espace client.

## État actuel vérifié

| Parcours | Landing | Formulaire | Création compte | Statut |
|---|---|---|---|---|
| Louer | `/` (Hero) | `/mandat-v3` | ✅ Oui (signataire) | ✅ Complet |
| Acheter | `/` (Hero) | `/nouveau-mandat` | ✅ Oui | ✅ Complet (déjà prêt — tu confirmes) |
| Vendre | `/vendre-mon-bien` | `/formulaire-vendeur` (`FormulaireVendeurComplet`, 1241 lignes, 4 étapes, photos, GoogleAddress) | ❌ **Pas de signUp** — insère seulement un lead | ⚠️ Manque création compte |
| Relouer | `/relouer-mon-appartement` | `/formulaire-relouer` (3 étapes basiques) | ✅ signUp `proprietaire_bailleur` | ⚠️ Trop basique (pas de photos, pas assez de champs) |
| Construire & Rénover | `/construire-renover` | `/formulaire-construire-renover` (3 étapes) | ✅ signUp `maitre_ouvrage` | ⚠️ Basique mais OK pour démarrer — à enrichir |

## Ce qu'il faut faire

### 1. `FormulaireVendeurComplet` — Ajouter création de compte
Le formulaire est déjà très complet (photos, GoogleAddress, 4 étapes). Il manque juste :
- Une **étape 5 "Compte"** avec champ `password` (min 8 car.)
- Appel `supabase.auth.signUp` avec `user_type: 'proprietaire_vendeur'` avant l'insert lead
- Redirection vers `/inscription-validee`

### 2. `FormulaireRelouer` — Enrichir le formulaire
Passer de 3 → 4 étapes pour atteindre le niveau "complet" :
- **Étape 1 — Bien** : type, adresse Google autocomplete + NPA, pièces, chambres, SDB, surface, étage, équipements (balcon/terrasse/cave/parking/ascenseur)
- **Étape 2 — Location** : loyer, charges, date dispo, motif relocation, état, description
- **Étape 3 — Photos** : upload multi-photos (réutiliser logique de `FormulaireVendeurComplet`)
- **Étape 4 — Contact + Compte** : prénom/nom/email/tel + password
- signUp inchangé (`proprietaire_bailleur`)

### 3. `FormulaireConstruireRenover` — Enrichir
Passer de 3 → 4 étapes :
- **Étape 1 — Projet** : type, nature travaux, adresse Google, surface, budget, délai
- **Étape 2 — Détails** : pièces concernées, état actuel, contraintes, niveau finitions, description
- **Étape 3 — Photos/Plans** : upload (état existant ou plans)
- **Étape 4 — Contact + Compte** : password
- signUp inchangé (`maitre_ouvrage`)

### 4. Buckets Storage
Vérifier/créer si manquant : `bien-photos` (public, RLS owner) pour photos relouer + rénovation. Le bucket vendeur existe déjà.

### 5. Espace client
Aucune modif — l'espace client `/client/*` accueille déjà tous les nouveaux comptes via le rôle `client`.

## Garanties

- ✅ Acheter (`/nouveau-mandat`) et Louer (`/mandat-v3`) : **inchangés**
- ✅ Vendre : enrichi (étape compte ajoutée), reste du flow intact
- ✅ Relouer & Rénover : enrichis avec photos + champs métier complets
- ✅ Tous les nouveaux comptes ont accès à `/client/dashboard` après confirmation email
- ✅ Validation Zod stricte sur tous les champs
- ✅ Email confirmation via `notify.logisorama.ch`

