
-- 1. Add username to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- 2. Add system_id to profiles (auto-generated, non-identity-exposing)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS system_id text UNIQUE;

-- 3. Add short_id to content tables for unique content identification
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS short_id text UNIQUE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS short_id text UNIQUE;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS short_id text UNIQUE;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS short_id text UNIQUE;
ALTER TABLE public.school_announcements ADD COLUMN IF NOT EXISTS short_id text UNIQUE;

-- 4. Add whatsapp_link to tasks and listings
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS whatsapp_link text;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS whatsapp_link text;

-- 5. Add multiple images support
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS image_urls text[];
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS image_urls text[];
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS image_url text;

-- 6. Add view_count to tasks and listings
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS view_count integer DEFAULT 0;

-- 7. Change listings default approval to pending (all listings need admin approval)
ALTER TABLE public.listings ALTER COLUMN approval_status SET DEFAULT 'pending';

-- 8. Create task_applications table
CREATE TABLE IF NOT EXISTS public.task_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, applicant_id)
);
ALTER TABLE public.task_applications ENABLE ROW LEVEL SECURITY;

-- 9. Create contact_info table (admin payment accounts, social links, instructions)
CREATE TABLE IF NOT EXISTS public.contact_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  purpose text,
  duration text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;

-- 10. Create app_messages table (welcome messages, payment instructions, broadcasts)
CREATE TABLE IF NOT EXISTS public.app_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  target_level text,
  target_department text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_messages ENABLE ROW LEVEL SECURITY;

-- 11. Create content_views table (track unique views per user per content)
CREATE TABLE IF NOT EXISTS public.content_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, user_id)
);
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;

-- 12. Generate system_id function
CREATE OR REPLACE FUNCTION public.generate_system_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.system_id := 'CC-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_system_id BEFORE INSERT ON public.profiles
FOR EACH ROW WHEN (NEW.system_id IS NULL)
EXECUTE FUNCTION public.generate_system_id();

-- 13. Generate short_id function
CREATE OR REPLACE FUNCTION public.generate_short_id()
RETURNS text LANGUAGE sql SET search_path = public AS $$
  SELECT upper(substr(md5(gen_random_uuid()::text), 1, 8));
$$;

-- Short ID triggers for content tables
CREATE OR REPLACE FUNCTION public.set_content_short_id()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.short_id := public.generate_short_id();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_posts_short_id BEFORE INSERT ON public.posts FOR EACH ROW WHEN (NEW.short_id IS NULL) EXECUTE FUNCTION public.set_content_short_id();
CREATE TRIGGER set_tasks_short_id BEFORE INSERT ON public.tasks FOR EACH ROW WHEN (NEW.short_id IS NULL) EXECUTE FUNCTION public.set_content_short_id();
CREATE TRIGGER set_listings_short_id BEFORE INSERT ON public.listings FOR EACH ROW WHEN (NEW.short_id IS NULL) EXECUTE FUNCTION public.set_content_short_id();
CREATE TRIGGER set_events_short_id BEFORE INSERT ON public.events FOR EACH ROW WHEN (NEW.short_id IS NULL) EXECUTE FUNCTION public.set_content_short_id();
CREATE TRIGGER set_announcements_short_id BEFORE INSERT ON public.school_announcements FOR EACH ROW WHEN (NEW.short_id IS NULL) EXECUTE FUNCTION public.set_content_short_id();

-- 14. Backfill system_id for existing profiles
UPDATE public.profiles SET system_id = 'CC-' || upper(substr(md5(user_id::text || created_at::text), 1, 8)) WHERE system_id IS NULL;

-- 15. Backfill short_ids
UPDATE public.posts SET short_id = upper(substr(md5(id::text), 1, 8)) WHERE short_id IS NULL;
UPDATE public.tasks SET short_id = upper(substr(md5(id::text), 1, 8)) WHERE short_id IS NULL;
UPDATE public.listings SET short_id = upper(substr(md5(id::text), 1, 8)) WHERE short_id IS NULL;
UPDATE public.events SET short_id = upper(substr(md5(id::text), 1, 8)) WHERE short_id IS NULL;
UPDATE public.school_announcements SET short_id = upper(substr(md5(id::text), 1, 8)) WHERE short_id IS NULL;

-- 16. RLS policies for task_applications
CREATE POLICY "Task applications viewable by relevant users" ON public.task_applications FOR SELECT USING (
  auth.uid() = applicant_id OR
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND poster_id = auth.uid()) OR
  has_role(auth.uid(), 'admin')
);
CREATE POLICY "Users can apply for tasks" ON public.task_applications FOR INSERT WITH CHECK (auth.uid() = applicant_id);
CREATE POLICY "Task posters and admins can update applications" ON public.task_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.tasks WHERE id = task_id AND poster_id = auth.uid()) OR has_role(auth.uid(), 'admin')
);
CREATE POLICY "Admins can delete applications" ON public.task_applications FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 17. RLS policies for contact_info
CREATE POLICY "Contact info viewable by everyone" ON public.contact_info FOR SELECT USING (true);
CREATE POLICY "Admins can insert contact info" ON public.contact_info FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update contact info" ON public.contact_info FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete contact info" ON public.contact_info FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 18. RLS policies for app_messages
CREATE POLICY "App messages viewable by authenticated" ON public.app_messages FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can insert app messages" ON public.app_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update app messages" ON public.app_messages FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete app messages" ON public.app_messages FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 19. RLS policies for content_views
CREATE POLICY "Users can record views" ON public.content_views FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Views are viewable" ON public.content_views FOR SELECT USING (true);

-- 20. Fix task update policy to include admin
DROP POLICY IF EXISTS "Task posters can update their tasks" ON public.tasks;
CREATE POLICY "Task posters acceptors and admins can update tasks" ON public.tasks FOR UPDATE USING (
  auth.uid() = poster_id OR auth.uid() = acceptor_id OR has_role(auth.uid(), 'admin')
);

-- 21. Add admin update policy for listings (admin needs to approve)
DROP POLICY IF EXISTS "Admins can update listings" ON public.listings;
CREATE POLICY "Admins can update listings" ON public.listings FOR UPDATE USING (has_role(auth.uid(), 'admin'));

-- 22. Enable realtime for content_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.content_views;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_applications;
