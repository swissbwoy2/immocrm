# Refonte page "Déposer une candidature" (agent)

## Objectif

Simplifier le dépôt de candidature : plus d'email, plus de pièces jointes, plus de templates. Juste un client + une offre + un bouton "Candidature déposée par l'agent". Le reste du workflow (bail reçu, client accepté, etc.) reste identique.

## Nouvelle page (3 étapes)

1. **Sélection du client** — liste des clients actifs de l'agent (single-select, pas multi).
2. **Sélection de l'offre** — uniquement les offres déjà envoyées à ce client (filtre `client_id = clientSélectionné`). Affiche adresse, pièces, prix.
3. **Bouton "Marquer la candidature comme déposée"** — un seul CTA. Au clic :
   - crée (ou met à jour si elle existe déjà) une ligne `candidatures` avec `statut='en_attente'`, `dossier_complet=true`, `date_depot=now()`,
   - passe l'offre à `statut='candidature_deposee'`,
   - crée une notification in-app pour le client : "Votre agent a déposé votre dossier à la régie",
   - toast de confirmation, reset du formulaire.

Petit récap visuel en haut (client → offre) pour rassurer avant le clic.

## À retirer

- Étape "Confirmation" (checkbox).
- Bloc "Modèle d'email" + genre du client + sujet + corps HTML.
- Bloc pièces jointes (documents client + fichiers locaux + dropzone + preview).
- Tous les appels à `send-smtp-email`, `useEmailTemplates`, `EmailTemplatesManager`, `AttachmentPreviewDialog`, signature email, etc.
- Multi-sélection de clients (une candidature = un client).

## Workflow inchangé

Aucune modification côté `candidatures` / `offres` (colonnes, RLS, triggers). Les étapes suivantes du workflow (bail reçu, client accepté, clés remises…) continuent de fonctionner exactement comme aujourd'hui à partir de la page Candidatures.

## Question ouverte

La page n'existe aujourd'hui que côté **agent** (`/agent/deposer-candidature`). Tu as parlé "agent et admin" : veux-tu que j'ajoute aussi une route `/admin/deposer-candidature` (même page, mais l'admin voit tous les clients/offres de l'agence) ? Si oui je l'ajoute dans la sidebar admin section "Candidatures".

## Détails techniques

- Fichier modifié : `src/pages/agent/DeposerCandidature.tsx` (réécriture, ~1097 → ~200 lignes).
- Composants supprimés de l'import : `EmailTemplatesManager`, `AttachmentPreviewDialog`, `ClientMultiSelect` (remplacé par un Select simple), `useEmailTemplates`.
- Requête offres : `.from('offres').select('id, adresse, prix, pieces, type_bien').eq('client_id', selectedClientId).order('date_envoi', { ascending: false })` — rechargée à chaque changement de client.
- Logique candidature : reprise telle quelle du `handleSubmit` actuel (lignes 538-595), juste sans l'envoi d'email avant.
