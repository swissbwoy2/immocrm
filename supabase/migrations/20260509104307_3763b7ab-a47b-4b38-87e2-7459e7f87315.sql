UPDATE public.email_followup_campaigns
SET 
  subject = E'On analyse ta recherche d\'appart gratuitement 👋',
  preview_text = 'Passe 30 min avec un expert Logisorama pour vérifier ton dossier, tes critères et tes chances.',
  hero_title = 'Bonjour, viens faire analyser ta recherche gratuitement.',
  hero_subtitle = E'Tu cherches un appartement en Suisse romande ? Passe à nos bureaux de Crissier : un expert Logisorama analyse ton dossier, tes critères et ta situation en 30 minutes.',
  body_intro = '',
  benefits = '[]'::jsonb,
  cta_label = 'Activer ma recherche en ligne',
  cta_url = 'https://logisorama.ch/?utm_source=campagne_suivi&utm_medium=email&utm_campaign=location&utm_content=cta_activation_secondaire#dossier-form',
  trust_text = '',
  signature = E'À très vite,\nL\'équipe Logisorama.ch\nby Immo-Rama.ch',
  updated_at = now()
WHERE campaign_key = 'location';