

## Rappel automatique mensuel "Mettez à jour votre dossier"

### Concept
Entre le **25 et le 5** de chaque mois, tous les clients actifs voient une bannière/alerte sur leur Dashboard et leur page Documents les invitant à vérifier et confirmer la validité de leurs documents :
- 3 dernières fiches de salaire
- Extrait de poursuites (validité min. 2-3 mois)
- Permis de séjour (validité)

Avec des **boutons de confirmation** pour chaque catégorie.

### Composants

#### 1. Nouveau composant `DocumentUpdateReminder.tsx`
- Vérifie si la date du jour est entre le 25 et le 5 (inclus)
- Affiche une alerte orange/ambre avec 3 sections :
  - **Fiches de salaire** → bouton "✅ Fiches de salaire à jour"
  - **Extrait de poursuites** → bouton "✅ Poursuites valides" 
  - **Permis de séjour** → bouton "✅ Permis valide"
- Chaque confirmation est stockée en base (table `document_update_confirmations`) avec le mois concerné
- Une fois les 3 confirmés pour le mois en cours, la bannière passe en vert "Dossier à jour ✅"

#### 2. Nouvelle table `document_update_confirmations`
- `id`, `client_id`, `month_year` (ex: "2026-04"), `fiches_salaire_ok` (bool), `poursuites_ok` (bool), `permis_ok` (bool), `confirmed_at` (timestamp)
- RLS : le client ne peut voir/modifier que ses propres confirmations
- Permet à l'admin de voir qui a confirmé et qui ne l'a pas fait

#### 3. Edge Function `send-document-update-reminders`
- Cron job exécuté le 25 de chaque mois
- Envoie une notification in-app + email à tous les clients actifs
- Message : "Mettez à jour votre dossier : vérifiez vos fiches de salaire, poursuites et permis"
- Lien vers `/client/documents`

#### 4. Intégration Dashboard client
- Le composant `DocumentUpdateReminder` s'affiche en haut du Dashboard entre le 25 et le 5
- Également visible sur la page Documents du client

#### 5. Vue admin — suivi des confirmations
- Dans la page Clients admin, badge ou indicateur montrant quels clients ont confirmé la mise à jour du mois en cours
- Filtre possible "Dossier non confirmé"

### Fichiers

| Fichier | Action |
|---|---|
| `src/components/DocumentUpdateReminder.tsx` | Créer — bannière avec boutons de confirmation |
| `src/pages/client/Dashboard.tsx` | Modifier — intégrer la bannière |
| `src/pages/client/Documents.tsx` | Modifier — intégrer la bannière |
| `supabase/functions/send-document-update-reminders/index.ts` | Créer — cron notification mensuelle |
| `src/pages/admin/Clients.tsx` | Modifier — indicateur de confirmation dossier |
| Migration SQL | Créer table `document_update_confirmations` + RLS |

### Détails techniques
- Détection de la période : `const day = new Date().getDate(); const isUpdatePeriod = day >= 25 || day <= 5;`
- Le `month_year` est calculé comme le mois "cible" : si jour >= 25, c'est le mois suivant ; si jour <= 5, c'est le mois en cours
- Cron job planifié via `pg_cron` le 25 à 8h (Europe/Zurich)
- Les confirmations sont par mois : le client doit reconfirmer chaque mois

