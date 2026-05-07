## Diagnostic

Aujourd'hui, dans `src/pages/agent/EnvoyerOffre.tsx` :

1. À la création d'une offre, le frontend appelle directement `send-whatsapp-notification` avec `template_key: 'new_offer_available'` mais ne passe que **2 variables** (`prenom` + lien). Le template Meta `logisorama_new_offer` attend **9 variables** → Meta refuse silencieusement (log "failed").
2. Ensuite, une `visite` est insérée avec `statut = 'proposee'` → le trigger `trg_wa_proposition_visite` envoie automatiquement `proposition_visite_client`. **C'est ce message-là que tu vois sur ton iPhone**, pas le `new_offer`.
3. Côté webhook `whatsapp-webhook` (boutons WhatsApp) :
   - Le bouton **Confirmer** (`visit_propose_yes`) marche : il met la visite en `planifiee` et appelle `forwardClientReplyToStaff` avec le template `alerte_agent_reponse_visite`. Mais ce template envoie au numéro `WHATSAPP_ADMIN_PHONE` + numéro de l'agent → **si l'agent n'a pas `whatsapp_opt_in = true` et un `whatsapp_phone` valide, il ne reçoit rien**.
   - Les boutons **Déléguer** et **Indisponible** ne sont **pas reconnus** dans `handleLifecycleButton` (les patterns ne matchent ni `déléguer` ni `indisponible`) → aucune action, aucune notif.
   - Aucune notification in-app n'est créée pour le bouton "Confirmer" de visite (la fonction `forwardClientReplyToStaff` notifie in-app uniquement quand `notifTitle` est passé — ici il l'est, donc OK, mais à vérifier sur le compte agent ré-activé `christ.ramazani@immo-rama.ch`).

## Changements

### 1. Envoyer les DEUX templates (new_offer + proposition_visite)

Dans `src/pages/agent/EnvoyerOffre.tsx`, remplacer l'invocation directe `send-whatsapp-notification` par un appel à l'edge function dédiée **`wa-send-new-offer`** (qui charge l'offre et passe les 9 variables correctes). Le template `proposition_visite_client` continue d'être déclenché automatiquement par le trigger DB lors de l'INSERT visite.

### 2. Reconnaître les boutons "Déléguer" et "Indisponible"

Dans `supabase/functions/whatsapp-webhook/index.ts`, étendre `handleLifecycleButton` :

- **Déléguer** (`visit_propose_delegate` / texte "déléguer") :
  - Mettre la visite en `statut = 'a_deleguer'` (si la valeur enum existe — sinon laisser `proposee` et flagger)
  - Répondre au client : "✅ Bien noté, un coursier s'y rend pour vous et vous enverra photos + vidéo + compte-rendu."
  - Appeler `forwardClientReplyToStaff` avec template `alerte_agent_reponse_visite`, `reponse = "🛵 Déléguée"`, `notifTitle = "🛵 Visite à déléguer (coursier)"`, `notifLink = "/agent/visites"`.

- **Indisponible** (`visit_propose_unavailable` / texte "indisponible") :
  - Mettre la visite en `statut = 'annulee'`.
  - Répondre au client : "Bien noté, visite annulée. Votre agent vous proposera d'autres créneaux."
  - `forwardClientReplyToStaff` avec `reponse = "❌ Indisponible"`.

### 3. Garantir la notification agent (in-app + WhatsApp)

Dans `forwardClientReplyToStaff` (`supabase/functions/_shared/whatsapp-forward-to-staff.ts`) :

- Ne pas filtrer sur `whatsapp_opt_in` pour les agents (les agents ne sont pas des clients qui doivent opter-in pour WhatsApp pro). Toujours envoyer si un numéro est présent.
- Si l'agent n'a pas de numéro, logger un warning mais ne pas bloquer la notif in-app.
- Conserver la création de notification in-app via `create_notification` pour `agentUserId` + admins (déjà en place).

### 4. Vérification

Test manuel après déploiement :
1. Envoyer une offre depuis `/agent/envoyer-offre` avec date de visite → vérifier 2 messages WhatsApp côté client (new_offer + proposition_visite) et 0 erreur dans `whatsapp_notification_logs`.
2. Cliquer chaque bouton (Confirmer / Déléguer / Indisponible) → vérifier mise à jour `visites.statut`, message de confirmation au client, notification in-app sur `/agent/notifications` et message WhatsApp à l'agent.

## Fichiers touchés

- `src/pages/agent/EnvoyerOffre.tsx` — switcher vers `wa-send-new-offer`.
- `supabase/functions/whatsapp-webhook/index.ts` — ajouter handlers Déléguer / Indisponible.
- `supabase/functions/_shared/whatsapp-forward-to-staff.ts` — retirer le filtre `whatsapp_opt_in` pour agents.
- Aucune migration SQL nécessaire (les statuts `a_deleguer` / `annulee` existent déjà dans le workflow visite).
