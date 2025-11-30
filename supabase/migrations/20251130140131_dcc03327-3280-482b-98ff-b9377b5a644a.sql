-- Créer les triggers pour les notifications par email

-- 1. Trigger pour l'activation d'un client (quand profile.actif passe à true)
DROP TRIGGER IF EXISTS on_client_activated ON public.profiles;
CREATE TRIGGER on_client_activated
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_client_activated();

-- 2. Trigger pour l'assignation d'un client à un agent
DROP TRIGGER IF EXISTS on_client_assigned ON public.clients;
CREATE TRIGGER on_client_assigned
  AFTER UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_client_assigned();

-- 3. Trigger pour les nouveaux messages
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_message();

-- 4. Trigger pour les nouvelles offres
DROP TRIGGER IF EXISTS on_new_offer ON public.offres;
CREATE TRIGGER on_new_offer
  AFTER INSERT ON public.offres
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_offer();

-- 5. Trigger pour les nouvelles visites
DROP TRIGGER IF EXISTS on_new_visit ON public.visites;
CREATE TRIGGER on_new_visit
  AFTER INSERT ON public.visites
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_visit();