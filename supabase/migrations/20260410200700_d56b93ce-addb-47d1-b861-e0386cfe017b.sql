
-- Feed ads table
CREATE TABLE public.feed_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.feed_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ads viewable by authenticated" ON public.feed_ads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage ads" ON public.feed_ads FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_feed_ads_updated_at BEFORE UPDATE ON public.feed_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Welfare claims table (server-side anti-cheat)
CREATE TABLE public.welfare_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  claimed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.welfare_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own claims" ON public.welfare_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own claims" ON public.welfare_claims FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all claims" ON public.welfare_claims FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
