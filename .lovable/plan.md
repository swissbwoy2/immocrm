
# Corriger l'expéditeur Resend de `send-followup-campaign`

## Diagnostic

Les 9 emails ont échoué car Resend rejette l'envoi depuis `notify.logisorama.ch` (domaine géré par Lovable Cloud, **non vérifié dans Resend**).

Les fonctions qui fonctionnent (`notify-new-lead`, `send-mandat-pdf`) utilisent **`support@logisorama.ch`** comme fallback — ce domaine est déjà vérifié dans Resend.

## Correctif

Modifier `supabase/functions/send-followup-campaign/index.ts` (lignes 8-21) :

- Remplacer la logique `normalizeFrom()` qui retombe sur `noreply@notify.logisorama.ch` (échec garanti).
- Utiliser le même pattern que `notify-new-lead/index.ts` : fallback sur `support@logisorama.ch`.
- Ignorer explicitement la valeur `notify.logisorama.ch` dans `RESEND_FROM_EMAIL` si elle est définie ainsi.
- Format final : `Logisorama <support@logisorama.ch>`.

```ts
const RAW_FROM = (Deno.env.get('RESEND_FROM_EMAIL') || '').trim();
const SENDER_EMAIL =
  RAW_FROM && RAW_FROM.includes('@') && !RAW_FROM.includes('notify.logisorama.ch')
    ? RAW_FROM
    : 'support@logisorama.ch';
const RESEND_FROM_EMAIL = SENDER_EMAIL.includes('<')
  ? SENDER_EMAIL
  : `Logisorama <${SENDER_EMAIL}>`;
```

## Effet

- Prochains envois utiliseront `Logisorama <support@logisorama.ch>` → autorisé par Resend.
- Aucun risque de doublon : les 9 leads sont en `failed`, pas en `sent`. Vous pourrez relancer la campagne.
- Le BCC `info@immo-rama.ch` ajouté précédemment continue de fonctionner.

## Déploiement

Redéploiement automatique via `deploy_edge_functions(["send-followup-campaign"])`.

## Validation

1. Cliquer **Test** → vérifier réception sur `info@immo-rama.ch` (sans erreur Resend).
2. Relancer la campagne sur les 9 leads → vérifier `lead_email_logs.status = 'sent'`.
