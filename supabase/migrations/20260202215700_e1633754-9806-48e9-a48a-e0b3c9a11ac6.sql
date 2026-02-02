-- Fix permissive RLS policies

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can insert scan events" ON public.qr_scan_events;
DROP POLICY IF EXISTS "Service can insert webhook logs" ON public.webhook_logs;

-- Create more restrictive policies
-- For scan events: only allow insert if the QR code exists (this will be called by edge function with service role)
CREATE POLICY "Insert scan events for existing QRs"
    ON public.qr_scan_events FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.qr_codes WHERE id = qr_code_id
        )
    );

-- For webhook logs: only admins can insert (edge functions use service role which bypasses RLS)
CREATE POLICY "Admins can insert webhook logs"
    ON public.webhook_logs FOR INSERT
    WITH CHECK (public.is_admin());