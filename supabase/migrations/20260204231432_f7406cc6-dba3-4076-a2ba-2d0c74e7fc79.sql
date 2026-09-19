-- Add is_pinned column to tasks, listings, and school_events
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.school_events ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Create academic_resources table for file sharing (past exams, study materials)
CREATE TABLE public.academic_resources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  uploader_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_type text NOT NULL,
  file_name text NOT NULL,
  download_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.academic_resources ENABLE ROW LEVEL SECURITY;

-- RLS policies for academic_resources
CREATE POLICY "Academic resources are viewable by everyone"
  ON public.academic_resources
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can upload resources"
  ON public.academic_resources
  FOR INSERT
  WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can delete their resources"
  ON public.academic_resources
  FOR DELETE
  USING (auth.uid() = uploader_id);

CREATE POLICY "Admins can delete any resources"
  ON public.academic_resources
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for academic resources
INSERT INTO storage.buckets (id, name, public)
VALUES ('academic-resources', 'academic-resources', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for academic resources bucket
CREATE POLICY "Academic resources are publicly accessible"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'academic-resources');

CREATE POLICY "Authenticated users can upload academic resources"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'academic-resources' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own academic resources"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'academic-resources' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for academic_resources
ALTER PUBLICATION supabase_realtime ADD TABLE public.academic_resources;