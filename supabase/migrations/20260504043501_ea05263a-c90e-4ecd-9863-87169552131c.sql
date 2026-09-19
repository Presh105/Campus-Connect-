
CREATE TABLE IF NOT EXISTS public.transport_verified_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  can_request_codes BOOLEAN NOT NULL DEFAULT false,
  is_driver BOOLEAN NOT NULL DEFAULT false,
  added_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transport_verified_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verified list viewable by authenticated"
ON public.transport_verified_students FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage verified list"
ON public.transport_verified_students FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_transport_verified_students_updated_at
BEFORE UPDATE ON public.transport_verified_students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.transport_requests
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN NOT NULL DEFAULT false;
