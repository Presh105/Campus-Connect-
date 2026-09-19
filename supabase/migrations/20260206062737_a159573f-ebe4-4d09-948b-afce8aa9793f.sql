-- SECURITY FIX: Add input validation constraints using triggers (not CHECK constraints for better compatibility)

-- Create validation function for posts
CREATE OR REPLACE FUNCTION public.validate_post_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.title) < 1 OR char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Post title must be between 1 and 200 characters';
  END IF;
  IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 10000 THEN
    RAISE EXCEPTION 'Post content must be between 1 and 10000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_posts_input
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_post_input();

-- Create validation function for tasks
CREATE OR REPLACE FUNCTION public.validate_task_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.title) < 1 OR char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Task title must be between 1 and 200 characters';
  END IF;
  IF char_length(NEW.description) < 1 OR char_length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Task description must be between 1 and 5000 characters';
  END IF;
  IF char_length(NEW.reward) < 1 OR char_length(NEW.reward) > 200 THEN
    RAISE EXCEPTION 'Task reward must be between 1 and 200 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_tasks_input
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_task_input();

-- Create validation function for listings
CREATE OR REPLACE FUNCTION public.validate_listing_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.title) < 1 OR char_length(NEW.title) > 200 THEN
    RAISE EXCEPTION 'Listing title must be between 1 and 200 characters';
  END IF;
  IF char_length(NEW.description) < 1 OR char_length(NEW.description) > 5000 THEN
    RAISE EXCEPTION 'Listing description must be between 1 and 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_listings_input
  BEFORE INSERT OR UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_listing_input();

-- Create validation function for chat messages
CREATE OR REPLACE FUNCTION public.validate_chat_message_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_chat_messages_input
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_chat_message_input();

-- Create validation function for private messages
CREATE OR REPLACE FUNCTION public.validate_private_message_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message must be between 1 and 5000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_private_messages_input
  BEFORE INSERT OR UPDATE ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_private_message_input();

-- Create validation function for comments
CREATE OR REPLACE FUNCTION public.validate_comment_input()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF char_length(NEW.content) < 1 OR char_length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Comment must be between 1 and 2000 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_comments_input
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_comment_input();

-- SECURITY FIX: Restrict profiles table to authenticated users only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- SECURITY FIX: Remove admin access to private messages (privacy violation)
DROP POLICY IF EXISTS "Admins can view all private messages" ON public.private_messages;

-- Keep the existing user-specific policy:
-- "Users can view their own private messages" already exists with (auth.uid() = sender_id) OR (auth.uid() = receiver_id)

-- SECURITY FIX: Make chat-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'chat-files';

-- Drop existing policy if any and create proper restrictive SELECT policy
DROP POLICY IF EXISTS "Chat files are accessible to authenticated users" ON storage.objects;
DROP POLICY IF EXISTS "Chat files accessible to message participants" ON storage.objects;

-- Create proper SELECT policy for chat-files bucket
CREATE POLICY "Chat files accessible to authenticated users"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'chat-files' AND auth.role() = 'authenticated');