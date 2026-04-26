# 🔒 Verrouillage UX complet du mode démo

**Objectif** : En mode démo, le visiteur peut **uniquement naviguer**. Toute action d'écriture est désactivée visuellement (boutons grisés + tooltip explicatif), pas seulement bloquée silencieusement côté backend.

---

## 🎯 Stratégie : Garde universelle côté client

Plutôt que d'éditer 40+ fichiers un par un, on combine **3 mécanismes complémentaires** :

### 1. Hook `useDemoGuard()` — wrapper d'action universel
Nouveau hook qui retourne :
- `isDemo: boolean`
- `guard(actionFn)` : exécute l'action si pas démo, sinon affiche un toast `🎬 Mode démo : action désactivée. Activez votre vrai compte pour utiliser cette fonctionnalité.`
- `guardedClick(handler)` : même chose pour les `onClick`

### 2. Composant wrapper `<DemoLock>` autour des zones sensibles
- Désactive tous les `<button>`, `<input>`, `<textarea>`, `<select>` enfants via `pointer-events-none` + `opacity-60` quand démo actif
- Affiche un overlay subtil au survol avec tooltip "Lecture seule"
- Utilisé pour englober : ChangePasswordCard, formulaires de profil, formulaires d'envoi message, formulaires d'upload, etc.

### 3. Patches ciblés sur les composants à fort risque
Modification directe (intercept onClick + désactive disabled) sur :

| Composant / Page | Action bloquée |
|---|---|
| `ChangePasswordCard.tsx` | Changement mot de passe (cacher complètement le card) |
| `src/pages/client/Parametres.tsx` | Édition nom, prénom, email, téléphone, code activation |
| `src/pages/client/Documents.tsx` | Upload de documents |
| `src/pages/client/Messagerie.tsx` | Envoi de message + nouvelle conversation |
| `src/pages/client/OffresRecues.tsx` | Accepter / Refuser offre |
| `src/pages/client/Visites.tsx` | Confirmer / Annuler / Proposer créneau |
| `src/pages/client/MesCandidatures.tsx` | Postuler / Annuler postulation |
| `src/pages/client/Dossier.tsx` | Compléter / Modifier dossier |
| `src/pages/client/Calendrier.tsx` | Création événement |
| `RentalApplicationFormDialog.tsx` | Soumettre candidature |
| `CapturePhotosDialog.tsx`, `ExtractPoursuitesUploadDialog.tsx`, `MergeDocumentsDialog.tsx` | Tous uploads |
| `RequestDocumentsDialog.tsx`, `NewConversationDialog.tsx` | Envois |

Pour chacun : intercepter le `onClick` du bouton de submit avec `useDemoGuard().guard()` et passer `disabled={isDemo}` + tooltip "Mode démo — action désactivée".

### 4. Renforcement de la `DemoModeBanner`
Mettre à jour le wording :
> 🎬 **Mode démonstration en lecture seule** — Vous explorez un compte fictif. Toutes les actions sont désactivées. [Activer mon vrai compte →]

### 5. Bonus sécurité backend (déjà partiellement en place)
- Vérifier que les RLS RESTRICTIVE sont bien actives pour `messages`, `offres`, `candidatures`, `documents`, `visites`, `clients`, `profiles` (ajouter `profiles` si manquant pour bloquer changement nom/prénom)
- Ajouter un trigger sur `auth.users` pour empêcher `email`/`password` change si user_id = compte démo (filet de sécurité ultime même si le client appelle `supabase.auth.updateUser` directement)

---

## 📋 Fichiers à créer / modifier

**Nouveaux fichiers**
- `src/hooks/useDemoGuard.ts`
- `src/components/DemoLock.tsx`

**Modifiés (espace client uniquement, ~12 fichiers)**
- `src/components/DemoModeBanner.tsx` (wording renforcé)
- `src/components/ChangePasswordCard.tsx` (masqué en démo)
- `src/pages/client/Parametres.tsx` (formulaires en read-only)
- `src/pages/client/Documents.tsx` (upload désactivé)
- `src/pages/client/Messagerie.tsx` (input message désactivé)
- `src/pages/client/OffresRecues.tsx` (boutons accept/reject)
- `src/pages/client/Visites.tsx` (boutons d'action)
- `src/pages/client/MesCandidatures.tsx` (postuler désactivé)
- `src/pages/client/Dossier.tsx` (édition désactivée)
- `src/pages/client/Calendrier.tsx` (création désactivée)
- `src/components/RentalApplicationFormDialog.tsx`
- Quelques dialogs d'upload (Capture, Extract, Merge, RequestDocs)

**Migration SQL**
- Ajout RLS RESTRICTIVE sur `profiles` pour bloquer UPDATE par compte démo
- Trigger optionnel sur `auth.users` pour bloquer changement email/password

---

## ✅ Résultat attendu

En naviguant sur `/demo` :
- ✅ Bannière sticky claire "Lecture seule"
- ✅ Tous les boutons d'action grisés avec curseur `not-allowed` + tooltip
- ✅ Tous les inputs en `readonly` ou désactivés
- ✅ Toute tentative d'action → toast amical "Mode démo, activez votre compte"
- ✅ Backend impossible à corrompre même si quelqu'un bypass le frontend (RLS RESTRICTIVE)
- ✅ Mot de passe et email du compte Marc impossible à modifier
- ❌ Aucune frustration : le visiteur comprend immédiatement qu'il regarde une démo
