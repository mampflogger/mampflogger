
-- Block UPDATE and DELETE on visitor_count
CREATE POLICY "No one can update visitor_count" ON public.visitor_count FOR UPDATE USING (false);
CREATE POLICY "No one can delete visitor_count" ON public.visitor_count FOR DELETE USING (false);

-- Block UPDATE and DELETE on comments
CREATE POLICY "No one can update comments" ON public.comments FOR UPDATE USING (false);
CREATE POLICY "No one can delete comments" ON public.comments FOR DELETE USING (false);
