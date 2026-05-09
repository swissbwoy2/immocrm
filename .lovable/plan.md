# Plan

## Objectif
Faire repartir les messages de test WhatsApp en corrigeant l’écart entre le template utilisé par l’app et le template réellement disponible côté Meta.

## Constat
- Le bouton **Test interne** appelle bien la fonction `send-followup-whatsapp`.
- Cette fonction envoie la clé interne `location_rdv_activation_v2`.
- En base, cette clé est mappée vers le nom Meta `logisorama_location_rdv_activation_v2`.
- Les logs d’envoi montrent l’erreur Meta `(#132001) Template name does not exist in the translation`.
- Ta capture montre qu’un template **actif** existe côté Meta sous le nom `logisorama_location_rdv_crissier_v1`.

## Ce que je vais faire
1. **Corriger le mapping du template WhatsApp**
   - Remettre le template utilisé en test sur le nom Meta réellement disponible et actif.
   - Vérifier si on garde la clé interne `location_rdv_activation_v2` avec un nom Meta v1, ou si on renomme proprement pour éviter toute confusion.

2. **Aligner l’interface Admin**
   - Mettre à jour l’onglet WhatsApp pour afficher le vrai nom de template actuellement utilisé.
   - Éviter que l’interface annonce `logisorama_location_rdv_activation_v2` si le backend envoie autre chose.

3. **Valider le flux de test**
   - Relancer un test interne sur le numéro mis à jour.
   - Vérifier le résultat dans les logs WhatsApp pour confirmer que le message part sans erreur Meta.

## Détail technique
- Fichier backend concerné : `supabase/functions/send-followup-whatsapp/index.ts`
- Table concernée : `public.whatsapp_message_templates`
- Écran concerné : `src/pages/admin/CampagnesSuivi.tsx`
- Cause probable : **mismatch entre le nom de template Meta enregistré dans l’app et le template réellement approuvé côté Meta**.

## Résultat attendu
- Le bouton **Test interne** envoie bien le message WhatsApp.
- Le template utilisé par l’app correspond exactement au template actif côté Meta.
- L’admin voit un nom cohérent entre l’interface, la base et les logs.