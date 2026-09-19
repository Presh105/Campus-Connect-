-- Add reg_number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS reg_number TEXT UNIQUE;

-- Add display_name column for unique display (name + number)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_number INTEGER DEFAULT 0;

-- Add view_count to posts (already exists as view_count, confirm it's there)
-- Already has: likes_count, comments_count, view_count

-- Create function to generate unique display numbers for duplicate names
CREATE OR REPLACE FUNCTION public.assign_display_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  name_count INTEGER;
BEGIN
  -- Count existing users with same name
  SELECT COUNT(*) INTO name_count
  FROM public.profiles 
  WHERE LOWER(full_name) = LOWER(NEW.full_name);
  
  -- Assign number (starts at 1 for first duplicate)
  IF name_count > 0 THEN
    NEW.display_number := name_count + 1;
  ELSE
    NEW.display_number := 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign display numbers
DROP TRIGGER IF EXISTS assign_display_number_trigger ON public.profiles;
CREATE TRIGGER assign_display_number_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_display_number();

-- Add school_events table for school reminders
CREATE TABLE IF NOT EXISTS public.school_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  creator_id UUID NOT NULL,
  approval_status approval_status DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on school_events
ALTER TABLE public.school_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_events
CREATE POLICY "School events are viewable by everyone" 
ON public.school_events 
FOR SELECT 
USING (approval_status = 'approved' OR creator_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create events" 
ON public.school_events 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their events" 
ON public.school_events 
FOR UPDATE 
USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators can delete their events" 
ON public.school_events 
FOR DELETE 
USING (auth.uid() = creator_id OR has_role(auth.uid(), 'admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_school_events_updated_at
BEFORE UPDATE ON public.school_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_super_admin column to user_roles to distinguish main admin
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false;

-- Update events table to enforce binary choices
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS option_a TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS option_b TEXT;

-- Add terms_accepted column to predictions
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;

-- Update event policies to require admin approval for user-created events
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone" 
ON public.events 
FOR SELECT 
USING (approval_status = 'approved' OR creator_id = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Allow users to create events (needs admin approval)
CREATE POLICY "Authenticated users can create events" 
ON public.events 
FOR INSERT 
WITH CHECK (auth.uid() = creator_id);

-- Admin can update events
CREATE POLICY "Admins can update events" 
ON public.events 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin') OR auth.uid() = creator_id);

-- Add policy for predictions to see participants
DROP POLICY IF EXISTS "Users can view their own predictions" ON public.predictions;
CREATE POLICY "Predictions viewable by owner and admin" 
ON public.predictions 
FOR SELECT 
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Enable realtime for school_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.school_events;