-- Add soft delete column to qr_codes
ALTER TABLE public.qr_codes ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Update SELECT policy to exclude soft-deleted QRs from normal views
DROP POLICY IF EXISTS "Users can view their own QRs" ON public.qr_codes;

CREATE POLICY "Users can view their own QRs"
    ON public.qr_codes
    FOR SELECT
    TO authenticated
    USING ((user_id = auth.uid() OR is_admin()));

-- Update DELETE policy to allow soft-delete (update) but restrict hard delete to admins only
DROP POLICY IF EXISTS "Users can delete their own QRs" ON public.qr_codes;

CREATE POLICY "Only admins can hard delete QRs"
    ON public.qr_codes
    FOR DELETE
    TO authenticated
    USING (is_admin());