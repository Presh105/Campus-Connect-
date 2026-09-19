-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('tasks', 'tasks', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-files', 'chat-files', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Storage policies for posts bucket
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'posts' AND auth.role() = 'authenticated');

CREATE POLICY "Post images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'posts');

CREATE POLICY "Users can update their own post images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE
USING (bucket_id = 'posts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for tasks bucket
CREATE POLICY "Authenticated users can upload task images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tasks' AND auth.role() = 'authenticated');

CREATE POLICY "Task images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tasks');

CREATE POLICY "Users can update their own task images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'tasks' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own task images"
ON storage.objects FOR DELETE
USING (bucket_id = 'tasks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for listings bucket
CREATE POLICY "Authenticated users can upload listing images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'listings' AND auth.role() = 'authenticated');

CREATE POLICY "Listing images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'listings');

CREATE POLICY "Users can update their own listing images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own listing images"
ON storage.objects FOR DELETE
USING (bucket_id = 'listings' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for chat-files bucket
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'chat-files' AND auth.role() = 'authenticated');

CREATE POLICY "Chat files are accessible to authenticated users"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-files');

-- Storage policies for avatars bucket
CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add profile visibility column
ALTER TABLE public.profiles ADD COLUMN is_anonymous boolean DEFAULT false;

-- Create private messages table
CREATE TABLE public.private_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  content text NOT NULL,
  file_url text,
  file_type text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on private messages
ALTER TABLE public.private_messages ENABLE ROW LEVEL SECURITY;

-- Private messages policies - users can see their own conversations
CREATE POLICY "Users can view their own private messages"
ON public.private_messages FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send private messages"
ON public.private_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create user_roles table for admin functionality
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Admins can view all private messages for security
CREATE POLICY "Admins can view all private messages"
ON public.private_messages FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Users can only view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Update posts RLS - remove delete policy (posts cannot be deleted)
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Add file fields to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN file_url text;
ALTER TABLE public.chat_messages ADD COLUMN file_type text;

-- Enable realtime for private messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.private_messages;