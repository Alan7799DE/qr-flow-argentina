
ALTER TABLE public.app_config ADD COLUMN grace_period_hours integer NOT NULL DEFAULT 24;
COMMENT ON COLUMN public.app_config.grace_period_hours IS 'Hours of grace period after payment failure before QRs are expired';
