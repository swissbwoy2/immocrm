## Modifications campagne "Vente"

1. **CTA URL** : Mettre à jour `cta_url` dans `email_followup_campaigns` (campaign_key='vente') vers `https://logisorama.ch/rendez-vous`.

2. **Suppression image hero** dans `supabase/functions/send-followup-campaign/index.ts` :
   - Retirer le bloc hero-banner spécifique "vente" qui affiche `vente-hero-bg.jpg`
   - Revenir à un hero textuel sombre élégant (fond dégradé `#0e0c0a → #1c1814`) avec badge "Vente off-market", titre, sous-titre et CTA doré "📞 Fixer un entretien téléphonique avec un agent" pointant vers `/rendez-vous`
   - Conserver les fallbacks VML Outlook pour le bouton

3. **Redéploiement** de `send-followup-campaign`.

Aucun autre changement (texte, autres campagnes, schéma).