
ALTER TABLE public.academic_resources
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS level text,
  ADD COLUMN IF NOT EXISTS semester text;

CREATE INDEX IF NOT EXISTS idx_academic_resources_dept_level_sem
  ON public.academic_resources (department, level, semester);
