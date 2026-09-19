
-- 1. Ad placement
ALTER TABLE public.feed_ads ADD COLUMN IF NOT EXISTS placement text NOT NULL DEFAULT 'feed';

-- 2. Notify admins when content needs approval
CREATE OR REPLACE FUNCTION public.notify_admins_pending_approval(_kind text, _title text, _ref_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin record;
  _short text := substr(coalesce(_title,''),1,60);
BEGIN
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications(user_id, title, message, type, reference_id, reference_type)
    VALUES (_admin.user_id,
            '🔔 New ' || _kind || ' needs approval',
            '"' || _short || '" is awaiting your review.',
            'approval',
            _ref_id,
            _kind);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_admins_post() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    PERFORM public.notify_admins_pending_approval('post', NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_admins_listing() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    PERFORM public.notify_admins_pending_approval('listing', NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_admins_task() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    PERFORM public.notify_admins_pending_approval('task', NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_admins_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    PERFORM public.notify_admins_pending_approval('prediction', NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_admins_school_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.approval_status = 'pending' THEN
    PERFORM public.notify_admins_pending_approval('school event', NEW.title, NEW.id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_admins_on_post ON public.posts;
CREATE TRIGGER notify_admins_on_post AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admins_post();

DROP TRIGGER IF EXISTS notify_admins_on_listing ON public.listings;
CREATE TRIGGER notify_admins_on_listing AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admins_listing();

DROP TRIGGER IF EXISTS notify_admins_on_task ON public.tasks;
CREATE TRIGGER notify_admins_on_task AFTER INSERT ON public.tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admins_task();

DROP TRIGGER IF EXISTS notify_admins_on_event ON public.events;
CREATE TRIGGER notify_admins_on_event AFTER INSERT ON public.events
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admins_event();

DROP TRIGGER IF EXISTS notify_admins_on_school_event ON public.school_events;
CREATE TRIGGER notify_admins_on_school_event AFTER INSERT ON public.school_events
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admins_school_event();
