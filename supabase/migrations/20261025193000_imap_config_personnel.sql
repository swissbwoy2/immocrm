-- Boîte de réception (relève IMAP existante) : configuration réservée au personnel, une adresse = une configuration.
-- Avant : n'importe quel compte connecté (client compris) pouvait créer une configuration pour n'importe
-- quelle adresse, par exemple info@immo-rama.ch avec un faux mot de passe. La relève automatique aurait alors
-- tenté des connexions refusées en série (risque de blocage du compte chez l'hébergeur), et le compte pouvait
-- insérer de faux e-mails dans sa propre boîte de réception.
-- Rien ne change pour les agents et les admins (écran « Boîte de réception »), ni pour les relèves (clé de service).

DROP POLICY IF EXISTS "Users can insert their own imap config" ON public.imap_configurations;
CREATE POLICY "Users can insert their own imap config" ON public.imap_configurations
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  );

DROP POLICY IF EXISTS "Users can update their own imap config" ON public.imap_configurations;
CREATE POLICY "Users can update their own imap config" ON public.imap_configurations
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  );

-- Une même adresse ne peut être relevée que par une seule configuration active.
CREATE UNIQUE INDEX IF NOT EXISTS imap_configurations_active_user_key
  ON public.imap_configurations (lower(imap_user))
  WHERE is_active;

-- Les e-mails reçus ne sont écrits que par les fonctions de relève (clé de service) : aucun ajout depuis l'application.
DROP POLICY IF EXISTS "Users can insert their own received emails" ON public.received_emails;
