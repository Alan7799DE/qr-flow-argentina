-- Restrict qr_codes SELECT to authenticated users only
DROP POLICY IF EXISTS "Users can view their own QRs" ON public.qr_codes;

CREATE POLICY "Users can view their own QRs"
    ON public.qr_codes
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_admin());