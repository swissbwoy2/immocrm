

## Envoi automatique d'invitations ICS par email lors de la création d'une visite

### Probleme
Quand une visite est créée (depuis Messagerie, OffresRecues, ou ailleurs), aucune invitation calendrier (.ics) n'est envoyée par email aux parties concernées (client, agent, admin).

### Solution
Modifier le trigger existant `notify_on_new_visit` pour qu'il envoie aussi des invitations calendrier via l'edge function `send-calendar-invite`, en plus des notifications in-app qu'il crée déjà.

### Modifications

1. **Migration SQL** : Mettre a jour la fonction `notify_on_new_visit` pour ajouter 3 appels HTTP vers `send-calendar-invite` :
   - Un pour le **client** (email depuis `profiles`)
   - Un pour l'**agent** (email depuis `profiles` via `agents`)
   - Un pour chaque **admin** (emails depuis `user_roles` + `profiles`)
   
   Chaque appel envoie le titre, l'adresse, la date de visite, et l'email du destinataire. Les appels sont dans des blocs `BEGIN...EXCEPTION` pour ne pas bloquer l'insertion en cas d'erreur.

2. **Aucun changement frontend** : tout se passe au niveau du trigger DB, donc toutes les sources de création de visites (Messagerie, OffresRecues, agent, admin) bénéficient automatiquement de l'envoi ICS.

### Detail technique

```sql
-- Dans notify_on_new_visit, après les notifications existantes :
-- Envoi ICS au client
PERFORM net.http_post(
  url := 'https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-calendar-invite',
  headers := jsonb_build_object(...),
  body := jsonb_build_object(
    'title', 'Visite - ' || NEW.adresse,
    'start_date', NEW.date_visite,
    'location', NEW.adresse,
    'recipient_email', v_client_email
  )
);
-- Idem pour agent et admins
```

### Resultat
Chaque nouvelle visite insérée en base déclenche automatiquement l'envoi d'un email avec fichier .ics en pièce jointe au client, à l'agent assigné, et à tous les admins.

