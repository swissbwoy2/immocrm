## Problème

Le code de l'edge function `send-followup-campaign` contient bien l'injection du `preview_text` en doré entre le `<h1>` et le sous-titre (ligne 130 de `index.ts`), et la donnée existe en base ("Crée ton compte gratuitement et accède à notre réseau de biens.").

Mais sur le test email reçu (capture 18:33), l'accroche dorée n'apparaît pas. Cela signifie que **la dernière version de l'edge function n'a pas été redéployée** sur Lovable Cloud — l'email de test a été généré avec l'ancienne version (sans le `<p>` doré).

## Solution

Forcer le redéploiement de la fonction `send-followup-campaign` pour que le code mis à jour soit actif en production.

### Étapes
1. Redéployer l'edge function `send-followup-campaign` via le tool de déploiement.
2. Vérifier dans les logs que le déploiement a réussi.
3. L'utilisateur clique à nouveau sur "Test" depuis `/admin/campagnes-suivi` pour la campagne "Location – Recherche appartement".
4. L'accroche dorée "Crée ton compte gratuitement et accède à notre réseau de biens." doit apparaître entre le titre "Tu cherches un appartement ?" et le sous-titre.

### Détails techniques
- Aucune modification de code nécessaire — le code est correct.
- Le bloc fautif est ligne 130 de `supabase/functions/send-followup-campaign/index.ts` :
  ```
  ${campaign.preview_text ? `<p style="...color:#d4a857;...">${escapeHtml(campaign.preview_text)}</p>` : ''}
  ```
- Une fois redéployée, la condition s'évaluera correctement pour les 4 campagnes (toutes ont un `preview_text` non null).