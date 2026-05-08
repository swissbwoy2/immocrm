# Fix `application_accepted` — alignement DB

## Confirmé via screenshot Meta

`logisorama_application_accepted` existe en **French**, statut **Actif - Qualité en attente** (= utilisable).

## Action (1 ligne SQL)

UPDATE de la base via `supabase--insert` :

```sql
UPDATE whatsapp_message_templates
SET template_name_meta = 'logisorama_application_accepted',
    updated_at = now()
WHERE template_key = 'application_accepted';
```

## Vérification

Re-déclencher `wa-send-application-accepted` sur la candidature `aaaaaaaa-1111-1111-1111-111111111111` → attendu : `meta_message_id` retourné, plus d'erreur 132001, et le WA arrive bien chez Titan.

## Hors scope
- Pas de modif Meta (template OK).
- Pas de modif edge function.
- Pas de migration de schéma.
