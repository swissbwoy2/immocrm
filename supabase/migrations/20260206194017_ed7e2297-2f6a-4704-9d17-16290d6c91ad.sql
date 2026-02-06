
CREATE POLICY "Coursiers peuvent voir offres de leurs missions"
  ON public.offres FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visites v
      JOIN coursiers c ON c.id = v.coursier_id
      WHERE v.offre_id = offres.id
      AND c.user_id = auth.uid()
      AND v.statut_coursier IN ('accepte', 'termine')
    )
    OR
    EXISTS (
      SELECT 1 FROM visites v
      WHERE v.offre_id = offres.id
      AND v.statut_coursier = 'en_attente'
      AND EXISTS (
        SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid()
      )
    )
  );
