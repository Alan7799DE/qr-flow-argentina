-- Add UPDATE policy for qr_scan_events (admin only)
CREATE POLICY "Admins can update scan events"
ON public.qr_scan_events
FOR UPDATE
USING (is_admin());

-- Add DELETE policy for qr_scan_events (admin only)
CREATE POLICY "Admins can delete scan events"
ON public.qr_scan_events
FOR DELETE
USING (is_admin());