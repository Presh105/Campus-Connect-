
-- Phase 2: Transport ride codes
CREATE TABLE IF NOT EXISTS public.transport_ride_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  request_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transport_ride_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own codes" ON public.transport_ride_codes
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users create own codes" ON public.transport_ride_codes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users mark own codes used" ON public.transport_ride_codes
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Driver availability toggle
ALTER TABLE public.transport_drivers
  ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- Allow drivers to toggle their own availability via user link
ALTER TABLE public.transport_drivers
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE POLICY "Driver can toggle own availability" ON public.transport_drivers
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Track ride code on requests
ALTER TABLE public.transport_requests
  ADD COLUMN IF NOT EXISTS ride_code text;

-- Phase 3: Monetization rewards vault
CREATE TABLE IF NOT EXISTS public.monetization_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid,
  amount numeric NOT NULL DEFAULT 0,
  network text NOT NULL DEFAULT 'cash', -- mtn | glo | airtel | cash
  status text NOT NULL DEFAULT 'pending', -- pending | paid | rejected
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.monetization_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User views own rewards" ON public.monetization_rewards
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage rewards" ON public.monetization_rewards
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin-overridable monetization eligibility flag on profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS monetization_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payout_phone text,
  ADD COLUMN IF NOT EXISTS payout_network text;
