# Plan

## Objectif
Rétablir l’envoi complet des notifications lors d’une offre:
- `new_offer` doit partir correctement sur WhatsApp
- `proposition_visite` doit continuer à partir
- les réponses client doivent remonter à l’agent en in-app et sur WhatsApp

## Constats confirmés dans les logs
- `proposition_visite_client` part bien et est même marquée `read`.
- `new_offer_available` échoue encore côté Meta.
- Dernière erreur exacte: `Param text cannot have new-line/tab characters or more than 4 consecutive spaces`.
- Anciennes erreurs visibles aussi: seulement 2 variables envoyées au lieu de 9, ce qui confirme qu’une ancienne voie d’envoi existait encore avant le correctif.
- Le webhook WhatsApp reçoit des messages entrants, mais il loggue `Incoming WA from unknown phone 41764839199`.
- Ce numéro est dupliqué sur plusieurs profils, ce qui rend l’identification du bon expéditeur instable.

## Ce que je vais corriger

### 1. Sécuriser le template `new_offer`
Mettre un nettoyage strict des variables avant l’appel Meta pour supprimer:
- retours à la ligne
- tabulations
- suites de plusieurs espaces
- valeurs trop longues ou mal formées

Cela sera appliqué dans la couche partagée d’envoi WhatsApp pour éviter que d’autres templates cassent pour la même raison.

### 2. Vérifier qu’il n’existe plus aucune ancienne voie `new_offer` à 2 variables
Relire le flux d’envoi pour confirmer qu’au moment d’envoyer une offre, seul `wa-send-new-offer` est utilisé pour le template `new_offer_available`.

### 3. Corriger la résolution du numéro entrant côté webhook
Renforcer la résolution du profil client/agent quand plusieurs profils partagent le même numéro:
- éviter `maybeSingle()` sur une recherche potentiellement multiple
- récupérer plusieurs correspondances puis choisir la bonne priorité métier
- privilégier le client réellement lié à une visite ou à une offre récente quand la réponse vient d’un template client
- journaliser explicitement les cas ambigus

### 4. Fiabiliser la remontée agent
Une fois le bon client résolu par le webhook:
- conserver la notification in-app via `create_notification`
- conserver l’envoi WhatsApp agent/admin via `forwardClientReplyToStaff`
- vérifier que l’absence de `whatsapp_opt_in` agent ne bloque plus rien

## Validation prévue
Après correction, je vérifierai dans les logs:
- `new_offer_available` passe en `sent` au lieu de `failed`
- `proposition_visite_client` continue à être envoyée
- un clic/réponse client génère une notification in-app agent
- un clic/réponse client génère aussi un forwarding WhatsApp agent/admin
- plus de log `unknown phone` pour le numéro concerné dans ce scénario

## Détails techniques
Fichiers les plus probables:
- `supabase/functions/send-whatsapp-notification/index.ts`
- `supabase/functions/_shared/wa-helpers.ts`
- `supabase/functions/whatsapp-webhook/index.ts`
- éventuellement `supabase/functions/_shared/whatsapp-forward-to-staff.ts`

Aucun changement de schéma n’est nécessaire à ce stade: le problème est confirmé dans le payload WhatsApp et dans la résolution métier du numéro entrant.