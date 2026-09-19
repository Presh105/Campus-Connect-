
-- Audio clips table for admin-uploaded audio that auto-plays
CREATE TABLE public.audio_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  audio_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.audio_clips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audio clips viewable by everyone" ON public.audio_clips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage audio clips" ON public.audio_clips FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Storage bucket for audio files
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-clips', 'audio-clips', true);

CREATE POLICY "Anyone can read audio clips" ON storage.objects FOR SELECT USING (bucket_id = 'audio-clips');
CREATE POLICY "Admins can upload audio clips" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-clips' AND (SELECT has_role(auth.uid(), 'admin')));
CREATE POLICY "Admins can delete audio clips" ON storage.objects FOR DELETE USING (bucket_id = 'audio-clips' AND (SELECT has_role(auth.uid(), 'admin')));

-- Welfare items table (admin adds items like airtime, codes, food)
CREATE TABLE public.welfare_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  quantity integer NOT NULL DEFAULT 0,
  item_type text NOT NULL DEFAULT 'general',
  image_url text,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.welfare_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Welfare items viewable by authenticated" ON public.welfare_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage welfare items" ON public.welfare_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
