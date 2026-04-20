
## Diagnostic

Tu as invité Mobin et Fazli depuis le bouton "Inviter client" (admin) pour de la recherche locative. Tu n'arrives pas à activer leur compte depuis `/admin/demandes-activation`.

Avant de proposer un correctif, je dois comprendre ce qui se passe exactement. Plusieurs causes possibles très différentes.

## Hypothèses à vérifier

1. **Les comptes n'apparaissent pas du tout dans la liste `/demandes-activation`**
   - L'edge function `invite-client` a peut-être créé un compte avec `invitationLegere=true` qui ne génère pas de "demande d'activation" classique
   - Ou la requête de la page filtre sur un statut qui ne correspond pas

2. **Les comptes apparaissent mais le bouton "Activer" ne fait rien / renvoie une erreur**
   - Problème RLS sur la table de demandes
   - Problème dans l'edge function d'activation
   - Erreur silencieuse côté client

3. **Les comptes apparaissent mais sont déjà marqués comme actifs**
   - L'invitation légère active automatiquement, donc plus de demande à traiter

4. **Erreur visible (toast rouge, erreur console) au clic**
   - Besoin de lire console + network + edge logs

## Ce que je vais inspecter (read-only) avant tout correctif

1. `src/pages/admin/DemandesActivation.tsx` (ou équivalent) — la requête de listing et la logique du bouton "Activer"
2. Edge function `invite-client` — comprendre quel état est créé pour Mobin/Fazli (compte auth + profil + rôle + lien agent + ligne de "demande d'activation" éventuelle)
3. Edge function d'activation appelée par le bouton (probablement `activate-client` ou équivalent)
4. Requête DB :
   - profils Mobin / Fazli (existence, `actif`, `parcours_type`, `email_confirmed`)
   - éventuelle table `client_activation_requests` ou équivalent
5. Logs auth récents (déjà visibles : 4 invitations envoyées récemment, dont une `mohammadparvez080@gmail.com` à 07:16 — donc l'invitation côté auth est bien partie)
6. Logs edge functions `invite-client` et fonction d'activation pour les 2 comptes

## Question avant d'aller plus loin

Pour cibler vite, j'ai besoin de savoir précisément ce que tu vois côté UI :

- A) Mobin et Fazli **n'apparaissent pas** dans la liste `/admin/demandes-activation`
- B) Ils apparaissent, mais le bouton "Activer" **affiche une erreur** (tu peux me donner le message)
- C) Ils apparaissent, je clique "Activer", **rien ne se passe**
- D) Ils apparaissent comme **déjà activés / verrouillés**
- E) Autre — précise

## Plan de correction (générique, sera ajusté après ta réponse)

1. **Si A** → corriger la requête de listing pour inclure les invitations légères locatives en attente d'activation (filtrage par `actif=false` + `parcours_type` recherche, sans exclure le mode "invitation légère")
2. **Si B/C** → corriger l'edge function d'activation : RLS, paramètres manquants, ou bouton qui appelle la mauvaise fonction
3. **Si D** → exposer un état "à compléter" et permettre une relance d'invitation au lieu d'une activation déjà faite
4. **Dans tous les cas** → ajouter un bouton "Renvoyer l'invitation" sur la ligne pour Mobin/Fazli, car les liens d'invitation Supabase expirent (les logs montrent déjà des `403: Email link is invalid or has expired`)
5. Audit ciblé en DB sur les 2 comptes pour confirmer leur état réel et appliquer un correctif si la liaison agent / parcours est cassée

Aucun fichier modifié tant que tu n'as pas confirmé le scénario A/B/C/D/E.
