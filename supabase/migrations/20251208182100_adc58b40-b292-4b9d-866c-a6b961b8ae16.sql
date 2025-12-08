-- Supprimer la politique ALL problématique qui interfère avec les INSERT
DROP POLICY IF EXISTS "Admins can manage all demandes" ON demandes_mandat;

-- Créer politique UPDATE spécifique pour les admins
CREATE POLICY "Admins can update demandes" ON demandes_mandat
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Créer politique SELECT spécifique pour les admins
CREATE POLICY "Admins can view all demandes" ON demandes_mandat
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Recréer la politique INSERT publique avec les rôles explicites
DROP POLICY IF EXISTS "Public can submit mandate requests" ON demandes_mandat;

CREATE POLICY "Public can submit mandate requests" ON demandes_mandat
FOR INSERT
TO anon, authenticated
WITH CHECK (true);