## Deux corrections

### 1. Libellé du CTA (campagne « vente »)
Le texte du bouton vient de la colonne `cta_label` en base (`email_followup_campaigns`), pas du code de l'edge function. Actuellement :

> 📞 Fixer un entretien téléphonique avec un agent

Migration : mettre à jour cette ligne uniquement (campagne `vente`) avec :

> 🏠 Organiser une visite de votre bien avec un agent

Aucune modif de l'edge function nécessaire — elle lit déjà `campaign.cta_label` dynamiquement. Les autres campagnes (location, etc.) ne sont pas touchées.

### 2. Erreur 404 sur `logisorama.ch/rendez-vous-proprietaire`

La route `/rendez-vous-proprietaire` **existe bien** dans `src/App.tsx` (ligne 277) et la page `RendezVousProprietaire.tsx` est en place. Elle fonctionne sur l'URL de preview.

Le 404 sur `logisorama.ch` vient du fait que **le site publié n'a pas encore été mis à jour** depuis la création de la page. Sur Lovable, les changements frontend ne deviennent live qu'après un clic sur **Publier → Mettre à jour** (les fonctions backend, elles, se déploient automatiquement, c'est pour ça que le mail avec le nouveau CTA fonctionne déjà mais pointe vers une page pas encore publiée).

**Action utilisateur** (pas de code) : ouvrir la modale Publier et cliquer sur « Mettre à jour ». Après ça, l'URL `https://logisorama.ch/rendez-vous-proprietaire` répondra correctement (le SPA fallback Lovable gère le deep-link automatiquement, aucun `_redirects` requis).

### Hors scope
- Pas de modification du code de l'edge function
- Pas de modification du fichier `RendezVousProprietaire.tsx` (calendrier, formulaire, téléphone +41 21 634 28 39 déjà en place)
- Pas de changement sur les autres campagnes
