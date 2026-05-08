## Activation du template `staff_client_inbound`

Meta a approuvé le template `logisorama_staff_client_inbound`. Il reste une seule action côté base pour déclencher les envois WhatsApp aux agents/admins lorsqu'un client répond.

### Étape unique

Migration SQL one-shot :

```sql
UPDATE whatsapp_message_templates
SET is_active = true,
    status = 'APPROVED',
    updated_at = now()
WHERE template_key = 'staff_client_inbound';
```

### Vérification post-activation

1. Lecture de contrôle sur `whatsapp_message_templates` (is_active = true, status = APPROVED).
2. Test live : envoyer un message WhatsApp depuis le numéro client de test vers le numéro Logisorama → Victoria doit recevoir le WhatsApp formaté avec son lien `/agent/whatsapp`.
3. Inspection de `whatsapp_notification_logs` (event_type `forward_staff_client_inbound`) pour confirmer le `meta_message_id`.

### Hors périmètre

- Aucun changement de code (le webhook passe déjà `templateKey: "staff_client_inbound"` + variables).
- Pas de modification du template Meta lui-même (déjà validé côté Business Manager).

Approuvez pour appliquer la migration d'activation.
