-- First, create a new text column to hold department values
ALTER TABLE public.profiles ADD COLUMN department_text text;

-- Copy existing enum values as text
UPDATE public.profiles SET department_text = department::text;

-- Drop the old column and rename
ALTER TABLE public.profiles DROP COLUMN department;
ALTER TABLE public.profiles RENAME COLUMN department_text TO department;

-- Make it not null with a default
ALTER TABLE public.profiles ALTER COLUMN department SET NOT NULL;
ALTER TABLE public.profiles ALTER COLUMN department SET DEFAULT 'computer_science';

-- Update the handle_new_user function to use text instead of casting to enum
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, department, level, faculty, gender, user_role, reg_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Student'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'computer_science'),
    COALESCE((NEW.raw_user_meta_data->>'level')::student_level, '100'),
    COALESCE(NEW.raw_user_meta_data->>'faculty', ''),
    COALESCE((NEW.raw_user_meta_data->>'gender')::gender, NULL),
    COALESCE((NEW.raw_user_meta_data->>'user_role')::user_role_type, 'student'),
    NEW.raw_user_meta_data->>'reg_number'
  );
  RETURN NEW;
END;
$function$;