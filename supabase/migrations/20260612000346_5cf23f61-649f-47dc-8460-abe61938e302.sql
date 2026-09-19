
-- Bot post queue: admin queues content, edge function drains one per tick
CREATE TABLE IF NOT EXISTS public.bot_post_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text DEFAULT 'custom',
  posted boolean NOT NULL DEFAULT false,
  posted_at timestamptz,
  post_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_post_queue TO authenticated;
GRANT ALL ON public.bot_post_queue TO service_role;
ALTER TABLE public.bot_post_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage bot queue" ON public.bot_post_queue FOR ALL
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Add interval + queue-only mode to bot_settings
ALTER TABLE public.bot_settings
  ADD COLUMN IF NOT EXISTS interval_minutes int NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS queue_only boolean NOT NULL DEFAULT false;

-- Video tasks: original link, rewatch toggles, counters
ALTER TABLE public.video_tasks
  ADD COLUMN IF NOT EXISTS original_url text,
  ADD COLUMN IF NOT EXISTS allow_rewatch boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completion_count int NOT NULL DEFAULT 0;

-- Allow multiple completions when rewatch enabled. Drop unique if exists.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_completions_user_id_task_id_key') THEN
    ALTER TABLE public.video_completions DROP CONSTRAINT video_completions_user_id_task_id_key;
  END IF;
END $$;

-- Track view starts (not just completion)
CREATE TABLE IF NOT EXISTS public.video_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.video_tasks(id) ON DELETE CASCADE,
  user_id uuid,
  started_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.video_views TO authenticated;
GRANT ALL ON public.video_views TO service_role;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone insert view" ON public.video_views FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admins read views" ON public.video_views FOR SELECT USING (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.register_video_view(_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.video_views(task_id, user_id) VALUES (_task_id, auth.uid());
  UPDATE public.video_tasks SET view_count = view_count + 1 WHERE id = _task_id;
END $$;

-- Replace complete_video_task to honor allow_rewatch and bump completion counter
CREATE OR REPLACE FUNCTION public.complete_video_task(_task_id uuid, _watched integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _task record;
  _uid uuid := auth.uid();
  _already int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT * INTO _task FROM public.video_tasks WHERE id = _task_id AND is_active = true;
  IF _task IS NULL THEN RAISE EXCEPTION 'task not found'; END IF;
  IF _watched < _task.required_seconds THEN RAISE EXCEPTION 'watch time not met'; END IF;
  SELECT count(*) INTO _already FROM public.video_completions WHERE user_id = _uid AND task_id = _task_id;
  IF _already > 0 AND NOT COALESCE(_task.allow_rewatch,false) THEN
    RETURN 'already_completed';
  END IF;
  INSERT INTO public.video_completions(user_id, task_id, watch_seconds, points_awarded)
    VALUES (_uid, _task_id, _watched, _task.points_reward);
  UPDATE public.profiles SET points = COALESCE(points,0) + _task.points_reward WHERE user_id = _uid;
  UPDATE public.video_tasks SET completion_count = completion_count + 1 WHERE id = _task_id;
  RETURN 'awarded';
END $$;
