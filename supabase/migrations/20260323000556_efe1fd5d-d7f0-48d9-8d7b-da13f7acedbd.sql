-- Add UNIQUE constraint on subscriptions.user_id (one subscription per user)
ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_user_id_unique UNIQUE (user_id);

-- Create upsert_subscription RPC function
CREATE OR REPLACE FUNCTION public.upsert_subscription(
  _user_id uuid,
  _plan_id uuid,
  _status text,
  _mercadopago_preapproval_id text,
  _mercadopago_subscription_id text,
  _current_period_start timestamptz,
  _current_period_end timestamptz,
  _grace_period_ends_at timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    mercadopago_preapproval_id,
    mercadopago_subscription_id,
    current_period_start,
    current_period_end,
    grace_period_ends_at,
    updated_at
  ) VALUES (
    _user_id,
    _plan_id,
    _status,
    _mercadopago_preapproval_id,
    _mercadopago_subscription_id,
    _current_period_start,
    _current_period_end,
    _grace_period_ends_at,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    status = EXCLUDED.status,
    mercadopago_preapproval_id = EXCLUDED.mercadopago_preapproval_id,
    mercadopago_subscription_id = EXCLUDED.mercadopago_subscription_id,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    grace_period_ends_at = EXCLUDED.grace_period_ends_at,
    updated_at = now();
END;
$$;