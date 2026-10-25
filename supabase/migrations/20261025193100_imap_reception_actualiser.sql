-- Correctif de 20261025193000 : le bouton « Actualiser » des boîtes de réception (fonction fetch-imap-emails)
-- enregistre les e-mails avec le jeton de l'utilisateur. Sans politique INSERT, les nouveaux e-mails n'étaient
-- plus enregistrés. L'ajout reste interdit aux clients : seuls les agents et admins, dans leur propre boîte.
DROP POLICY IF EXISTS "Staff can insert their own received emails" ON public.received_emails;
CREATE POLICY "Staff can insert their own received emails" ON public.received_emails
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'agent'::app_role))
  );

-- Mise à jour d'une configuration existante : comme avant, par son propriétaire (une configuration ne peut
-- être créée que par un agent ou un admin, et une adresse active n'a qu'une configuration).
DROP POLICY IF EXISTS "Users can update their own imap config" ON public.imap_configurations;
CREATE POLICY "Users can update their own imap config" ON public.imap_configurations
  FOR UPDATE
  USING (auth.uid() = user_id);
