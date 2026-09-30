# Workflow candidature relocation (candidat ↔ admin/agent)

## Pipeline (candidatures_location.statut, texte libre — aucune valeur existante modifiée)
`en_attente` (visite réservée) → `candidature_deposee` → `documents_demandes` → `refusee` | `retenu_bailleur` → `bail_signe` → `etat_lieux_effectue` → `cles_remises`

Colonnes réutilisées : statut, motif_refus, note_agent, score_dossier, documents, date_visite.

## Migration (additive uniquement)
Nouvelles colonnes nullables sur candidatures_location : `date_depot`, `date_documents_demandes`, `date_decision`, `candidat_confirme_at`, `date_signature`, `date_etat_lieux`, `date_etat_lieux_effectue`, `date_cles_remises` (timestamptz).

Sécurité :
- RPC `candidat_deposer_candidature(id)` (SECURITY DEFINER) : propriétaire uniquement, statut `en_attente`, créneau passé (date_heure < now()) → `candidature_deposee` + date_depot ; notifie admins (in-app).
- RPC `candidat_confirmer_attribution(id)` : propriétaire, statut `retenu_bailleur` → candidat_confirme_at.
- Trigger BEFORE UPDATE : si l'utilisateur n'est ni admin ni agent, interdit toute modification de statut, des dates du pipeline, de motif_refus, note_agent et score_dossier (le candidat garde la possibilité de téléverser ses pièces via `documents`).
- RPC `staff_update_candidature_location(id, action, date, motif)` (admin/agent) : met à jour le statut et l'horodatage, puis insère une notification in-app pour le candidat.
- RLS existante inchangée.

## Côté candidat
- `/candidat/candidatures` : bloc « Déposer une candidature » (Select des logements dont la visite est passée et non déposés + bouton « Envoyer ma candidature »).
- Chaque candidature : timeline (déposée → docs demandés → retenu/refusé → bail signé → état des lieux → clés) avec les dates, plus le bouton « Je confirme vouloir conclure » si retenue.
- Section pièces activée si le statut est `documents_demandes` ou `retenu_bailleur` (gating étendu).

## Côté admin/agent
- Nouvelle page `/admin/candidatures-relocation` (ProtectedRoute admin+agent) avec une entrée dans le menu.
- Liste filtrable par statut (déposée et au-delà) : candidat, contact, annonce, date de visite, statut, dépôt.
- Fiche détaillée : infos du candidat, critères issus de la demande liée (mandat_data), annonce, visite, pièces, et actions par étape (avec motif ou date quand nécessaire).

## Notifications
- In-app : table notifications, via les RPC.
- E-mail : nouveau modèle managé `candidature-relocation-etape` (un seul modèle paramétré par étape, pour éviter 7 modèles quasi identiques), envoyé via sendTemplateEmail côté client après chaque action admin. Pour une nouvelle candidature, l'e-mail est envoyé à l'admin (info@immo-rama.ch).

## Vérifications
tsgo ; les postulations clients (table candidatures) ne sont pas touchées.
