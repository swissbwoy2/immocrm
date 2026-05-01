-- 1. Table des campagnes de suivi
CREATE TABLE public.email_followup_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text NOT NULL,
  preview_text text,
  hero_title text NOT NULL,
  hero_subtitle text,
  body_intro text,
  benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
  trust_text text,
  cta_label text NOT NULL,
  cta_url text NOT NULL,
  signature text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_followup_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage followup campaigns"
  ON public.email_followup_campaigns
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_email_followup_campaigns_updated_at
  BEFORE UPDATE ON public.email_followup_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Rattachement des leads à une campagne
ALTER TABLE public.meta_leads ADD COLUMN IF NOT EXISTS campaign_key text NULL;
CREATE INDEX IF NOT EXISTS idx_meta_leads_campaign_key ON public.meta_leads(campaign_key);

-- 3. Logs d'envoi d'emails
CREATE TABLE public.lead_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.meta_leads(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.email_followup_campaigns(id) ON DELETE SET NULL,
  campaign_key text NOT NULL,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  sent_at timestamptz,
  error_message text,
  provider_message_id text,
  unsubscribe_token text UNIQUE,
  test_send boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_email_logs_lead ON public.lead_email_logs(lead_id);
CREATE INDEX idx_lead_email_logs_campaign ON public.lead_email_logs(campaign_id);
CREATE INDEX idx_lead_email_logs_status ON public.lead_email_logs(status);
CREATE INDEX idx_lead_email_logs_created ON public.lead_email_logs(created_at DESC);

-- Idempotence : un même lead ne peut recevoir la même campagne qu'une fois (réussie)
CREATE UNIQUE INDEX idx_lead_email_logs_unique_sent
  ON public.lead_email_logs(lead_id, campaign_id)
  WHERE status = 'sent' AND test_send = false AND lead_id IS NOT NULL;

ALTER TABLE public.lead_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read lead email logs"
  ON public.lead_email_logs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Désinscriptions (structure prête pour V2)
CREATE TABLE public.email_unsubscribes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  campaign_key text,
  unsubscribed_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'link' CHECK (source IN ('link','manual','bounce','complaint'))
);

CREATE UNIQUE INDEX idx_email_unsubscribes_email_global
  ON public.email_unsubscribes(email)
  WHERE campaign_key IS NULL;

CREATE UNIQUE INDEX idx_email_unsubscribes_email_campaign
  ON public.email_unsubscribes(email, campaign_key)
  WHERE campaign_key IS NOT NULL;

ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read unsubscribes"
  ON public.email_unsubscribes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can insert unsubscribe"
  ON public.email_unsubscribes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 5. Seed des 4 campagnes
INSERT INTO public.email_followup_campaigns
  (campaign_key, name, subject, preview_text, hero_title, hero_subtitle, body_intro, benefits, trust_text, cta_label, cta_url, signature, status)
VALUES
(
  'location',
  'Location – Recherche appartement',
  'Tu cherches un appartement en Suisse romande ?',
  'Crée ton compte gratuitement et accède à notre réseau de biens.',
  'Tu cherches un appartement ?',
  'Crée ton compte gratuitement sur Logisorama et reçois les meilleures offres adaptées à tes critères.',
  'Bonjour {{first_name}}, merci de ton intérêt pour notre service de recherche d''appartement en Suisse romande.',
  '["Préciser tes critères en 2 minutes","Recevoir les biens correspondants en avant-première","Être accompagné par un agent dédié","Augmenter tes chances avec un dossier béton"]'::jsonb,
  'Plus de 500 locataires nous font déjà confiance pour trouver leur futur logement.',
  'Continuer ma recherche',
  'https://logisorama.ch/nouveau-mandat?utm_source=email&utm_medium=followup&utm_campaign=location',
  E'L''équipe Logisorama.ch\nby Immo-Rama Sàrl',
  'active'
),
(
  'vente',
  'Vente immobilière – Vendre mon bien',
  'Vous souhaitez vendre votre bien immobilier ?',
  'Estimation gratuite, vente discrète, accompagnement premium.',
  'Vendre votre bien en toute sérénité',
  'Logisorama vous accompagne dans la vente de votre appartement, maison ou immeuble en Suisse romande.',
  'Bonjour {{first_name}}, merci pour votre intérêt concernant la vente de votre bien immobilier.',
  '["Estimation gratuite et confidentielle","Vente off-market possible","Accompagnement notarial complet","Stratégie marketing premium"]'::jsonb,
  'Notre équipe a accompagné plus de 200 propriétaires vendeurs en Suisse romande.',
  'Démarrer mon estimation',
  'https://logisorama.ch/vendre-mon-bien?utm_source=email&utm_medium=followup&utm_campaign=vente',
  E'L''équipe Logisorama.ch\nby Immo-Rama Sàrl',
  'active'
),
(
  'renovation',
  'Rénovation – Construire ou rénover',
  'Votre projet de rénovation mérite un accompagnement premium',
  'Pilotage complet de votre chantier par des experts certifiés.',
  'Donnez vie à votre projet de rénovation',
  'De l''étude à la réception du chantier, Logisorama orchestre votre projet de rénovation ou de construction.',
  'Bonjour {{first_name}}, merci de votre intérêt pour notre service Rénovation Intelligente.',
  '["Devis comparés et négociés pour vous","Suivi de chantier digital en temps réel","Garanties et assurances vérifiées","Économies moyennes de 15% sur le budget"]'::jsonb,
  'Plus de 50 chantiers livrés avec un taux de satisfaction de 98%.',
  'Lancer mon projet',
  'https://logisorama.ch/construire-renover?utm_source=email&utm_medium=followup&utm_campaign=renovation',
  E'L''équipe Logisorama.ch\nby Immo-Rama Sàrl',
  'active'
),
(
  'achat',
  'Achat – Trouver mon bien',
  'À compléter — projet d''achat immobilier',
  'Brouillon en attente de finalisation.',
  'Trouvez le bien qui vous correspond',
  'À compléter.',
  'Bonjour {{first_name}}, contenu à finaliser.',
  '["Bénéfice 1","Bénéfice 2","Bénéfice 3"]'::jsonb,
  'À compléter.',
  'Découvrir nos biens',
  'https://logisorama.ch/?utm_source=email&utm_medium=followup&utm_campaign=achat',
  E'L''équipe Logisorama.ch\nby Immo-Rama Sàrl',
  'draft'
);