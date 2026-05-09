# Mise à jour ligne de preuve sociale — email Location

Remplacer dans `supabase/functions/send-followup-campaign/index.ts` (renderLocationEmail) :

**Avant** : `⭐ Plus de 500 locataires ont déjà été accompagnés.`
**Après** : `⭐ Plus de 500 locataires ont déjà trouvé leur appartement grâce à notre accompagnement . ⭐`

Puis redéploiement de l'edge function `send-followup-campaign`.

Aucun autre changement.
