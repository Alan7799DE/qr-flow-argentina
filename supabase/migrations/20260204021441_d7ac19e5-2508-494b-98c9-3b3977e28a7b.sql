-- Add INSERT policy for email_logs (admin only)
CREATE POLICY "Admins can insert email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (is_admin());

-- Add UPDATE policy for email_logs (admin only)
CREATE POLICY "Admins can update email logs"
ON public.email_logs
FOR UPDATE
USING (is_admin());