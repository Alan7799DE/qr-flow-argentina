
-- Table to log deleted users
CREATE TABLE public.deleted_users_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  qr_count INTEGER NOT NULL DEFAULT 0,
  deleted_by UUID NOT NULL,
  deleted_by_email TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'manual',
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deleted_users_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view
CREATE POLICY "Admins can view deleted users log"
ON public.deleted_users_log
FOR SELECT
USING (is_admin());

-- Only admins can insert (service role bypasses RLS anyway)
CREATE POLICY "Admins can insert deleted users log"
ON public.deleted_users_log
FOR INSERT
WITH CHECK (is_admin());
