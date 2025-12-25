-- Create a trigger function to automatically update client status to 'reloge' when candidature reaches certain statuses
CREATE OR REPLACE FUNCTION public.update_client_to_reloge()
RETURNS TRIGGER AS $$
DECLARE
  v_signature_date TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Only trigger when statut changes to signature_effectuee or cles_remises
  IF NEW.statut IN ('signature_effectuee', 'cles_remises') AND 
     (OLD.statut IS NULL OR OLD.statut NOT IN ('signature_effectuee', 'cles_remises')) THEN
    
    -- Get the signature date to freeze the mandate progression
    v_signature_date := COALESCE(NEW.signature_effectuee_at, NEW.cles_remises_at, now());
    
    -- Update the client status to 'reloge'
    UPDATE clients 
    SET statut = 'reloge',
        updated_at = now()
    WHERE id = NEW.client_id
    AND statut != 'reloge'; -- Avoid updating if already reloge
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_client_to_reloge ON candidatures;
CREATE TRIGGER trigger_update_client_to_reloge
AFTER UPDATE OF statut ON candidatures
FOR EACH ROW
EXECUTE FUNCTION public.update_client_to_reloge();

-- Also trigger on insert for new candidatures with these statuses
CREATE OR REPLACE FUNCTION public.update_client_to_reloge_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.statut IN ('signature_effectuee', 'cles_remises') THEN
    UPDATE clients 
    SET statut = 'reloge',
        updated_at = now()
    WHERE id = NEW.client_id
    AND statut != 'reloge';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trigger_update_client_to_reloge_on_insert ON candidatures;
CREATE TRIGGER trigger_update_client_to_reloge_on_insert
AFTER INSERT ON candidatures
FOR EACH ROW
EXECUTE FUNCTION public.update_client_to_reloge_on_insert();

-- Update existing clients who have candidatures with signature_effectuee or cles_remises
UPDATE clients c
SET statut = 'reloge',
    updated_at = now()
WHERE EXISTS (
  SELECT 1 FROM candidatures cand 
  WHERE cand.client_id = c.id 
  AND cand.statut IN ('signature_effectuee', 'cles_remises', 'etat_lieux_fixe')
)
AND c.statut != 'reloge';