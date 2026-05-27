## Objectif
Faire en sorte que l’email de test d’annulation/remboursement arrive bien sur `info@immo-rama.ch` (et sur l’email de l’agent assigné), au lieu de partir vers l’email du profil de l’admin connecté.

## Constat
- Le bouton de test actuel crée une notification pour l’utilisateur connecté puis appelle le service d’email standard.
- Ce service envoie à l’email du profil cible, et les logs montrent actuellement un envoi vers `admin@immo-rama.ch`.
- Donc le test ne vérifie pas le vrai circuit staff que vous voulez contrôler.

## Plan
1. **Corriger le bouton de test dans la fiche admin**
   - Remplacer le flux actuel basé sur la notification standard.
   - Faire appeler un envoi de test dédié, non destructif, qui utilise les vraies adresses staff attendues.

2. **Ajouter un mode de test côté backend pour l’email staff**
   - Réutiliser le template d’email staff déjà en place.
   - Envoyer explicitement à `info@immo-rama.ch` et à l’email de l’agent assigné si disponible.
   - Ne modifier aucun statut client et ne créer aucune annulation réelle pendant le test.

3. **Améliorer la traçabilité de l’envoi**
   - Ajouter des logs clairs sur les destinataires calculés et sur le résultat du provider email.
   - Faire remonter une erreur lisible si l’envoi est refusé par le provider ou si un destinataire manque.

4. **Déployer et valider**
   - Redéployer la fonction backend concernée.
   - Vérifier dans les logs que le test part bien vers `info@immo-rama.ch` et, si présent, vers l’agent assigné.

## Détails techniques
- **Fichiers concernés**
  - `src/pages/admin/ClientDetail.tsx`
  - `supabase/functions/mandate-renewal-action/index.ts`
- **Aucun changement de base de données**
- **Aucun impact sur les vraies demandes d’annulation/remboursement**, en dehors d’une meilleure visibilité dans les logs