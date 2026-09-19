-- Change default task approval_status to 'pending' so all tasks require admin approval
ALTER TABLE public.tasks ALTER COLUMN approval_status SET DEFAULT 'pending'::approval_status;