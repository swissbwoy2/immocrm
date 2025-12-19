-- Fix RLS policies on storage.objects that crash on non-UUID folder names like `mandat/`

-- 1) Drop the crashing policies (they cast folder name to uuid unconditionally)
DROP POLICY IF EXISTS "Agents can view their clients documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

-- 2) Recreate them with safe UUID parsing (never throws)
-- UUID regex (case-insensitive): 8-4-4-4-12 hex

CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
      ELSE NULL
    END
  ) = auth.uid()
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
      ELSE NULL
    END
  ) = auth.uid()
);

CREATE POLICY "Agents can view their clients documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents'
  AND (
    CASE
      WHEN (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        THEN ((storage.foldername(name))[1])::uuid
      ELSE NULL
    END
  ) IN (
    SELECT c.user_id
    FROM clients c
    JOIN agents a ON a.id = c.agent_id
    WHERE a.user_id = auth.uid()
  )
);
