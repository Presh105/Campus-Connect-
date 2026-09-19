CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, department, level, faculty, gender, user_role, reg_number, phone_number, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Student'),
    COALESCE(NEW.raw_user_meta_data->>'department', 'computer_science'),
    COALESCE((NEW.raw_user_meta_data->>'level')::student_level, '100'),
    COALESCE(NEW.raw_user_meta_data->>'faculty', ''),
    COALESCE((NEW.raw_user_meta_data->>'gender')::gender, NULL),
    COALESCE((NEW.raw_user_meta_data->>'user_role')::user_role_type, 'student'),
    NEW.raw_user_meta_data->>'reg_number',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$function$;