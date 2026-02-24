
-- Add unique index to prevent duplicate visites
CREATE UNIQUE INDEX IF NOT EXISTS idx_visites_unique_booking 
ON visites (offre_id, client_id, agent_id, date_visite)
WHERE statut = 'planifiee';
