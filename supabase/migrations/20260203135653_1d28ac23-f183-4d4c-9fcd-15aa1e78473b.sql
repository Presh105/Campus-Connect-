-- Add new enum types
CREATE TYPE public.gender AS ENUM ('male', 'female');
CREATE TYPE public.user_role_type AS ENUM ('student', 'course_rep', 'sug_official', 'lecturer', 'staff');
CREATE TYPE public.approval_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE public.group_visibility AS ENUM ('public', 'private');
CREATE TYPE public.group_type AS ENUM ('social', 'academic', 'club', 'official');

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS faculty TEXT,
ADD COLUMN IF NOT EXISTS gender gender,
ADD COLUMN IF NOT EXISTS user_role user_role_type DEFAULT 'student',
ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS official_title TEXT;

-- Add approval and engagement columns to posts
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_links BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Add approval columns to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS payment_confirmed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS gender_restriction gender,
ADD COLUMN IF NOT EXISTS worker_submission_url TEXT,
ADD COLUMN IF NOT EXISTS worker_notes TEXT;

-- Add approval columns to listings
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS is_sponsored BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Add approval columns to events (predictions)
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_notes TEXT,
ADD COLUMN IF NOT EXISTS creator_id UUID;

-- Create saved_posts table for bookmarks
CREATE TABLE IF NOT EXISTS public.saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their saved posts"
ON public.saved_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
ON public.saved_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
ON public.saved_posts FOR DELETE
USING (auth.uid() = user_id);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  visibility group_visibility NOT NULL DEFAULT 'public',
  group_type group_type NOT NULL DEFAULT 'social',
  creator_id UUID NOT NULL,
  avatar_url TEXT,
  allow_anonymous_posts BOOLEAN DEFAULT false,
  is_official BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Groups are viewable by everyone"
ON public.groups FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create groups"
ON public.groups FOR INSERT
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups"
ON public.groups FOR UPDATE
USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Group creators and admins can delete groups"
ON public.groups FOR DELETE
USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'));

-- Create group_members table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'approved',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members are viewable by group members"
ON public.group_members FOR SELECT USING (true);

CREATE POLICY "Users can request to join groups"
ON public.group_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Group admins can manage members"
ON public.group_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can leave groups or admins can remove"
ON public.group_members FOR DELETE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
  OR has_role(auth.uid(), 'admin')
);

-- Create group_posts table
CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  file_url TEXT,
  file_type TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group posts viewable by members"
ON public.group_posts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_posts.group_id 
    AND gm.user_id = auth.uid()
    AND gm.status = 'approved'
  )
  OR EXISTS (
    SELECT 1 FROM public.groups g 
    WHERE g.id = group_posts.group_id 
    AND g.visibility = 'public'
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Members can create group posts"
ON public.group_posts FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_posts.group_id 
    AND gm.user_id = auth.uid()
    AND gm.status = 'approved'
  )
);

CREATE POLICY "Users can update their own group posts or admins can"
ON public.group_posts FOR UPDATE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
  OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Post owners and group admins can delete"
ON public.group_posts FOR DELETE
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_posts.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.role = 'admin'
  )
  OR has_role(auth.uid(), 'admin')
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Add game play tracking for once-per-day limit
ALTER TABLE public.game_scores
ADD COLUMN IF NOT EXISTS played_at DATE DEFAULT CURRENT_DATE;

-- Create pinned_rules table
CREATE TABLE IF NOT EXISTS public.pinned_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pinned_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rules are viewable by everyone"
ON public.pinned_rules FOR SELECT USING (true);

CREATE POLICY "Only admins can manage rules"
ON public.pinned_rules FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for notifications and groups
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;

-- Create trigger for updated_at on groups
CREATE TRIGGER update_groups_updated_at
BEFORE UPDATE ON public.groups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on group_posts
CREATE TRIGGER update_group_posts_updated_at
BEFORE UPDATE ON public.group_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();