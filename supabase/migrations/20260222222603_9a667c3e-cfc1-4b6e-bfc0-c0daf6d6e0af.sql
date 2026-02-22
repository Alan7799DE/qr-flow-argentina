
-- Add trial fields to profiles (account-level trial)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_notice_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_notice_sent boolean DEFAULT false;

-- Migrate existing trial data: use the earliest QR's trial dates per user
UPDATE public.profiles p
SET 
  trial_started_at = sub.first_created,
  trial_expires_at = sub.first_expires,
  trial_notice_at = sub.first_notice,
  trial_notice_sent = sub.any_sent
FROM (
  SELECT 
    user_id,
    MIN(created_at) as first_created,
    MIN(trial_expires_at) as first_expires,
    MIN(trial_notice_at) as first_notice,
    BOOL_OR(COALESCE(trial_notice_sent, false)) as any_sent
  FROM public.qr_codes
  WHERE trial_expires_at IS NOT NULL
  GROUP BY user_id
) sub
WHERE p.user_id = sub.user_id;
