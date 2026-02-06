
-- Politique RLS : coursiers peuvent voir les clients liés à leurs missions
CREATE POLICY "Coursiers peuvent voir clients de leurs missions"
  ON public.clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visites v
      WHERE v.client_id = clients.id
      AND (
        v.statut_coursier = 'en_attente'
        OR v.coursier_id IN (
          SELECT c.id FROM coursiers c WHERE c.user_id = auth.uid()
        )
      )
    )
    AND EXISTS (SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid())
  );

-- Politique RLS : coursiers peuvent voir les profils des clients de leurs missions
CREATE POLICY "Coursiers peuvent voir profils clients de leurs missions"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients cl
      JOIN visites v ON v.client_id = cl.id
      WHERE cl.user_id = profiles.id
      AND (
        v.statut_coursier = 'en_attente'
        OR v.coursier_id IN (
          SELECT c.id FROM coursiers c WHERE c.user_id = auth.uid()
        )
      )
    )
    AND EXISTS (SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid())
  );
