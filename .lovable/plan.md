

# Envoyer aussi l'invitation RDV téléphonique à l'admin

## Problème

Quand un lead réserve un créneau et que le RDV est **confirmé** (manuellement par l'admin ou auto), le lead reçoit deux emails de `support@logisorama.ch` :
1. Un email HTML de confirmation
2. Une invitation calendrier (.ics) via la fonction `send-calendar-invite`

→ L'admin (`info@immo-rama.ch`) ne reçoit **rien** côté boîte mail. Il a seulement la notif in-app.

## Correctif

Modifier **`supabase/functions/confirm-phone-appointment/index.ts`** pour ajouter `info@immo-rama.ch` comme **BCC** sur les deux envois :

### 1. Envoi de l'invitation .ics
Ajouter `bcc_email: 'info@immo-rama.ch'` dans le payload envoyé à `send-calendar-invite`. Si la fonction ne supporte pas déjà `bcc_email`, l'ajouter (ou faire un second appel `send-calendar-invite` avec `recipient_email: 'info@immo-rama.ch'` pour rester simple et ne pas toucher à la signature de la fonction calendrier partagée).

### 2. Envoi du HTML récap (Resend direct)
Ajouter le champ `bcc: ['info@immo-rama.ch']` dans le body de l'appel `https://api.resend.com/emails`. Sujet enrichi côté admin via le `bcc` natif Resend (l'admin voit le même sujet : "📞 Rendez-vous téléphonique confirmé — …").

### Approche retenue (minimaliste, zéro régression)

- **Ne pas modifier** `send-calendar-invite` (utilisée par d'autres flows : visites, candidatures, etc.).
- Faire **un second appel** `send-calendar-invite` ciblant `info@immo-rama.ch` → l'admin reçoit aussi le .ics, ajoutable directement à son agenda Outlook/Google.
- Ajouter `bcc: ['info@immo-rama.ch']` sur l'appel Resend HTML → l'admin reçoit aussi le récap visuel sans dupliquer la logique HTML.

## Fichier touché

```text
[MOD] supabase/functions/confirm-phone-appointment/index.ts
      - Second appel send-calendar-invite avec recipient_email = 'info@immo-rama.ch'
      - Ajout bcc: ['info@immo-rama.ch'] sur l'appel Resend HTML
      - Préfixer le sujet pour l'admin : pas modifié (BCC reçoit le même sujet, c'est OK)
```

## Validation

1. Confirmer un RDV téléphonique depuis `/admin/leads`
2. Le lead reçoit toujours : 1 email HTML + 1 invitation .ics
3. **`info@immo-rama.ch` reçoit aussi** : 1 email HTML (en BCC) + 1 invitation .ics ajoutable au calendrier
4. L'expéditeur reste `support@logisorama.ch`
5. Aucune régression sur les autres usages de `send-calendar-invite` (visites, états des lieux, signatures bail)

