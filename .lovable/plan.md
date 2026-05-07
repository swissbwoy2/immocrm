# Plan

## Ce que j’ai confirmé
- Le backend est sain, donc ce n’est pas un problème d’infrastructure.
- Le profil agent de Christ Ramazani est bien trouvé avec le numéro `0762441006` / `+41762441006`.
- Les réponses automatiques côté client fonctionnent bien.
- Les notifications WhatsApp vers l’agent échouent réellement dans les logs avec l’erreur Meta : le template `alerte_agent_reponse_visite` attend **8 variables**, mais le webhook n’en envoie que **5**.
- Aucune notification in-app de type réponse WhatsApp n’est créée pour l’agent : le code appelle la RPC `create_notification` avec `p_data`, alors que la fonction attend `p_metadata`.
- Comme la notification n’est pas créée, l’email lié à cette notification ne part pas non plus.

## Ce que je vais corriger
1. **Corriger le payload WhatsApp agent**
   - Aligner `forwardClientReplyToStaff` / `whatsapp-webhook` avec le template `alerte_agent_reponse_visite`.
   - Envoyer les 8 variables attendues : client, pièces, surface, adresse, prix, créneau, réponse, lien annonce.
   - Garder le lien CRM déjà prévu par le template.

2. **Réparer la notification in-app agent/admin**
   - Remplacer `p_data` par `p_metadata` dans le flux de création de notification.
   - Vérifier que les notifications sont bien insérées pour l’agent Christ et les admins.

3. **Rétablir l’email associé**
   - Une fois la notification correctement créée, vérifier que le déclenchement email repart automatiquement.
   - Contrôler dans les logs que les nouvelles notifications de réponse client sont bien prises en charge.

4. **Valider de bout en bout**
   - Tester un cas “Je confirme”, “Déléguer” et “Indisponible”.
   - Vérifier pour chaque cas :
     - réponse automatique au client,
     - message WhatsApp reçu par l’agent,
     - notification in-app visible,
     - création de notification backend,
     - départ email si activé.

## Détails techniques
- Fichiers visés :
  - `supabase/functions/whatsapp-webhook/index.ts`
  - `supabase/functions/_shared/whatsapp-forward-to-staff.ts`
- Cause 1 : mismatch template WhatsApp `alerte_agent_reponse_visite` (`8 vars attendues`, `5 envoyées`).
- Cause 2 : mauvais nom de paramètre RPC (`p_data` au lieu de `p_metadata`) vers `create_notification(p_metadata jsonb)`.
- Aucune migration base de données n’est nécessaire pour cette correction.

## Résultat attendu
Après correction, quand le client répond sur WhatsApp, Christ doit recevoir la remontée sur les trois canaux attendus : WhatsApp, notification in-app, et email.