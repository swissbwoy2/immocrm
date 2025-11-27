-- Activer REPLICA IDENTITY FULL pour les notifications temps réel
-- Cela permet au filtre user_id de fonctionner correctement dans les souscriptions realtime
ALTER TABLE public.notifications REPLICA IDENTITY FULL;