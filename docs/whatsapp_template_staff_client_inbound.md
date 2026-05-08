# Template WhatsApp à créer dans Meta Business Manager

## `logisorama_staff_client_inbound`

- **Catégorie** : UTILITY
- **Langue** : Français (fr)
- **Nom interne (Meta)** : `logisorama_staff_client_inbound`
- **Clé interne Logisorama** : `staff_client_inbound`

### Body (3 variables)

```
📱 *Nouveau message WhatsApp d'un client*

{{1}} vient de vous écrire :
« {{2}} »

Répondez ici : {{3}}
```

- `{{1}}` = nom complet du client (ex. *Christ Ramazani*)
- `{{2}}` = extrait du message (200 caractères max)
- `{{3}}` = lien vers la messagerie (ex. *logisorama.ch/agent/whatsapp*)

### Étapes

1. Aller sur Meta Business Manager → WhatsApp Manager → Modèles de messages
2. Créer le modèle avec le nom et la catégorie ci-dessus
3. Coller le body, ajouter 3 exemples de variables
4. Soumettre pour validation Meta (24-48 h)
5. Une fois **APPROVED**, dans Lovable Cloud → table `whatsapp_message_templates` :
   ```
   UPDATE whatsapp_message_templates
   SET is_active = true
   WHERE template_key = 'staff_client_inbound';
   ```

Tant que `is_active = false`, le forward staff n'envoie **rien** par WhatsApp
(les notifications in-app continuent de fonctionner).
