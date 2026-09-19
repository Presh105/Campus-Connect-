-- Add phone_number column to profiles with unique constraint
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Create unique index on phone_number (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_number_unique ON public.profiles(phone_number) WHERE phone_number IS NOT NULL AND phone_number != '';

-- Create unique index on reg_number (only for non-null values) 
CREATE UNIQUE INDEX IF NOT EXISTS profiles_reg_number_unique ON public.profiles(reg_number) WHERE reg_number IS NOT NULL AND reg_number != '';