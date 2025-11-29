-- Activer pg_cron pour les tâches planifiées
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Activer pg_net pour les requêtes HTTP
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Donner les permissions nécessaires
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;