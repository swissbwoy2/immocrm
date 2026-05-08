Deux plans complémentaires pour livrer tous les manques identifiés (hors calendrier partagé inter-agents).

# 📋 PLAN A — Communication, mobile & monitoring (priorité immédiate)

Objectif : finir le triangle messagerie / WhatsApp / mobile pour que rien ne se perde, et donner aux admins une vraie console de supervision.

## Lot A1 — Inbox WhatsApp dédié
- Page **`/agent/whatsapp`** + **`/admin/whatsapp`** : timeline temps réel des messages entrants WhatsApp (filtrés depuis `messages` avec préfixe `📱 [WhatsApp]`), regroupés par client, avec badge non-lu, statut fenêtre 24h ouverte/fermée, lien direct vers la conversation.
- Composant `WhatsAppBadge` réutilisable affiché dans la liste des conversations existantes (`Messagerie.tsx`) pour distinguer source WA vs in-app.
- Realtime via `supabase.channel` sur la table `messages`.

## Lot A2 — Notifications push mobiles (FCM + APNs via Capacitor)
- Plugin `@capacitor/push-notifications` côté mobile + Web Push (VAPID) côté PWA pour navigateurs supportés.
- Nouvelle table `device_tokens` (user_id, platform, token, last_seen_at, app_version).
- Edge Function `push-notify` qui consomme les `notifications` insérées en DB et envoie aux tokens correspondants.
- Préférences utilisateur : choisir les types (nouveau message, candidature, retard CR, paiement reçu).
- Action manuelle utilisateur : créer un projet Firebase + secret `FCM_SERVER_KEY`.

## Lot A3 — Console admin WhatsApp logs
- Page **`/admin/whatsapp-logs`** : table des `whatsapp_notification_logs` avec filtres (statut, template, code erreur Meta, période, agent, client), recherche full-text, code 132001 mis en évidence.
- Bouton **« Renvoyer »** par ligne (ré-invoque l'edge function du même `event_type`).
- Stats en haut : taux de succès 24h / 7j, top 3 erreurs.
- Bouton **« Tester un template »** (déjà couvert par `wa-test-all-templates` — branchement UI uniquement).

## Lot A4 — Templates de messages rapides
- Nouvelle table `message_templates` (agent_id nullable pour templates agence, label, body, variables `{{prenom}}`, `{{adresse}}`).
- Sélecteur dans `MessageAttachmentUploader` / chat input : menu déroulant → insertion + remplacement variables auto.
- Page `/agent/parametres/templates` pour CRUD personnel.

## Lot A5 — Reconnaissance vocale compte-rendu
- Bouton 🎤 dans `CompteRenduVisite.tsx` utilisant l'API native `webkitSpeechRecognition` (langue `fr-CH`) → texte injecté dans le champ `commentaire_libre`.
- Fallback : enregistrement audio + transcription via Lovable AI (`google/gemini-2.5-flash` audio input) si API native indisponible.

---

# 📋 PLAN B — Workflow contractuel, finances & confiance (priorité moyenne)

Objectif : combler les gros manques métier (signature, états des lieux, paiement, conformité) et améliorer le quotidien.

## Lot B1 — Page client de consultation du compte-rendu
- Route publique signée `/cr/:visite_id?token=...` (token JWT 30j stocké dans `visite_comptes_rendus.public_token`).
- Page mobile-first : médias (photos/vidéos), points forts/faibles, intérêt client, prochaines étapes.
- Bouton « Télécharger PDF » via Edge Function `compte-rendu-pdf` (pdf-lib avec sanitization U+202F/U+00A0).
- WhatsApp envoie maintenant ce lien `/cr/:id?token=...` au lieu du lien brut vidéo.

## Lot B2 — Signature électronique du bail
- Réutilise l'architecture **Mandat V3** (zero public write, edge functions à token) pour un nouveau module **Bail V1**.
- Tables : `baux` (bien_id, locataire_id, proprietaire_id, statut, date_debut, loyer, charges, dépôt, pdf_url) + `bail_signatures` (signataire, type, signed_at, ip, user_agent, signature_image_path).
- Pages publiques `/bail/:access_token/sign-locataire` et `/sign-proprietaire`.
- Génération PDF côté serveur ; cron de relance non signataires (24h, 72h).

## Lot B3 — État des lieux digital (entrée + sortie)
- Table `etats_des_lieux` (bail_id, type entrée/sortie, signataire_locataire_at, signataire_proprietaire_at, pdf_url).
- Table `etats_des_lieux_pieces` (eldl_id, nom_piece, ordre) + `etats_des_lieux_observations` (piece_id, élément, état, commentaire, photos[]).
- Page agent mobile-first : pièce par pièce (cuisine/salon/chambres/sdb/extérieur), cases état (neuf/bon/usé/dégradé), zone photos (réutilise upload 1 GB).
- Signature tactile des deux parties → PDF final + envoi WhatsApp + stockage dossier client.

## Lot B4 — Paiement intégré TWINT / Carte
- Connecter **Stripe** (TWINT activé en CH) via le tool `payments--enable_stripe_payments`.
- Flow : page `/client/activation/payer` → Stripe Checkout 300 CHF → webhook `stripe-webhook` → marque `clients.frais_activation_payes_at` + déclenche `invite-client`.
- Conserve AbaNinja en parallèle pour facturation comptable (Stripe pour l'encaissement, AbaNinja pour la facture).

## Lot B5 — Statistiques agent enrichies
- Étendre `/admin/statistiques-agents` :
  - Taux de conversion : candidatures envoyées → visites → reloges (par agent, mensuel).
  - Durée moyenne mandat → reloge.
  - ROI par source de lead (Instagram / Meta Ads / Direct / Google Ads).
  - CA généré et commission projetée mois en cours.
- Vue d'ensemble par graphique Recharts.

## Lot B6 — Recherche globale (Cmd+K / 🔍)
- Composant `GlobalSearch` (cmdk) accessible Cmd+K ou icône loupe topbar.
- Indexation côté client des entités visibles selon RLS : clients, biens, candidatures, transactions, mandats.
- Résultats groupés, navigation clavier, raccourcis directs vers la fiche.

## Lot B7 — Audit log & RGPD
- Table `audit_logs` (table_name, record_id, action, before, after, user_id, ip, ua, created_at) avec triggers sur `mandats`, `transactions`, `baux`, `clients`.
- Page admin `/admin/audit-log` consultable.
- Bouton client `/client/parametres/exporter-mes-donnees` → Edge Function `rgpd-export` qui génère un ZIP (profil JSON + documents + messages CSV).
- Cron mensuel `cleanup-candidatures-rejetees` : supprime les candidatures `refusee` > 6 mois (soft delete avec `deleted_at`).

## Lot B8 — 2FA admin/agent
- Activer Supabase Auth MFA (TOTP) — déjà supporté nativement.
- Page `/parametres/securite` : enrôlement QR code, codes de récupération.
- Forcer MFA pour `role IN ('admin','agent')` après une période de grâce de 14 jours.

## Lot B9 — Import/Export Excel
- Bouton « Exporter Excel » sur `/admin/clients`, `/admin/transactions`, `/admin/biens-en-vente` via lib `xlsx` (côté client, pas de dépendance serveur).
- Bouton « Importer » sur `/admin/clients` : aperçu + validation avant insertion (zod).

## Lot B10 — Mode hors-ligne PWA (visite terrain)
- Workbox : cache-first sur les assets ; stratégie `NetworkFirst` avec fallback IndexedDB pour les routes `/agent/visites`, `/agent/visites/:id/compte-rendu`, `/agent/mes-clients/:id`.
- File d'attente locale (IndexedDB via `idb-keyval`) pour les médias uploadés hors ligne → sync automatique au retour réseau.
- Indicateur visuel « 🔴 Hors ligne — 3 actions en attente ».

---

## Détails techniques transverses

- Toutes les Edge Functions : `import { corsHeaders } from '@supabase/supabase-js/cors'` + JWT validation in-code + Europe/Zurich pour les dates.
- Toutes les nouvelles tables : RLS activée, fonction `has_role` (LANGUAGE plpgsql + SECURITY DEFINER), pas de récursion.
- Toutes les nouvelles vues : RLS via vue invoker, pas de SECURITY DEFINER view.
- Mobile-first strict (91 % du trafic) : composants ≥ 44px tactile, bottom sheets sur mobile, safe-areas iOS.
- PDF : sanitize U+202F / U+00A0 avant pdf-lib.
- Pagination : `.limit(15000)` ou `fetchAllPaginated` partout.
- Service Worker : pas de SKIP_WAITING.

## Hors périmètre des deux plans
- Calendrier partagé inter-agents (exclu sur demande utilisateur).
- Refonte de la landing publique (séparée si décidée plus tard).
- Intégration Instagram Stories/Reels (suggestion analytics, à valider à part).

## Action utilisateur requise après implémentation
- **Plan A** : créer projet Firebase (FCM) + envoyer `FCM_SERVER_KEY` ; rotation clé VAPID Web Push automatique.
- **Plan B** : connecter compte Stripe (tool d'activation guidé) ; valider les 2 templates WhatsApp supplémentaires côté Meta si ajout.

## Ordre d'exécution recommandé
1. Plan A complet (impact opérationnel immédiat).
2. Plan B : B1 → B2 → B3 (chaîne contractuelle) → B4 (revenus) → B5–B10 (qualité).
