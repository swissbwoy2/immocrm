-- Supprimer les foreign keys en double sur la table clients
-- Cela résoudra l'erreur "Could not embed because more than one relationship was found"

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS fk_clients_user_id;
ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS fk_clients_agent_id;