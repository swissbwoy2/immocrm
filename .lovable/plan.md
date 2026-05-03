## Objectif

Afficher pour chaque lead non plus seulement "Envoyé", mais le vrai cycle de vie de l'email :
- **Envoyé** (parti de notre serveur)
- **Délivré** (accepté par le serveur du destinataire)
- **Ouvert** (le destinataire a ouvert le mail) + date/heure
- **Cliqué** (il a cliqué un lien) + date/heure
- **Bounce / Plainte** (échec ou marqué comme spam)

## Comment ça va marcher

### 1. Tracking d'ouverture (pixel invisible)
Chaque email envoyé via la campagne contiendra un pixel image 1x1 transparent à la fin du HTML, pointant vers une edge function `track-email-open?log_id=...`. Quand le destinataire ouvre le mail, son client mail charge l'image → on enregistre `opened_at` + `opens_count++`.

Limite connue : Gmail/Apple Mail proxy parfois les images (pré-chargement) → l'ouverture peut être enregistrée sans que l'humain ait vraiment vu. C'est le standard Mailchimp/Brevo, on l'accepte.

### 2. Tracking de clics
Tous les liens `<a href="...">` dans l'email seront réécrits vers `track-email-click?log_id=...&url=<encoded>` qui logge puis redirige (302) vers l'URL d'origine.

### 3. Délivrabilité / bounce / plainte
On utilise les webhooks Mailgun (déjà configurés via Lovable Email) qui mettent à jour `email_send_log` avec les statuts `delivered`, `bounced`, `complained` via la table `suppressed_emails` existante. On enrichit `lead_email_logs` à partir de `email_send_log` via le `message_id`.

## Changements DB

Migration sur `lead_email_logs` :
- Ajouter `delivered_at TIMESTAMPTZ`
- Ajouter `opened_at TIMESTAMPTZ` (première ouverture)
- Ajouter `last_opened_at TIMESTAMPTZ`
- Ajouter `opens_count INT DEFAULT 0`
- Ajouter `clicked_at TIMESTAMPTZ` (premier clic)
- Ajouter `last_clicked_at TIMESTAMPTZ`
- Ajouter `clicks_count INT DEFAULT 0`
- Ajouter `bounced_at TIMESTAMPTZ`
- Ajouter `complained_at TIMESTAMPTZ`
- Index sur `lead_id` pour les agrégats rapides

## Edge Functions à créer

1. **`track-email-open`** (GET, public, no JWT) → renvoie un GIF 1x1 + UPDATE log
2. **`track-email-click`** (GET, public, no JWT) → 302 redirect + UPDATE log
3. Modifier `send-campaign-email` (ou équivalent) pour :
   - Réécrire les liens du HTML avant envoi
   - Injecter le pixel à la fin du `<body>`
   - Stocker `message_id` retourné par Mailgun
4. **`email-webhook-handler`** (déjà existant ou à créer) : reçoit les webhooks Mailgun `delivered`, `bounced`, `complained` et met à jour `lead_email_logs` via le `message_id`

## Changements UI (`src/pages/admin/CampagnesSuivi.tsx`)

### Onglet "Leads & envoi"
Remplacer le badge unique "Envoyé" par une suite d'icônes/pills compactes par lead :
```
✉ Envoyé · ✓ Délivré · 👁 Ouvert (3×) · 🔗 Cliqué
```
- Gris = pas encore arrivé à cet état
- Vert = atteint
- Rouge = bounce/plainte
- Tooltip au survol : date+heure exacte (Europe/Zurich)

### Dialog "Historique" (déjà existant)
Pour chaque mail envoyé, afficher la timeline complète :
- 21:34 — Envoyé
- 21:34 — Délivré
- 22:07 — Ouvert (1ère fois)
- 22:08 — Cliqué : "Voir l'annonce"
- 22:15 — Ouvert à nouveau (2ème fois)

### Onglet "Logs"
Ajouter colonnes : Délivré · Ouvertures · Clics · Statut final.

### Onglet "Campagnes" (vue d'ensemble)
Ajouter par campagne :
- Taux de délivrabilité (delivered/sent)
- Taux d'ouverture (opened/delivered)
- Taux de clic (clicked/opened)

## Limites à clarifier avec toi

- **"Lu" vs "Ouvert"** : techniquement il n'existe pas de signal "lu" en email (contrairement à WhatsApp). Le mieux qu'on puisse faire est "ouvert" (pixel chargé). Ok ?
- **Les emails déjà envoyés avant cette migration** n'auront pas de pixel ni de liens trackés → leurs stats d'ouverture/clic resteront vides. Seuls les nouveaux envois auront le tracking complet.

## Ordre d'implémentation

1. Migration DB (nouvelles colonnes)
2. Edge functions `track-email-open` + `track-email-click`
3. Modifier la fonction d'envoi pour injecter pixel + réécrire liens + stocker message_id
4. Brancher webhook Mailgun pour `delivered/bounced/complained`
5. UI : pills de statut dans la liste + timeline dans le dialog + stats par campagne

Confirme-moi que ce plan te va (notamment sur la limite "lu" → "ouvert") et je l'implémente.
