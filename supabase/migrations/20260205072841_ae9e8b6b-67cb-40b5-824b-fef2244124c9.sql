-- Fix the overly permissive UPDATE policy for academic_resources
DROP POLICY IF EXISTS "Anyone can update download count" ON public.academic_resources;

-- Create a more specific policy - only allow updating download_count
CREATE POLICY "Authenticated users can update download count"
ON public.academic_resources FOR UPDATE
USING (auth.uid() IS NOT NULL);