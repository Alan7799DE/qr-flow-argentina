
-- Create qr_daily_stats table
CREATE TABLE public.qr_daily_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  qr_code_id UUID NOT NULL REFERENCES public.qr_codes(id) ON DELETE CASCADE,
  scan_date DATE NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT qr_daily_stats_unique UNIQUE (qr_code_id, scan_date)
);

-- Index for efficient lookups
CREATE INDEX idx_qr_daily_stats_qr_date ON public.qr_daily_stats (qr_code_id, scan_date);

-- Enable RLS
ALTER TABLE public.qr_daily_stats ENABLE ROW LEVEL SECURITY;

-- SELECT: owners of the QR + admins
CREATE POLICY "Users can view daily stats of their own QRs"
ON public.qr_daily_stats
FOR SELECT
USING (
  (EXISTS (
    SELECT 1 FROM public.qr_codes
    WHERE qr_codes.id = qr_daily_stats.qr_code_id
    AND qr_codes.user_id = auth.uid()
  )) OR is_admin()
);

-- INSERT/UPDATE/DELETE: only service role (via edge function) - no user policies needed
-- The edge function uses service_role_key which bypasses RLS
