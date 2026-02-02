-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own QRs" ON public.qr_codes;

-- Create a new policy that restricts setting status to 'active' 
-- Only allow if user owns the QR AND:
-- - The new status is NOT 'active', OR
-- - The user has an active subscription
CREATE POLICY "Users can update their own QRs with subscription check"
ON public.qr_codes
FOR UPDATE
USING (user_id = auth.uid() OR is_admin())
WITH CHECK (
  (user_id = auth.uid() OR is_admin()) AND
  (
    -- Allow any update that doesn't set status to 'active'
    status != 'active' OR
    -- Or allow 'active' status only with active subscription
    has_active_subscription(auth.uid()) OR
    -- Admins can always update
    is_admin()
  )
);