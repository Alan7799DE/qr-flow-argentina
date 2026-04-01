
-- Drop the existing INSERT policy
DROP POLICY "Enforce QR limit on insert" ON public.qr_codes;

-- Recreate with status restriction
CREATE POLICY "Enforce QR limit on insert" ON public.qr_codes
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND count_active_qr_codes(auth.uid()) < get_user_qr_limit(auth.uid())
  AND (
    status = 'trial_active'
    OR is_admin()
    OR has_active_subscription(auth.uid())
  )
);
