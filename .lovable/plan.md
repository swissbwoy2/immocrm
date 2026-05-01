## Problème

Aujourd'hui, dans `Campagnes de suivi`, on peut voir qu'un lead a déjà reçu un email (badge "Envoyé"), mais on ne peut pas consulter **quels** emails il a reçus, **quand**, et avec **quel contenu**. La table `lead_email_logs` stocke pourtant tout (sujet, date, statut, campagne, message_id provider).

## Plan

### 1. Onglet "Leads & envoi" — bouton historique par lead
- Ajouter une icône cliquable (📧 ou "Voir mails") dans la colonne Statut, visible uniquement pour les leads ayant au moins 1 envoi
- Au clic : ouvrir un Dialog "Historique des emails — {nom du lead}"
- Le Dialog liste tous les `lead_email_logs` du lead, triés du plus récent au plus ancien :
  - Date + heure (format Europe/Zurich)
  - Campagne (badge)
  - Sujet
  - Statut (Envoyé / Échec / Ignoré, badge coloré)
  - Si erreur : message d'erreur
  - Bouton "Voir le contenu" → re-render le template HTML de la campagne via la même fonction `preview-email-campaign` déjà utilisée pour l'aperçu

### 2. Onglet "Logs" — rendre chaque ligne cliquable
- Ajouter une colonne action "Voir le contenu" à droite
- Au clic : ouvrir le même Dialog d'aperçu HTML de la campagne (réutiliser `previewOpen` / `previewHtml`)
- Avantage : l'admin peut depuis n'importe quelle ligne de log voir exactement le mail envoyé

### 3. Compteur d'envois par lead
- Afficher discrètement le nombre d'envois à côté du badge "Envoyé" (ex : "Envoyé · 2") quand un lead a reçu plusieurs mails
- Calculé depuis le map `sentLeadIds` qu'on enrichit avec un compteur

## Détails techniques
- Fichier modifié : `src/pages/admin/CampagnesSuivi.tsx` uniquement
- Source de données : table `lead_email_logs` (déjà chargée pour l'onglet Logs, à enrichir avec `lead_id` si pas déjà sélectionné)
- Aperçu HTML : réutilise l'edge function `preview-email-campaign` déjà appelée par `handlePreview`
- Aucune migration DB nécessaire — toutes les données existent déjà
- Aucun nouveau tracking d'ouverture (pas demandé)

## Résultat attendu
- Tu cliques sur un lead "Envoyé" → tu vois la liste de tous les mails qu'il a reçus
- Tu cliques sur une ligne dans Logs → tu vois exactement le mail envoyé ce jour-là
- Le compteur reste cohérent avec ce qu'on a corrigé précédemment
