
-- Créer un trigger automatique pour créer l'entrée client quand un utilisateur avec le rôle "client" est créé
CREATE OR REPLACE FUNCTION public.handle_new_client_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si le nouveau rôle est "client", créer une entrée dans clients
  IF NEW.role = 'client' THEN
    INSERT INTO public.clients (user_id, date_ajout, statut, priorite)
    VALUES (NEW.user_id, now(), 'actif', 'moyenne')
    ON CONFLICT (user_id) DO NOTHING; -- Éviter les doublons si l'entrée existe déjà
  END IF;
  RETURN NEW;
END;
$$;

-- Créer le trigger qui s'exécute après l'insertion dans user_roles
CREATE TRIGGER on_client_role_created
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'client')
  EXECUTE FUNCTION public.handle_new_client_user();
