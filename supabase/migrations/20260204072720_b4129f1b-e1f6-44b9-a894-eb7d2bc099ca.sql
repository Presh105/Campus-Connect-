-- Update handle_new_user to include reg_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, department, level, faculty, gender, user_role, reg_number)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Student'),
    COALESCE((NEW.raw_user_meta_data->>'department')::department, 'computer_science'),
    COALESCE((NEW.raw_user_meta_data->>'level')::student_level, '100'),
    COALESCE(NEW.raw_user_meta_data->>'faculty', ''),
    COALESCE((NEW.raw_user_meta_data->>'gender')::gender, NULL),
    COALESCE((NEW.raw_user_meta_data->>'user_role')::user_role_type, 'student'),
    NEW.raw_user_meta_data->>'reg_number'
  );
  RETURN NEW;
END;
$$;

-- Update first user admin trigger to set is_super_admin
CREATE OR REPLACE FUNCTION public.handle_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles LIMIT 1) THEN
    INSERT INTO public.user_roles (user_id, role, is_super_admin)
    VALUES (NEW.id, 'admin', true);
  END IF;
  RETURN NEW;
END;
$$;