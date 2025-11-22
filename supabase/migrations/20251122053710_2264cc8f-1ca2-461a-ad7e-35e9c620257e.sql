
-- Corriger la récursion infinie dans les RLS policies de clients
-- Supprimer les anciennes policies problématiques
DROP POLICY IF EXISTS "Clients can view their own data" ON clients;
DROP POLICY IF EXISTS "Clients can update their own data" ON clients;

-- Créer de nouvelles policies simples sans récursion
CREATE POLICY "Clients can view their own data" 
ON clients 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Clients can update their own data" 
ON clients 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Clients can insert their own data" 
ON clients 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);
