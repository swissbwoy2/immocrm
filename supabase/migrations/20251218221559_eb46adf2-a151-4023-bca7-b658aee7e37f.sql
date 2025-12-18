-- Create bucket for mandate contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('mandat-contracts', 'mandat-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to read their own contracts
CREATE POLICY "Users can view their own contracts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'mandat-contracts'
);

-- Allow service role to insert contracts
CREATE POLICY "Service role can insert contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'mandat-contracts');

-- Allow service role to update contracts
CREATE POLICY "Service role can update contracts"
ON storage.objects FOR UPDATE
USING (bucket_id = 'mandat-contracts');