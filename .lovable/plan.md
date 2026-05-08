# Plan — Notifications push & Inbox WhatsApp temps réel

État actuel relevé :
- Tables `device_tokens` et `push_preferences` déjà présentes.
- Edge function `send-push-notification` déjà déployée (FCM HTTP v1, JWT Google OAuth2).
- Pages `/agent/whatsapp`, `/admin/whatsapp` et `/admin/whatsapp-logs` déjà créées avec realtime via `supabase.channel('postgres_changes')`.
- Aucun secret FCM ni VAPID configurés. Aucune logique d'enregistrement de token côté client. Aucun déclencheur.

Le travail restant se concentre donc sur **2 lots**.

---

## Lot 1 — Activation des notifications push (envoi + réception)

### 1.1 Secrets requis (à demander au user via add_secret)
- `FCM_SERVICE_ACCOUNT_JSON` : JSON du compte de service Firebase (Android + Web Push via FCM).
- `APNS_KEY_P8`, `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID` : pour iOS natif (Capacitor APNs direct si on n'utilise pas FCM iOS).
- `VITE_FIREBASE_VAPID_KEY` (publique, dans `.env` ou en clair) : pour Web Push navigateur via FCM.
- `VITE_FIREBASE_CONFIG` (publique) : config Firebase JS SDK pour Web Push.

Décision recommandée : **tout router via FCM** (Android + iOS + Web). Plus simple, un seul backend. APNs direct seulement si rejet App Store.

### 1.2 Côté client web (PWA) — `src/lib/push/webPush.ts`
- Init Firebase JS SDK + `getMessaging` + `getToken` avec VAPID.
- Service worker `public/firebase-messaging-sw.js` pour notifications en background.
- Fonction `registerWebPush()` : demande permission, récupère token FCM, enregistre dans `device_tokens` (`platform='web'`, `user_id`, `token`).

### 1.3 Côté Capacitor (mobile natif) — `src/lib/push/nativePush.ts`
- `@capacitor/push-notifications` : `register()`, listener `registration` → token → `device_tokens` (`platform='ios'|'android'`).
- Listener `pushNotificationReceived` (foreground) → toast.
- Listener `pushNotificationActionPerformed` → navigation vers `link`.

### 1.4 Hook unifié `usePushRegistration()`
- Détecte `Capacitor.isNativePlatform()` → enregistre native, sinon web.
- Appelé après login dans `App.tsx` ou `AuthProvider`.
- Dédupe par `token` (unique constraint à vérifier dans `device_tokens`).

### 1.5 Page préférences `/parametres/notifications`
- Toggle global push + par catégorie : `nouveau_message`, `nouvelle_candidature`, `visite_confirmee`, `compte_rendu_rappel`, `bail_a_signer`, `paiement_recu`, `lead_assigne`.
- Lit/écrit `push_preferences` (1 ligne par user, JSONB ou colonnes booléennes).
- Bouton « Tester » → invoque `send-push-notification` sur soi-même.

### 1.6 Déclencheurs (database triggers + edge function)
Créer triggers SQL `AFTER INSERT` qui appellent `pg_net` → edge function `dispatch-notification` (nouvelle, plus fine que `send-push-notification`) :
| Table | Catégorie | Destinataires |
|-------|-----------|---------------|
| `messages` | nouveau_message | autres participants de la conversation |
| `applications` (candidatures) | nouvelle_candidature | agent du bien + admins |
| `visites` (status='confirmee') | visite_confirmee | client + agent |
| `comptes_rendus` (rappel cron) | compte_rendu_rappel | agent en retard |
| `baux` (status='a_signer') | bail_a_signer | locataire + propriétaire |
| `payments` (status='paid') | paiement_recu | admins + agent |
| `leads` (assigned) | lead_assigne | agent assigné |

Edge function `dispatch-notification` :
- Reçoit `{event, record}`, mappe vers catégorie + liste user_ids.
- Filtre selon `push_preferences`.
- Appelle `send-push-notification` avec `link` profond (`/agent/whatsapp`, `/agent/visites/:id`, etc.).
- Insère aussi dans `notifications_in_app` (cloche) pour fallback.

### 1.7 iOS Capacitor — fichier `capacitor.config.ts`
- Plugin `PushNotifications` déclaré, `ios.entitlements` doc fournie au user (manuel).

---

## Lot 2 — Finalisation Inbox WhatsApp

L'inbox existe déjà mais à compléter :

### 2.1 Améliorations `WhatsAppInbox.tsx`
- Vue **timeline conversationnelle groupée par client** (left = liste conversations, right = thread).
- Distinction visuelle entrant (client → agent) vs sortant.
- Compteur non lu par conversation, badge total dans `WhatsAppBadge` (sidebar).
- Bouton **« Répondre »** ouvre composer rapide (texte libre + `MessageTemplatePicker` déjà créé).
- Filtres : non lus, < 24h (fenêtre WhatsApp Business), par agent (admin).
- Marquer comme lu au focus message.

### 2.2 Routage profond depuis push
- Notif « Nouveau message WhatsApp de X » → `link=/agent/whatsapp?conversation=<id>` → ouvre directement le thread.

### 2.3 Indicateur live
- Pastille « En ligne » via canal `presence` Supabase déjà existant (mémoire projet).
- Toast léger quand nouveau message arrive sur une conversation non ouverte.

---

## Hors périmètre
- Calendrier inter-agents (exclu par demande précédente).
- APNs direct (utilisation de FCM pour iOS via APNs sandbox/prod en backend Firebase).
- Templates WhatsApp Meta nouveaux.

---

## Détails techniques
- Edge functions : `corsHeaders`, validation JWT, dates Europe/Zurich, RLS via `has_role` (plpgsql + SECURITY DEFINER).
- `pg_net` + `pg_cron` activés (déjà fait dans le projet).
- `device_tokens` : index unique `(user_id, token)`, colonne `last_seen_at` mise à jour à chaque login.
- Nettoyage tokens invalides (FCM `UNREGISTERED` → DELETE).
- Pas de `SKIP_WAITING` dans le SW (mémoire projet).
- Mobile-first ≥44px touch targets.

---

## Action requise après approbation
1. Créer un projet Firebase + activer Cloud Messaging + générer compte de service JSON + clé VAPID.
2. Me fournir `FCM_SERVICE_ACCOUNT_JSON` et `VITE_FIREBASE_VAPID_KEY` + `VITE_FIREBASE_CONFIG` (objet JSON public).
3. Pour iOS App Store : activer Push Notifications capability dans Xcode (doc fournie).

Approuvez pour démarrer Lot 1 puis Lot 2.
