# Audit tunnel location — lecture seule (aucun changement)

Commit analysé : `0e4ea73941691e683ff2873536665fb659104e8d` (13.10.2026 14:21 UTC). Données lues en base le même jour.

Approuver ce document ne déclenche aucune modification : c'est un rapport. Les correctifs éventuels feront l'objet d'une demande séparée.

## 1. Constat chiffré (base, 13.10.2026)

| Élément | Valeur |
|---|---|
| Visites `proposee` | 2 672 (2 659 dont la date est passée) |
| Visites `planifiee` | 2 402 (2 245 dont la date est passée) |
| Visites `effectuee` / `confirmee` | 77 / 60 |
| Offres auto (`envoi_auto`) | 9 908, dont 9 757 avec `agent_id` NULL |
| Offres manuelles | 2 856, dont 2 789 avec `agent_id` NULL |
| Offres auto du 13.10 | 61, dont 19 NULL (avant redéploiement) |
| Candidatures | 258 `en_attente`, 52 `refusee`, 1 `bail_conclu`, 2 `signature_effectuee`, 5 `cles_remises` |

## 2. Pourquoi des milliers de visites restent `proposee` / `planifiee`

- Aucun déclencheur ne crée de visite par offre. Les visites sont créées par : `src/pages/agent/EnvoyerOffre.tsx:372` (source `proposee_agent`, 2 589 lignes), l'import multi-portails (sources immobilier.ch, flatfox.ch, homegate.ch, gmail-alerte, facebook : environ 2 200 `planifiee`), `AddClientsToVisiteDialog.tsx:117-214` (boucle d'une visite par client sélectionné) et `inscription-candidat-visite/index.ts:230` (`confirmee`).
- Cause racine : aucune tâche ne clôt les visites passées. `send-visit-reminders` et `wa-send-post-visite` ne lisent que les visites à venir ou récentes et ne changent pas le statut. `cron-comptes-rendus-retard` ne lit que `effectuee`. Une visite non confirmée par l'agent ou le client garde donc son statut pour toujours.
- Protection contre les doublons partielle : `idx_visites_unique_booking` (migration 20260224184507) ne s'applique que si `statut='planifiee'`. Les statuts `proposee` et `confirmee` ne sont protégés que par des contrôles côté code, incomplets.
- Le déclencheur `trg_wa_proposition_visite` (AFTER INSERT WHEN `proposee`) envoie un WhatsApp par insertion. Chaque création en masse produit donc autant de messages.

## 3. Pourquoi les offres auto ont `agent_id` NULL

- Le code actuel `auto-offers-run/index.ts:272-280, 387-388` lit l'agent principal dans `client_agents` (`is_primary`) et saute le client si aucun agent n'est trouvé. Il ne peut donc plus insérer de NULL.
- Toutes les offres auto du 25.07 au 12.10 sont pourtant NULL, et 19 du 13.10 aussi. La version déployée jusqu'à ce matin insérait donc sans agent. Les 42 offres du 13.10 avec agent viennent du redéploiement d'aujourd'hui.
- Conséquence côté code : un client sans ligne principale dans `client_agents` ne reçoit plus aucune offre auto. Les deux sources d'agent (`clients.agent_id` d'un côté, `client_agents` de l'autre) ne se synchronisent que dans un sens (`sync_client_agent_on_assignment`, `clients` vers `client_agents`).
- Offres manuelles NULL : `inscription-candidat-visite/index.ts:208` recopie `clients.agent_id` sans solution de repli.
- `default_client_agent_to_admin` (déclencheur `trg_default_client_agent_admin` sur `clients`) existe en base mais n'est pas dans les migrations du dépôt : écart entre le dépôt et la base.

## 4. Statuts d'offre

- Aucune contrainte CHECK sur `offres.statut`. Les valeurs (envoyee, interesse, visite_planifiee, visite_confirmee, visite_effectuee, souhaite_postuler, candidature_deposee, acceptee, refusee, plus `doublon` et `tiktok` en base) ne sont imposées que par convention.
- `src/lib/offreStatus.ts` sert d'aide centrale, mais de nombreux écrans modifient `offres.statut` directement.
- `trg_notify_offre_status_change` (migration 20260729181512) notifie le client à chaque changement de statut, mais pas à la création.

## 5. De `postulation_demandee_at` à la candidature

1. Le client clique « postuler » dans `OffresRecues.tsx:863/1041`, `Messagerie.tsx:743/1262` ou `VisitVideoDecisionCard.tsx:88`. L'offre passe à `souhaite_postuler` et `postulation_demandee_at` reçoit la date du moment. `postulationRequest.ts` notifie l'agent et les admins.
2. Aucune candidature n'est créée à ce stade. Elle n'apparaît qu'au passage de l'offre à `candidature_deposee`, par le déclencheur `trg_ensure_candidature_on_offre_deposee` (en base, absent du dépôt). Il crée une ligne `candidatures` au statut `en_attente`, avec `dossier_complet=true`.
3. En parallèle, 7 écrans insèrent eux-mêmes la candidature (`GererOffreDialog.tsx:178`, `DeposerCandidature.tsx`, etc.). Le déclencheur évite les doublons par le couple `offre_id` + `client_id`.
4. Point de rupture : 167 offres sont en `souhaite_postuler` sans candidature tant qu'un agent ne les fait pas avancer. Rien ne relance l'agent.

Parcours séparé `candidatures_location` (portail candidat) : `candidat_confirmer_visite`, `candidat_souhaite_deposer`, `candidat_soumettre_demande`, `staff_valider_preselection` et le garde-fou `guard_candidature_location_pipeline` existent en base.

## 6. Relances régie

Aucune. Pas de tâche planifiée, pas de fonction, pas de table. « Régie » n'apparaît que dans des libellés (`CandidatureWorkflowInteractive.tsx`, `PremiumCandidatureTimeline.tsx`). Les 258 candidatures `en_attente` ne font l'objet d'aucune relance automatique.

## 7. Attribution, signature, transaction

- `useHandleCandidatureProgression.ts:38-121` : le passage à `attente_bail` pose `agent_valide_regie=true` et crée la facture finale.
- `create_transaction_on_cles_remises()` (migration 20260326195759) : `attente_bail` crée la transaction `en_cours` ; `signature_effectuee` ou `cles_remises` la passe à `conclue`.
- WhatsApp : `trg_wa_application_accepted` (sur `agent_valide_regie`), `trg_wa_signature_scheduled`, `trg_wa_edl_scheduled`, `trg_wa_keys_handover`.
- Risque : l'attribution est suivie par `agent_valide_regie`, pas par un statut. Une candidature déplacée sans passer par ce crochet (insertion directe, changement de statut admin) ne déclenche ni transaction ni WhatsApp. En base : 0 `en_attente` validée par la régie ; 7 candidatures signées.
- `send-signature-reminders` (toutes les heures, à la demie) et `send-etat-lieux-reminders` (toutes les heures) existent.

## 8. Communications client et affectation

- Messages système dans la conversation du client (`offreStatus.ts`, `auto-offers-run:455-480`), notifications via `create_notification`, WhatsApp via `trigger_wa_lifecycle_event` (`net.http_post`), e-mails via `candidature-relocation-notify`.
- Affectation : `trigger_sync_client_agent_assignment` (de `clients.agent_id` vers `client_agents`, un seul sens), compteurs `increment_agent_clients` / `decrement_agent_clients` appelés à la main (`Assignations.tsx:212,463,613,700`), pas par déclencheur.
- `notify-unassigned-clients` : un calendrier `0 */12 * * *` figure dans `config.toml`, mais il n'apparaît pas dans `cron.job`. À vérifier qu'il tourne réellement.

## 9. Tâches planifiées actives (`cron.job`, heures UTC)

- `auto-offers` : 7 passages par jour (06:00, 08:30, 11:30, 13:30, 15:30, 17:00, 19:00), plus `auto-offers-daily-digest` à 20:00. Limites : 500 clients par passage, 5 annonces retenues par client, score supérieur à 7, budget plafonné à revenu / 3 ou `budget_max`, mode réel seulement si `app_config.auto_offers_enabled=true` et `auto_offers_dry_run=false`. Sont exclus les dossiers `reloge` / `mandat_annule` et les crédits `aucun` / `expire` / `suspendu`.
- `send-visit-reminders-every-15-minutes` : tourne en réalité toutes les 30 minutes, pas toutes les 15 comme son nom l'indique. Fenêtre 20 à 26 h, 200 visites maximum par passage.
- `wa-post-visite` et `wa-post-visite-tick` : deux tâches toutes les 30 minutes vers la même fonction. La colonne `post_visit_question_sent` empêche le double envoi, mais les appels sont doublés.
- `wa-visit-reminder-daily` à 08:00 ; `cron-comptes-rendus-retard-daily` à 07:00 (visites `effectuee` de 48 h à 30 jours sans compte rendu).
- `wa-google-review-daily` et `wa-google-review-j3` : tous deux à 09:00, risque de doublon de message.
- `wa-mandate-expiring-30d` à 08:00 et `wa-mandate-expiring-daily` à 10:00 : deux tâches pour la même famille de messages.
- Autres : `smart-followups-cron` 09:00, `decrement-mandat-coins-daily` 03:00, `purge-old-data-daily` 02:00, `sync-imap-emails-every-15-minutes` (en réalité toutes les 30 minutes), `portal-visit-inbox-every-minute`, `newsletter-dispatch` chaque minute, `communication-tracking-sync` toutes les 10 minutes, `extract-offre-images-every-5-min`, `phone-appointment-reminders-24h` toutes les 5 minutes.
- `ai-matching` est déclaré dans `config.toml` mais n'a aucun dossier de fonction : entrée obsolète.

## 10. KPI : comment visite, attribution et signature sont comptées

- Visites : comptées sur `visites.statut`. Les 5 074 `proposee` et `planifiee` passées gonflent les chiffres « à venir / planifiées » et faussent tout taux de conversion visite vers candidature.
- Attribution : `admin/Candidatures.tsx:407` compte comme « en cours » `acceptee`, `bail_conclu`, `attente_bail`, etc. `admin/OffresEnvoyees.tsx:672` compte les `acceptee` sur les offres (27 lignes) avec une autre définition. Les deux mesures divergent, et aucune ne lit `agent_valide_regie`.
- Signature : statut `signature_effectuee` / `cles_remises` côté candidatures, statut `conclue` côté `transactions`. Une candidature signée hors du crochet n'apparaît pas dans les transactions.

## 11. Points de rupture prioritaires

1. Aucune clôture automatique des visites passées : statuts gonflés et KPI faux.
2. Index anti-doublon limité à `planifiee`.
3. Environ 12 500 offres sans agent ; client sans agent principal exclu sans alerte des offres auto.
4. `souhaite_postuler` sans candidature ni relance (167).
5. Aucune relance régie (258 `en_attente`).
6. Tâches planifiées en double : post-visite, avis Google, mandat qui expire.
7. Écart entre le dépôt et la base : `ensure_candidature_on_offre_deposee`, `default_client_agent_to_admin` et les fonctions du parcours candidat existent en base mais pas dans les migrations du dépôt.
8. Aucune contrainte CHECK sur `offres.statut`.

## Pistes de correction (non appliquées)

- Une tâche planifiée quotidienne pour basculer les visites passées vers un statut de clôture, à définir.
- Étendre l'index unique aux statuts actifs.
- Une solution de repli pour l'agent (`client_agents`, sinon `clients.agent_id`) avec alerte admin, plutôt qu'un saut silencieux.
- Une relance agent pour les `souhaite_postuler` et une relance régie configurable.
- Dédoublonner les tâches planifiées.
- Une définition unique des KPI d'attribution et de signature.
