
CREATE TABLE public.welfare_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  is_claimed boolean DEFAULT false,
  claimed_by uuid DEFAULT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.welfare_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage welfare codes" ON public.welfare_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view codes count" ON public.welfare_codes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can claim codes" ON public.welfare_codes FOR UPDATE TO authenticated
  USING (auth.uid() IS NOT NULL);
