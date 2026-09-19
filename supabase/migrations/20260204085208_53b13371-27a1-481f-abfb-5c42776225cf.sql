-- Enable realtime for posts table to allow live updates of likes, comments, views
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;