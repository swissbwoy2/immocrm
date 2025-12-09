-- Politique pour que les utilisateurs puissent voir leurs propres emails envoyés
CREATE POLICY "Users can view their sent emails"
ON sent_emails FOR SELECT
TO authenticated
USING (sender_id = auth.uid());

-- Politique pour permettre l'insertion (par les utilisateurs authentifiés)
CREATE POLICY "Users can insert sent emails"
ON sent_emails FOR INSERT
TO authenticated
WITH CHECK (sender_id = auth.uid());