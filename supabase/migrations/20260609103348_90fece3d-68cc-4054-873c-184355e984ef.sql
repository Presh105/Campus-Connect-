
-- Per-slide ad data
ALTER TABLE public.feed_ads
  ADD COLUMN IF NOT EXISTS slide_titles text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS slide_links text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS click_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impression_count integer NOT NULL DEFAULT 0;

-- Bot post flag
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_bot_post boolean NOT NULL DEFAULT false;

-- Ad click events
CREATE TABLE IF NOT EXISTS public.ad_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.feed_ads(id) ON DELETE CASCADE,
  slide_index integer NOT NULL DEFAULT 0,
  user_id uuid,
  clicked_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ad_clicks TO authenticated;
GRANT ALL ON public.ad_clicks TO service_role;
ALTER TABLE public.ad_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can record clicks" ON public.ad_clicks
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins read ad clicks" ON public.ad_clicks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.increment_ad_click(_ad_id uuid, _slide int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.ad_clicks(ad_id, slide_index, user_id) VALUES (_ad_id, _slide, auth.uid());
  UPDATE public.feed_ads SET click_count = click_count + 1 WHERE id = _ad_id;
END $$;

-- Auto-post bot settings (singleton)
CREATE TABLE IF NOT EXISTS public.bot_settings (
  id int PRIMARY KEY DEFAULT 1,
  enabled boolean NOT NULL DEFAULT false,
  bot_user_id uuid,
  last_run_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bot_settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.bot_settings TO authenticated;
GRANT ALL ON public.bot_settings TO service_role;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read bot settings" ON public.bot_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage bot settings" ON public.bot_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.bot_settings (id, enabled) VALUES (1, false) ON CONFLICT (id) DO NOTHING;

-- Cron + pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
