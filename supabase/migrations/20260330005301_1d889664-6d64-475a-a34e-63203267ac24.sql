
-- Drop the overly permissive INSERT policy
DROP POLICY "Insert scan events for existing QRs" ON public.qr_scan_events;

-- Create a new INSERT policy restricted to service_role only
CREATE POLICY "Service role can insert scan events"
ON public.qr_scan_events
FOR INSERT
TO service_role
WITH CHECK (true);
