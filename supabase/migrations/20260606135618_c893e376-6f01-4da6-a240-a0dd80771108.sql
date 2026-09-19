
-- Stop auto-awarding points on post creation; admin will award/decline manually
DROP TRIGGER IF EXISTS award_on_post ON public.posts;

-- Track admin decision per post
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS points_status text NOT NULL DEFAULT 'pending';

-- Update default points per award to 100
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _type text, _post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cnt int;
BEGIN
  SELECT count(*) INTO cnt FROM public.point_awards
    WHERE user_id = _user_id AND award_type = _type
      AND award_day = (now() AT TIME ZONE 'UTC')::date;
  IF cnt >= 5 THEN RETURN; END IF;

  BEGIN
    INSERT INTO public.point_awards(user_id, award_type, target_post_id, points)
      VALUES (_user_id, _type, _post_id, 100);
    UPDATE public.profiles SET points = COALESCE(points,0) + 100 WHERE user_id = _user_id;
  EXCEPTION WHEN unique_violation THEN
    NULL;
  END;
END $$;

-- Admin-only RPC to approve/decline post points
CREATE OR REPLACE FUNCTION public.admin_decide_post_points(_post_id uuid, _approve boolean)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _poster uuid;
  _current text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can award post points';
  END IF;

  SELECT user_id, points_status INTO _poster, _current FROM public.posts WHERE id = _post_id;
  IF _poster IS NULL THEN RAISE EXCEPTION 'Post not found'; END IF;

  IF _approve THEN
    IF _current = 'approved' THEN RETURN 'already_approved'; END IF;
    PERFORM public.award_points(_poster, 'post', _post_id);
    UPDATE public.posts SET points_status = 'approved' WHERE id = _post_id;
    RETURN 'approved';
  ELSE
    UPDATE public.posts SET points_status = 'declined' WHERE id = _post_id;
    RETURN 'declined';
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_decide_post_points(uuid, boolean) TO authenticated;
