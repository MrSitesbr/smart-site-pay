GRANT ALL ON public.waiting_list TO authenticated;
GRANT ALL ON public.waiting_list TO anon;
GRANT ALL ON public.waiting_list TO service_role;

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_bypass_all_waiting_list" ON public.waiting_list;
CREATE POLICY "admin_bypass_all_waiting_list" ON public.waiting_list
  FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);