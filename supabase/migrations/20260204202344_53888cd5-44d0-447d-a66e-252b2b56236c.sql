-- Add display_locations column to pinned_rules table
ALTER TABLE public.pinned_rules 
ADD COLUMN display_locations text[] DEFAULT ARRAY['feed']::text[];

-- Create sponsored_post_privileges table for admin to assign sponsored post privileges
CREATE TABLE public.sponsored_post_privileges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  days_allowed integer NOT NULL DEFAULT 0,
  posts_allowed integer NOT NULL DEFAULT 0,
  posts_used integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  assigned_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.sponsored_post_privileges ENABLE ROW LEVEL SECURITY;

-- Policies: Only admins can manage
CREATE POLICY "Admins can manage sponsored privileges"
ON public.sponsored_post_privileges
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own privileges
CREATE POLICY "Users can view their own privileges"
ON public.sponsored_post_privileges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_sponsored_privileges_updated_at
BEFORE UPDATE ON public.sponsored_post_privileges
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();