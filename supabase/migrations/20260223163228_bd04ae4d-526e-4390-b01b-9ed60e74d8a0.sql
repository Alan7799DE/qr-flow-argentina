
-- Add grace_period_ends_at column to subscriptions for payment failure grace periods
ALTER TABLE public.subscriptions 
ADD COLUMN grace_period_ends_at timestamp with time zone DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.subscriptions.grace_period_ends_at IS 'When set, QRs remain active until this timestamp despite payment failure. After this, QRs are expired.';
