# Plan — Campagne WhatsApp Location (RDV + activation)

Objectif : ajouter une campagne WhatsApp manuelle pour les leads "location", avec un seul bouton CTA (RDV au bureau de Crissier) et un lien d'activation dans le corps. Aligné sur la mécanique existante des campagnes email (manuel, preview / test / send).

## 1. Base de données

### 1.1 Champs opt-in WhatsApp sur `leads`
La table `leads` n'a aujourd'hui ni `whatsapp_opt_in` ni `whatsapp_opt_out` ni `phone_e164`. Migration :

- `ALTER TABLE leads ADD COLUMN whatsapp_opt_in boolean DEFAULT true` (les leads import CSV / Meta n'ont pas signé d'opt-in formel — par défaut `true` pour permettre l'envoi manuel admin, désactivable via STOP).
- `ALTER TABLE leads ADD COLUMN whatsapp_opt_out boolean DEFAULT false`.
- `ALTER TABLE leads ADD COLUMN phone_e164 text` (normalisé au moment du send, conservé pour réutilisation).

### 1.2 Nouveau template WhatsApp
Insert dans `whatsapp_message_templates` :

```
template_key       = 'location_rdv_activation_v2'
template_name_meta = 'logisorama_location_rdv_activation_v2'
category           = 'MARKETING'
language           = 'fr'
body_preview       = "Bonjour {{1}}, 🏠 Tu cherches un appartement…"
variables_schema   = '[{"key":"first_name_or_fallback","example":"V-Yael"}]'
is_active          = true
```

### 1.3 Logs d'envoi WhatsApp campagne
Réutiliser `whatsapp_notification_logs` (déjà présent) avec :
- `event_type = 'campaign_location'`
- `template_key = 'location_rdv_activation_v2'`
- `context_type = 'lead'`, `context_ref = lead.id`

Ajouter index : `CREATE INDEX IF NOT EXISTS idx_wa_logs_template_context ON whatsapp_notification_logs (template_key, context_ref) WHERE status='sent';` pour la déduplication.

## 2. Edge Function `send-followup-whatsapp`

Nouvelle fonction (cousine de `send-followup-campaign`), `verify_jwt = false` par défaut. Modes :

- `mode: "preview"` → retourne `{ first_name_param, body_rendered, button_url, activation_link }`, **n'appelle pas Meta**.
- `mode: "test"` → envoie au numéro `WHATSAPP_TEST_RECIPIENT_E164` (secret). Si fake lead sans prénom → param = `"à toi"`.
- `mode: "send"` → envoie aux `lead_ids` fournis (max 3 par invocation, conforme au pattern Lead Relance Batching). Continue même si 1 lead échoue.

### Helper `buildWhatsappFirstNameParam`

```ts
function sanitizeWhatsappText(s: string): string {
  return (s || '')
    .replace(/[\r\n\t\v\f]+/g, ' ')
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B]/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
    .slice(0, 60);
}
function buildWhatsappFirstNameParam(firstName: string): string {
  return sanitizeWhatsappText(firstName) || 'à toi';
}
```

### Éligibilité (vérifiée par lead côté Edge Function)

- `phone_e164` valide après `normalizePhoneE164` (helper existant `_shared/whatsapp-send-text.ts`).
- `whatsapp_opt_in = true` ET `whatsapp_opt_out != true`.
- Si `allowResend !== true` : skip si `whatsapp_notification_logs` contient déjà un `sent` avec `template_key='location_rdv_activation_v2'` et `context_ref = lead.id`.

### Appel Meta
Réutilise `send-whatsapp-notification` (déjà sanitize, déjà gère payload + logs) en POST interne avec :

```json
{
  "event_type": "campaign_location",
  "template_key": "location_rdv_activation_v2",
  "recipient_phone_override": "<phone_e164>",
  "variables": ["<first_name_or_fallback>"],
  "context_type": "lead",
  "context_ref": "<lead.id>"
}
```

Le bouton URL et le lien d'activation sont **dans le template Meta lui-même** (non dynamiques, donc pas de `url_button_params` à passer) :

- Bouton URL fixe :
  `https://logisorama.ch/?utm_source=whatsapp&utm_medium=business_message&utm_campaign=location&utm_content=cta_rdv#analyse-dossier`
- Lien dans le body (texte brut du template Meta) :
  `https://logisorama.ch/nouveau-mandat`

### Mode test
`recipient_phone_override = WHATSAPP_TEST_RECIPIENT_E164`, `variables = ["à toi"]`. Pas d'écriture dans `lead_email_logs` ni de check de dédup.

### Logs
`send-whatsapp-notification` insère déjà dans `whatsapp_notification_logs`. Pas de table additionnelle nécessaire.

## 3. UI Admin

Étendre `src/pages/admin/CampagnesSuivi.tsx` (déjà la page de campagnes email manuelles) :

- Nouvel onglet/section **"WhatsApp – Location"** à côté des campagnes email.
- Sélection des leads : même filtre que la campagne `location` existante + filtres additionnels :
  - `telephone` non vide,
  - `whatsapp_opt_in = true` ET `whatsapp_opt_out != true`,
  - exclusion automatique des leads ayant déjà un `sent` pour `template_key='location_rdv_activation_v2'` (sauf toggle "Renvoyer").
- 3 boutons : **Aperçu** / **Test interne** / **Envoyer aux X leads sélectionnés**.
- Aperçu : affiche le body rendu, la valeur de `{{1}}`, l'URL du bouton, le lien activation.
- Envoi : appel `supabase.functions.invoke('send-followup-whatsapp', { mode, lead_ids, allowResend })` par batches de 3.
- Affiche un compteur `envoyés / échoués` après chaque batch.

**Hors périmètre** : pas de modification des 3 autres campagnes (achat, vente, rénovation), pas de modification de `send-followup-campaign`, pas d'envoi WhatsApp automatique post-import CSV.

## 4. Configuration Meta (action utilisateur, hors code)

Le template doit être créé manuellement dans Meta WhatsApp Business Manager avec exactement :

- Nom : `logisorama_location_rdv_activation_v2`
- Catégorie : `MARKETING`, Langue : `French`
- Header texte : `Analyse gratuite logement`
- Body : exactement le texte fourni (avec `{{1}}` en début après "Bonjour ", lien `https://logisorama.ch/nouveau-mandat` en clair)
- Footer : `Logisorama.ch by Immo-Rama.ch · Réponds STOP pour te désinscrire.`
- Bouton URL statique : `Réserver mon RDV` → `https://logisorama.ch/?utm_source=whatsapp&utm_medium=business_message&utm_campaign=location&utm_content=cta_rdv#analyse-dossier`

L'envoi réel échouera tant que Meta n'a pas approuvé ce template — c'est attendu. La fonction loggera l'erreur Meta sans bloquer.

## 5. Secrets requis

- `WHATSAPP_PHONE_NUMBER_ID` ✅ déjà présent (utilisé par `send-whatsapp-notification`).
- `WHATSAPP_ACCESS_TOKEN` ✅ déjà présent.
- `WHATSAPP_TEST_RECIPIENT_E164` à ajouter (numéro perso de Christ, format `+41…`) — demandé via `add_secret` au build.

## 6. Vérifications post-implémentation

1. Migration appliquée, colonnes `whatsapp_opt_in/out`, `phone_e164` présentes sur `leads`.
2. Row insérée dans `whatsapp_message_templates` pour `location_rdv_activation_v2`.
3. Mode preview retourne `{{1}}="V-Yael"` pour un lead avec prénom, `"à toi"` pour un lead sans prénom.
4. Mode test envoie au numéro de test, message reçu avec "Bonjour à toi,".
5. Mode send respecte le batch de 3 et la dédup via `whatsapp_notification_logs`.
6. Aucun lead sans `whatsapp_opt_in` n'est ciblé.
7. Les 3 autres campagnes email (`achat`, `vente`, `renovation`) restent strictement inchangées.

## Résumé URLs (rappel)

- **Bouton WhatsApp (RDV)** : `https://logisorama.ch/?utm_source=whatsapp&utm_medium=business_message&utm_campaign=location&utm_content=cta_rdv#analyse-dossier`
- **Lien activation (corps)** : `https://logisorama.ch/nouveau-mandat`
