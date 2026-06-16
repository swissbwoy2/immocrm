-- Allow anon + authenticated to log signup attempts (filet de sécurité pour ne plus perdre de clients)
CREATE POLICY "Anyone can log signup attempts"
  ON public.signup_attempts
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON public.signup_attempts TO anon, authenticated;