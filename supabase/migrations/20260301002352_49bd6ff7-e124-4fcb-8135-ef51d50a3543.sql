
ALTER TABLE public.profiles
ADD COLUMN trial_notice_48h_at timestamptz DEFAULT NULL,
ADD COLUMN trial_notice_48h_sent boolean DEFAULT false;
