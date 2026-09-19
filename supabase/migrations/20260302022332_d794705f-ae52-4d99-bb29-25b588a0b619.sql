
-- Create post_votes table for yes/no voting
CREATE TABLE public.post_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  vote boolean NOT NULL, -- true = yes/support, false = no/not support
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can vote on posts" ON public.post_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their vote" ON public.post_votes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote" ON public.post_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Votes are viewable by everyone" ON public.post_votes
  FOR SELECT TO authenticated USING (true);
