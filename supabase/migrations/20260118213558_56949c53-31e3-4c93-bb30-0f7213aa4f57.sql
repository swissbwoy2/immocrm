-- Add columns for sales financial projection and commission model
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS commission_mode TEXT DEFAULT 'net_vendeur';
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS date_acquisition DATE;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS prix_acquisition NUMERIC;
ALTER TABLE public.immeubles ADD COLUMN IF NOT EXISTS travaux_plus_value NUMERIC DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.immeubles.commission_mode IS 'Mode de commission: net_vendeur (0% vendeur) ou commission_classique (3%)';
COMMENT ON COLUMN public.immeubles.date_acquisition IS 'Date d''acquisition du bien pour calcul fiscal';
COMMENT ON COLUMN public.immeubles.prix_acquisition IS 'Prix d''acquisition initial pour calcul de la plus-value';
COMMENT ON COLUMN public.immeubles.travaux_plus_value IS 'Montant des travaux à plus-value déductibles';