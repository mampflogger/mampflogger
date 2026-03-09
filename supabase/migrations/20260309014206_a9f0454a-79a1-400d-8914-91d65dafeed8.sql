CREATE TABLE IF NOT EXISTS public.cloud_backups (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.cloud_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read and write cloud backups"
ON public.cloud_backups
FOR ALL
TO public, anon, authenticated
USING (true)
WITH CHECK (true);
