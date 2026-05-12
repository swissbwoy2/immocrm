## Objectif
Fiabiliser deux bugs backend liés aux rendez-vous bureau :
- les RDV avec demande de confirmation ne remontent pas correctement dans LeadShort List
- les messages WhatsApp `rdv_bureau_rappel` continuent d’échouer

## Plan

### 1. Stabiliser le lien Lead ↔ RDV bureau dans LeadShort List
- Revoir le flux public de création de lead + rendez-vous pour éviter le rattachement tardif et fragile.
- Identifier tous les écrans admin qui déduisent le RDV depuis `lead_id` ou l’email, puis unifier la logique.
- Faire en sorte que LeadShort List affiche bien les RDV bureau même si le lead a été créé juste avant, si l’email varie en casse, ou si le `lead_id` a été lié après insertion.

### 2. Vérifier et corriger la source exacte des erreurs WhatsApp
- Corriger la config du template `rdv_bureau_rappel` pour qu’elle corresponde exactement au template réellement disponible côté Meta.
- Vérifier le code d’envoi `send-whatsapp-notification` et les appels depuis `confirm-phone-appointment` et `send-phone-appointment-reminders`.
- Séparer les erreurs de configuration template (`132001`) des erreurs de délivrabilité numéro (`131026`) pour éviter de conclure qu’un seul bug reste.

### 3. Fiabiliser confirmation + rappels RDV bureau
- Revoir le flux de confirmation admin pour qu’il réinitialise correctement les marqueurs de rappel WhatsApp/email si un RDV est reconfirmé.
- Harmoniser les variables envoyées au template entre confirmation et rappels.
- Ajouter les garde-fous nécessaires pour ne pas marquer un rappel comme envoyé si Meta le refuse.

### 4. Valider sur données réelles
- Tester sur un RDV bureau récent et sur les logs WhatsApp existants.
- Vérifier que LeadShort List remonte bien le RDV avec demande de confirmation.
- Vérifier qu’un envoi template ne produit plus l’erreur `132001`, puis isoler les éventuels échecs restants dus aux numéros destinataires.

## Détails techniques
- Fichiers principalement concernés :
  - `src/pages/admin/Leads.tsx`
  - `src/components/admin/leads/*`
  - `src/components/landing/DossierAnalyseSection.tsx`
  - `src/components/public-site/sections/DossierAnalyseSection.tsx`
  - `supabase/functions/confirm-phone-appointment/index.ts`
  - `supabase/functions/send-phone-appointment-reminders/index.ts`
  - potentiellement une migration pour corriger `whatsapp_message_templates`
- Une migration backend sera probablement nécessaire pour corriger proprement la ligne template stockée en base si le nom/langage Meta actuel n’est pas le bon.