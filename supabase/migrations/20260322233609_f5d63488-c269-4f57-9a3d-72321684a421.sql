
-- Security definer function to count active (non-deleted) QRs for a user
CREATE OR REPLACE FUNCTION public.count_active_qr_codes(_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.qr_codes
  WHERE user_id = _user_id
    AND deleted_at IS NULL
$$;

-- RLS policy: limit INSERT on qr_codes to users with < 10 active QRs
CREATE POLICY "Enforce QR limit on insert"
ON public.qr_codes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND public.count_active_qr_codes(auth.uid()) < 10
);

-- Drop the old permissive INSERT policy that had no limit check
DROP POLICY IF EXISTS "Users can insert their own QRs" ON public.qr_codes;
