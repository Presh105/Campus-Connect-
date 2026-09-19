-- Move away from student-only defaults now that signup no longer
-- collects faculty / department / level / registration number.

-- Give department a neutral default instead of 'computer_science'
ALTER TABLE public.profiles ALTER COLUMN department SET DEFAULT 'general';

-- Level is still NOT NULL (legacy column); give it a neutral default
-- so the trigger doesn't need to invent a fake academic level.
ALTER TABLE public.profiles ALTER COLUMN level SET DEFAULT '0';

-- Update the signup trigger: no more student-specific fields are
-- required or expected from raw_user_meta_data.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, department, level, phone_number, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New Member'),
    'general',
    '0',
    NEW.raw_user_meta_data->>'phone_number',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$function$;
