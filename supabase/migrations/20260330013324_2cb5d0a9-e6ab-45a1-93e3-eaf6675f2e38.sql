
-- Update the RLS INSERT policy to use dynamic qr_limit from the user's plan
DROP POLICY "Enforce QR limit on insert" ON public.qr_codes;

CREATE POLICY "Enforce QR limit on insert"
ON public.qr_codes
FOR INSERT
TO authenticated
WITH CHECK (
  (user_id = auth.uid())
  AND (count_active_qr_codes(auth.uid()) < get_user_qr_limit(auth.uid()))
);
