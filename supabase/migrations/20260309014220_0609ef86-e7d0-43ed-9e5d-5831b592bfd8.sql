DROP POLICY "Anyone can read and write cloud backups" ON public.cloud_backups;

CREATE POLICY "Anyone can read and write cloud backups"
ON public.cloud_backups
FOR ALL
TO public, anon, authenticated
USING (length(id) >= 6)
WITH CHECK (length(id) >= 6);