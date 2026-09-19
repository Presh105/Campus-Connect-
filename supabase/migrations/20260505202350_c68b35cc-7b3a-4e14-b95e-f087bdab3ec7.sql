
-- Transport: add ride type, fares, location photos, phone, per-user quotas
ALTER TABLE public.transport_ride_codes
  ADD COLUMN IF NOT EXISTS ride_type text NOT NULL DEFAULT 'normal';

ALTER TABLE public.transport_verified_students
  ADD COLUMN IF NOT EXISTS can_request_normal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_request_urgent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quota_normal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quota_urgent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_normal integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS used_urgent integer NOT NULL DEFAULT 0;

-- backfill: any pre-existing can_request_codes -> normal
UPDATE public.transport_verified_students SET can_request_normal = true WHERE can_request_codes = true AND can_request_normal = false;

ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS ride_type text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS location_photo_url text,
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS group_key text;

-- Transport settings (single row keyed by id 'global')
CREATE TABLE IF NOT EXISTS public.transport_settings (
  id text PRIMARY KEY DEFAULT 'global',
  normal_fare numeric NOT NULL DEFAULT 0,
  urgent_fare numeric NOT NULL DEFAULT 0,
  normal_threshold integer NOT NULL DEFAULT 6,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.transport_settings (id) VALUES ('global') ON CONFLICT DO NOTHING;
ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Settings viewable by authenticated" ON public.transport_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.transport_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- Monetization on posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_monetized boolean NOT NULL DEFAULT false;

-- Private post comments (admin <-> poster only)
CREATE TABLE IF NOT EXISTS public.post_private_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.post_private_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin or post owner can view" ON public.post_private_comments FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
  );
CREATE POLICY "Admin or post owner can insert" ON public.post_private_comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = author_id AND (
      has_role(auth.uid(),'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.user_id = auth.uid())
    )
  );
CREATE POLICY "Admin or author can delete" ON public.post_private_comments FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR auth.uid() = author_id);
