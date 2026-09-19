
-- Airtime bank
CREATE TABLE IF NOT EXISTS public.airtime_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network text NOT NULL CHECK (network IN ('mtn','glo','airtel')),
  code text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  is_used boolean NOT NULL DEFAULT false,
  used_by uuid,
  used_at timestamptz,
  added_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.airtime_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage airtime" ON public.airtime_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- App updates broadcast
CREATE TABLE IF NOT EXISTS public.app_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_updates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Updates viewable by all auth" ON public.app_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage updates" ON public.app_updates FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.app_update_reads (
  user_id uuid NOT NULL,
  update_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, update_id)
);
ALTER TABLE public.app_update_reads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own update reads" ON public.app_update_reads FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Posts: payout method chosen by poster + reward marker
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS payout_method text;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS was_rewarded boolean NOT NULL DEFAULT false;

-- Listings: discount price
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS discount_price numeric;

-- Drivers: vehicle photo
ALTER TABLE public.transport_drivers ADD COLUMN IF NOT EXISTS vehicle_photo_url text;

-- Transport requests: allow drivers (verified) to update accepting rides
DROP POLICY IF EXISTS "Drivers can accept rides" ON public.transport_requests;
CREATE POLICY "Drivers can accept rides" ON public.transport_requests FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.transport_verified_students v WHERE v.user_id = auth.uid() AND v.is_driver = true)
    OR EXISTS (SELECT 1 FROM public.transport_drivers d WHERE d.user_id = auth.uid() AND d.is_active = true)
  );
