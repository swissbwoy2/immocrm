-- Ajout du champ payment_method sur demandes_mandat
ALTER TABLE public.demandes_mandat
ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'qr_invoice';

-- Contrainte de validation des valeurs autorisées
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'demandes_mandat_payment_method_check'
  ) THEN
    ALTER TABLE public.demandes_mandat
    ADD CONSTRAINT demandes_mandat_payment_method_check
    CHECK (payment_method IN ('twint', 'qr_invoice'));
  END IF;
END$$;