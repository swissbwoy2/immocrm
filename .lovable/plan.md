## Renvoi du message welcome à Titan

**Cible** : Titan Assyxc (client `849ab000-877f-41c2-9e70-6cee7a180950`, WhatsApp `0795912937`)

**Action** : Appeler l'edge function `wa-send-welcome` avec `{ client_id: "849ab000-877f-41c2-9e70-6cee7a180950" }` via `supabase--curl_edge_functions`.

**Effet attendu** :
- Envoi du template WhatsApp `welcome_activation` (contenant le bouton vers `/client/dashboard` qui redirige maintenant vers `/client` grâce à la route alias ajoutée précédemment).
- Vérification des logs `wa-send-welcome` + `send-whatsapp-notification` pour confirmer l'envoi.

**Aucune modification de code** — uniquement un appel de test.