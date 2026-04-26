## 🎯 Logique métier finale

### Périodes & boutons disponibles

| Période | Annuler simple | Annuler + Remboursement | Renouveler | Pause |
|---------|:---:|:---:|:---:|:---:|
| **J1 → J81** (activation) | ✅ Visible | 🔒 Grisé (tooltip "Disponible J82") | ➖ | ✅ |
| **J82 → J89** (fenêtre remboursement) | ❌ Masqué | ✅ Visible | ✅ Visible | ✅ |
| **J90** | — | — | — | — |
| **J91+** | — | — | ⚙️ **Renouvellement automatique** | — |

### Badge dynamique
- 🔴 **"Non éligible au remboursement"** : J1 → J81
- 🟢 **"Éligible au remboursement"** : J82 → J89

### Formulaire de raison (obligatoire pour toute annulation)
1. **"J'ai trouvé par moi-même"** → ❌ Jamais de remboursement (même au J88)
2. **"Je ne cherche plus"** → Remboursement si J82+
3. **"Je continue mes recherches seul"** → Remboursement si J82+

### Règle finale
```
refund_eligible = (jour >= 82) 
              AND (raison !== 'found_alone') 
              AND (action === 'cancel_with_refund')
```

### Mise en pause (NEW)
- Disponible **à tout moment** depuis l'espace client
- **Compteur gelé** : si pause au J50, reprise repart à J50
- **Aucun email de relance** pendant la pause
- Bouton "Reprendre mon mandat" toujours visible
- Pas de date limite

### Après annulation
- Statut → `inactif` **immédiatement**
- Si remboursement éligible : `refund_status = 'pending'`
- Remboursement traité **30 jours après le J90 d'origine** → notification admin
- Mandat **figé** : aucune relance ni renouvellement possible

---

## 🗄️ Changements base de données

### Migration SQL
1. **Colonnes ajoutées sur `clients`** :
   - `cancellation_reason` (text, nullable) : `found_alone` | `not_searching_anymore` | `searching_alone`
   - `refund_eligible` (boolean, default false)
   - `refund_status` (text, default 'not_applicable') : `not_applicable` | `pending` | `processed`
   - `refund_requested_at` (timestamptz, nullable)
   - `refund_processed_at` (timestamptz, nullable)
   - `mandate_paused_at` (timestamptz, nullable)
   - `mandate_pause_days` (int, default 0) — total jours en pause cumulés (gel du compteur)
   - `mandate_official_end_date` (date, nullable) — calculée = J90 d'origine

2. **Colonnes ajoutées sur `mandate_renewal_actions`** :
   - `cancellation_reason` (text, nullable)
   - `refund_eligible` (boolean, default false)
   - `days_since_signature` (int) — pour audit

3. **Nouvelle action enum** : ajout de `paused`, `resumed`, `cancelled_with_refund` dans le champ `action`.

---

## ⚙️ Edge Functions

### 1. `mandate-renewal-action` (modifié)
- Accepte nouveau body : `{ token, action, cancellation_reason? }`
- Actions supportées : `renew` | `cancel` | `cancel_with_refund` | `pause` | `resume`
- Validation serveur :
  - `cancel_with_refund` : refuse si `daysSinceSignature < 82` ou `reason === 'found_alone'`
  - `cancel` : exige `cancellation_reason` obligatoire
  - `pause` : ajoute timestamp, ne touche pas au statut
  - `resume` : calcule jours en pause et ajoute à `mandate_pause_days`
- Calcule `refund_eligible` côté serveur (jamais de confiance au client)
- Notifie admin si remboursement demandé

### 2. `mandate-expiry-reminders` (modifié)
- **Skip les clients en pause** (`mandate_paused_at IS NOT NULL`)
- Calcul ajusté : `days_remaining = 90 - (days_elapsed - mandate_pause_days)`
- Email J-30 contient désormais 3 CTA selon période :
  - **J60-J81** : Renouveler / Annuler (avec mention "remboursement disponible à partir du jour 82")
  - **J82-J89** : Renouveler / Annuler + Remboursement / Pause
- Au J90 sans action → renouvellement auto (inchangé)

---

## 🎨 Frontend

### `src/pages/MandatRenouvellement.tsx` (modifié)
- Affiche le **formulaire de raison** dès qu'action = `cancel` ou `cancel_with_refund`
- 3 radio buttons + zone texte optionnelle "Précisions"
- Validation : raison obligatoire, désactive bouton confirmer sinon
- Messages de confirmation conditionnels :
  - **Avec remboursement** : "Vous avez demandé votre remboursement et annulé votre mandat. Il se terminera officiellement dans X jours. Vous recevrez des offres jusqu'au 90ème jour. Votre remboursement sera traité à partir du 90ème jour sous un délai de 30 jours."
  - **Sans remboursement** : "Votre recherche est annulée. Merci de votre confiance."
  - **Trouvé par moi-même** : "Félicitations pour votre nouveau logement ! Votre mandat est annulé. (Non éligible au remboursement selon nos CGV)"

### `src/pages/client/MonContrat.tsx` (modifié)
- **Bandeau dynamique** selon période :
  - J60-J81 : orange "Votre mandat se termine dans X jours" + boutons `Renouveler` / `Annuler` / `Pause`
  - J82-J89 : vert avec badge "🟢 Éligible au remboursement" + boutons `Renouveler` / `Annuler + Remboursement` / `Pause`
- **Section badge éligibilité** toujours visible :
  - 🔴 "Non éligible au remboursement (J{X}/82)" avec progress bar
  - 🟢 "Éligible au remboursement" si J82+
- **Section Pause** :
  - Si en pause : bandeau bleu "⏸️ Mandat en pause depuis le X" + bouton "Reprendre"
  - Sinon : bouton discret "Mettre en pause" en bas

### Composant nouveau : `src/components/mandat/CancellationReasonForm.tsx`
- Réutilisable, prend `onSubmit(reason, details?)` en prop
- 3 options + textarea optionnelle

### `src/pages/admin/ClientDetail.tsx` (modifié)
- Nouvelle section "Remboursements" :
  - Liste des demandes en attente (`refund_status = 'pending'`)
  - Affiche : client, date demande, raison, montant à rembourser, date traitement prévue (J90 + 30j)
  - Bouton "Marquer comme remboursé" → passe en `processed`

---

## 📧 Email (templates mis à jour)

### Template J60-J81
- Sujet : `⏰ Votre mandat se termine dans {X} jours`
- 2 CTA : `Renouveler` (bleu) / `Annuler ma recherche` (gris)
- Mention : *"Le remboursement deviendra disponible à partir du 82ème jour."*
- Mention : *"Sans action, votre mandat sera renouvelé automatiquement le {date_J90}."*

### Template J82-J89
- Sujet : `🎯 Votre mandat se termine dans {X} jours - Remboursement disponible`
- 3 CTA : `Renouveler` / `Annuler + Remboursement` / `Mettre en pause`
- Mention : *"Vous êtes éligible au remboursement (sauf si vous avez trouvé par vos propres moyens)."*

---

## 📁 Fichiers créés/modifiés

### Création
- `src/components/mandat/CancellationReasonForm.tsx`
- Migration SQL (colonnes + enum)

### Modification
- `supabase/functions/mandate-renewal-action/index.ts` (logique remboursement + pause)
- `supabase/functions/mandate-expiry-reminders/index.ts` (skip pause + 3 CTA)
- `src/pages/MandatRenouvellement.tsx` (formulaire raison + messages conditionnels)
- `src/pages/client/MonContrat.tsx` (bandeau + badge + pause)
- `src/pages/admin/ClientDetail.tsx` (section remboursements admin)

---

## ✅ Validation

- Les clients actuels en "critique" (J60+) recevront immédiatement le bon template selon leur période exacte
- Aucun client existant ne sera marqué éligible rétroactivement (le calcul reste live)
- Les annulations passées (avant cette mise à jour) restent inchangées

---

**Note** : Les erreurs de build affichées (`ai-relocation-webhook`, `renovation-*`, `generate-brochure-pdf`) sont préexistantes et non liées à ce plan. Je peux les corriger en parallèle si tu le souhaites — confirme-moi en commentaire si je dois les inclure.