## Mise à jour du footer standard des templates WhatsApp clients

### Texte officiel à ajouter en bas de chaque template Meta

```
---
Message automatique. Pour répondre, écrivez directement à votre agent sur WhatsApp ou dans l'application logisorama.ch
```

### Action

Mettre à jour les 2 fichiers de documentation pour intégrer ce footer dans **tous les templates clients** (welcome_activation, agent_message_alert, application_accepted, signature_scheduled, post_visite_question, offer_alerts, visit_reminders, document_alerts, candidature_updates) :

- `docs/whatsapp_meta_waba_copy_paste.md` — ajout du footer à chaque bloc de template prêt à copier dans Meta Business Manager.
- `docs/whatsapp_templates_logisorama_v3.md` — mise à jour de la spec.

### Hors scope

- Templates internes (admin/agent) — non concernés.
- Aucune modification d'edge function (le footer fait partie du template Meta validé, pas des variables).

### Action manuelle requise après mise à jour

Christ doit copier-coller le nouveau footer dans chaque template existant via Meta Business Manager → resoumission à validation Meta (24-48h par template).
