-- Add processed_at column to webhook_logs
ALTER TABLE public.webhook_logs
ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Add mp_data_id column for efficient idempotency lookups
ALTER TABLE public.webhook_logs
ADD COLUMN IF NOT EXISTS mp_data_id text;

-- Unique partial index: one processed record per (mp_data_id, event_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_logs_idempotency
ON public.webhook_logs (mp_data_id, event_type)
WHERE processed = true AND mp_data_id IS NOT NULL;