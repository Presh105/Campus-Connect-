-- point_awards: log every awarded points event
CREATE TABLE public.point_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  award_type text NOT NULL,         -- 'post' | 'engage'
  target_post_id uuid,
  points integer NOT NULL DEFAULT 20,
  award_day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, award_type, target_post_id)
);
CREATE INDEX idx_point_awards_user_day ON public.point_awards(user_id, award_type, award_day);

GRANT SELECT ON public.point_awards TO authenticated;
GRANT ALL ON public.point_awards TO service_role;
ALTER TABLE public.point_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own awards" ON public.point_awards FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all awards" ON public.point_awards FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- withdrawal_requests
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',  -- pending|paid|rejected
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert own withdrawal" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users read own withdrawal" ON public.withdrawal_requests FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins read all withdrawals" ON public.withdrawal_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "admins update withdrawals" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- helper: award if under daily cap
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _type text, _post_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
      VALUES (_user_id, _type, _post_id, 20);
    UPDATE public.profiles SET points = COALESCE(points,0) + 20 WHERE user_id = _user_id;
  EXCEPTION WHEN unique_violation THEN
    -- already awarded for this (user,type,post) — ignore
    NULL;
  END;
END $$;

-- trigger: award on new post
CREATE OR REPLACE FUNCTION public.trg_award_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 'post', NEW.id);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS award_on_post ON public.posts;
CREATE TRIGGER award_on_post AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_post();

-- trigger: when a comment is inserted, if user already voted on that post → award engage
CREATE OR REPLACE FUNCTION public.trg_award_on_comment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.post_votes WHERE post_id = NEW.post_id AND user_id = NEW.user_id) THEN
    PERFORM public.award_points(NEW.user_id, 'engage', NEW.post_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS award_on_comment ON public.comments;
CREATE TRIGGER award_on_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_comment();

-- trigger: when a vote is inserted, if user already commented on that post → award engage
CREATE OR REPLACE FUNCTION public.trg_award_on_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.comments WHERE post_id = NEW.post_id AND user_id = NEW.user_id) THEN
    PERFORM public.award_points(NEW.user_id, 'engage', NEW.post_id);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS award_on_vote ON public.post_votes;
CREATE TRIGGER award_on_vote AFTER INSERT ON public.post_votes
  FOR EACH ROW EXECUTE FUNCTION public.trg_award_on_vote();

-- updated_at trigger for withdrawals
CREATE TRIGGER withdrawal_updated_at BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
