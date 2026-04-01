
-- Drop old insert policy
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;

-- Create rate-limited insert policy: max 1 comment per minute per session
CREATE POLICY "Rate limited comment insert"
  ON public.comments
  FOR INSERT
  TO public
  WITH CHECK (
    (char_length(message) > 0) AND
    (char_length(message) <= 500) AND
    (char_length(name) <= 50) AND
    NOT EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.created_at > (now() - interval '1 minute')
      AND c.name = name
    )
  );
