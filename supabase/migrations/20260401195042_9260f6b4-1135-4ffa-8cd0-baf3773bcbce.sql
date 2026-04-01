
CREATE POLICY "Service role can manage daily stats"
ON public.qr_daily_stats
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
