
-- Coursiers peuvent voir les agents liés à leurs missions
CREATE POLICY "Coursiers peuvent voir agents de leurs missions"
  ON public.agents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM visites v
      WHERE v.agent_id = agents.id
      AND (
        v.statut_coursier = 'en_attente'
        OR v.coursier_id IN (
          SELECT c.id FROM coursiers c WHERE c.user_id = auth.uid()
        )
      )
    )
    AND EXISTS (SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid())
  );

-- Coursiers peuvent voir les profils des agents de leurs missions
CREATE POLICY "Coursiers peuvent voir profils agents de leurs missions"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM agents a
      JOIN visites v ON v.agent_id = a.id
      WHERE a.user_id = profiles.id
      AND (
        v.statut_coursier = 'en_attente'
        OR v.coursier_id IN (
          SELECT c.id FROM coursiers c WHERE c.user_id = auth.uid()
        )
      )
    )
    AND EXISTS (SELECT 1 FROM coursiers c WHERE c.user_id = auth.uid())
  );
