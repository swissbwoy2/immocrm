CREATE TABLE public.formulaires_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  fichier_pdf_url text,
  nb_pages integer NOT NULL DEFAULT 1,
  actif boolean NOT NULL DEFAULT true,
  annexe_pdf_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulaires_location TO authenticated;
GRANT ALL ON public.formulaires_location TO service_role;
ALTER TABLE public.formulaires_location ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read formulaires" ON public.formulaires_location
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

CREATE POLICY "Staff can manage formulaires" ON public.formulaires_location
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

CREATE TABLE public.formulaire_champs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  formulaire_id uuid NOT NULL REFERENCES public.formulaires_location(id) ON DELETE CASCADE,
  cle_champ text NOT NULL,
  page integer NOT NULL DEFAULT 1,
  pos_x numeric NOT NULL DEFAULT 0,
  pos_y numeric NOT NULL DEFAULT 0,
  largeur numeric NOT NULL DEFAULT 160,
  hauteur numeric NOT NULL DEFAULT 16,
  taille_police numeric NOT NULL DEFAULT 10,
  alignement text NOT NULL DEFAULT 'left',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_formulaire_champs_formulaire ON public.formulaire_champs(formulaire_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.formulaire_champs TO authenticated;
GRANT ALL ON public.formulaire_champs TO service_role;
ALTER TABLE public.formulaire_champs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read champs" ON public.formulaire_champs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

CREATE POLICY "Staff can manage champs" ON public.formulaire_champs
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'agent'));

CREATE TABLE public.agent_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_signatures TO authenticated;
GRANT ALL ON public.agent_signatures TO service_role;
ALTER TABLE public.agent_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own signature" ON public.agent_signatures
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_formulaires_location_updated_at BEFORE UPDATE ON public.formulaires_location
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_formulaire_champs_updated_at BEFORE UPDATE ON public.formulaire_champs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_signatures_updated_at BEFORE UPDATE ON public.agent_signatures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();