-- Ajouter une politique RLS pour permettre les insertions anonymes dans demandes_mandat
-- Cette table est utilisée par le formulaire de nouveau mandat (page publique)

-- Vérifier si la politique existe déjà et la supprimer si nécessaire
DROP POLICY IF EXISTS "Allow anonymous insert demandes_mandat" ON public.demandes_mandat;

-- Créer la politique pour permettre les insertions anonymes
CREATE POLICY "Allow anonymous insert demandes_mandat" 
ON public.demandes_mandat 
FOR INSERT 
TO anon
WITH CHECK (true);

-- Permettre aussi la lecture anonyme pour vérifier si l'email existe déjà
DROP POLICY IF EXISTS "Allow anonymous select demandes_mandat by email" ON public.demandes_mandat;

CREATE POLICY "Allow anonymous select demandes_mandat by email" 
ON public.demandes_mandat 
FOR SELECT 
TO anon
USING (true);