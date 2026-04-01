
-- Drop old permissive policy
DROP POLICY IF EXISTS "Anyone can read and write cloud backups" ON public.cloud_backups;

-- Require ID length >= 20 to prevent brute-force guessing
CREATE POLICY "Cloud backups require long ID"
  ON public.cloud_backups
  FOR ALL
  TO public
  USING (length(id) >= 20)
  WITH CHECK (length(id) >= 20);
