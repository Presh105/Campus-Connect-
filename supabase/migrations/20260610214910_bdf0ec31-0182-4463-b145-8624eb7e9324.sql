
-- Video tasks (Watch & Earn)
CREATE TABLE IF NOT EXISTS public.video_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  platform text NOT NULL,
  embed_url text NOT NULL,
  required_seconds int NOT NULL DEFAULT 30,
  points_reward int NOT NULL DEFAULT 10,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.video_tasks TO authenticated;
GRANT ALL ON public.video_tasks TO service_role;
ALTER TABLE public.video_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone auth views active tasks" ON public.video_tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage video tasks" ON public.video_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.video_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_id uuid NOT NULL REFERENCES public.video_tasks(id) ON DELETE CASCADE,
  watch_seconds int NOT NULL DEFAULT 0,
  points_awarded int NOT NULL DEFAULT 0,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);
GRANT SELECT, INSERT ON public.video_completions TO authenticated;
GRANT ALL ON public.video_completions TO service_role;
ALTER TABLE public.video_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user views own completions" ON public.video_completions FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user inserts own completion" ON public.video_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Bot post history (prevent repeats / similar)
CREATE TABLE IF NOT EXISTS public.bot_post_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid,
  category text NOT NULL,
  title_hash text NOT NULL UNIQUE,
  title text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.bot_post_history TO authenticated;
GRANT ALL ON public.bot_post_history TO service_role;
ALTER TABLE public.bot_post_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins view bot history" ON public.bot_post_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Complete video task RPC (server-side credit)
CREATE OR REPLACE FUNCTION public.complete_video_task(_task_id uuid, _watched int)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _task record;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO _task FROM public.video_tasks WHERE id = _task_id AND is_active = true;
  IF _task IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF _watched < _task.required_seconds THEN RAISE EXCEPTION 'watch time not met'; END IF;
  IF EXISTS (SELECT 1 FROM public.video_completions WHERE user_id = _uid AND task_id = _task_id) THEN
    RETURN 'already_completed';
  END IF;
  INSERT INTO public.video_completions(user_id, task_id, watch_seconds, points_awarded)
    VALUES (_uid, _task_id, _watched, _task.points_reward);
  UPDATE public.profiles SET points = COALESCE(points,0) + _task.points_reward WHERE user_id = _uid;
  RETURN 'awarded';
END $$;

-- Realtime publication for posts (badge propagation)
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
ALTER TABLE public.posts REPLICA IDENTITY FULL;
