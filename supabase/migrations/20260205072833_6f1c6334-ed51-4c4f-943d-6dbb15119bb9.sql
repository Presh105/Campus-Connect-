-- User blocks table (permanent, no unblock)
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
ON public.user_blocks FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others"
ON public.user_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id AND auth.uid() != blocked_id);

-- User bans table (admin can ban users from specific features)
CREATE TABLE public.user_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  banned_from TEXT NOT NULL, -- 'posts', 'tasks', 'listings', 'events', 'games', 'predictions', 'chat'
  reason TEXT,
  banned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL, -- NULL = permanent
  UNIQUE(user_id, banned_from)
);

ALTER TABLE public.user_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage bans"
ON public.user_bans FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own bans"
ON public.user_bans FOR SELECT
USING (auth.uid() = user_id);

-- School announcements table (pictures and text)
CREATE TABLE public.school_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  image_url TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

ALTER TABLE public.school_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements are viewable by everyone"
ON public.school_announcements FOR SELECT
USING (true);

CREATE POLICY "Admins can manage announcements"
ON public.school_announcements FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for announcements
INSERT INTO storage.buckets (id, name, public) VALUES ('announcements', 'announcements', true);

-- Storage policies for announcements bucket
CREATE POLICY "Announcement images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'announcements');

CREATE POLICY "Admins can upload announcements"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete announcements"
ON storage.objects FOR DELETE
USING (bucket_id = 'announcements' AND auth.uid() IS NOT NULL);

-- Add UPDATE policy for academic_resources to fix upload issue
CREATE POLICY "Anyone can update download count"
ON public.academic_resources FOR UPDATE
USING (true)
WITH CHECK (true);