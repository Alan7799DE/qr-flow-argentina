-- Add UPDATE policy for webhook_logs restricted to admin only
CREATE POLICY "Admins can update webhook logs"
ON public.webhook_logs
FOR UPDATE
USING (is_admin());

-- Add DELETE policy for webhook_logs restricted to admin only
CREATE POLICY "Admins can delete webhook logs"
ON public.webhook_logs
FOR DELETE
USING (is_admin());