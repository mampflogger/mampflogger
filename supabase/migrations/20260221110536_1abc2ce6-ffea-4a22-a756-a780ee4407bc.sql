
-- Visitor counter table with a single row
CREATE TABLE public.visitor_count (
  id integer PRIMARY KEY DEFAULT 1,
  count bigint NOT NULL DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

-- Insert initial row
INSERT INTO public.visitor_count (id, count) VALUES (1, 0);

-- Enable RLS
ALTER TABLE public.visitor_count ENABLE ROW LEVEL SECURITY;

-- Anyone can read the count
CREATE POLICY "Anyone can read visitor count"
  ON public.visitor_count FOR SELECT
  USING (true);

-- Function to increment and return count (security definer so it bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_visitor_count()
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.visitor_count SET count = count + 1 WHERE id = 1 RETURNING count;
$$;
