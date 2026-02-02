-- =============================================
-- QRapido SaaS - Database Schema
-- =============================================

-- 1. Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create plans table
CREATE TABLE public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    price_ars DECIMAL(10,2) NOT NULL DEFAULT 0,
    qr_limit INTEGER NOT NULL DEFAULT 5,
    retention_days INTEGER NOT NULL DEFAULT 30,
    has_logo_customization BOOLEAN NOT NULL DEFAULT false,
    has_api_access BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create app_config table for global settings
CREATE TABLE public.app_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    trial_notice_days INTEGER NOT NULL DEFAULT 1,
    trial_expire_days INTEGER NOT NULL DEFAULT 8,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create subscriptions table
CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    plan_id UUID REFERENCES public.plans(id) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
    mercadopago_subscription_id TEXT,
    mercadopago_preapproval_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Create qr_codes table
CREATE TABLE public.qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    destination_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'trial_active' CHECK (status IN ('trial_active', 'active', 'paused', 'expired')),
    color TEXT DEFAULT '#000000',
    logo_url TEXT,
    -- UTM parameters
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    -- Trial tracking
    trial_notice_at TIMESTAMPTZ,
    trial_expires_at TIMESTAMPTZ,
    trial_notice_sent BOOLEAN DEFAULT false,
    -- Scan cache
    total_scans_cached INTEGER NOT NULL DEFAULT 0,
    last_scan_at TIMESTAMPTZ,
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Create qr_scan_events table
CREATE TABLE public.qr_scan_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    qr_code_id UUID REFERENCES public.qr_codes(id) ON DELETE CASCADE NOT NULL,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_agent TEXT,
    referer TEXT,
    ip_hash TEXT,
    device_type TEXT,
    os TEXT,
    country TEXT,
    city TEXT
);

-- 9. Create webhook_logs table
CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Create email_logs table
CREATE TABLE public.email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    email_type TEXT NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    metadata JSONB
);

-- =============================================
-- Security Definer Functions
-- =============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
        AND role = _role
    )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.subscriptions
        WHERE user_id = _user_id
        AND status = 'active'
    )
$$;

-- Get user's QR limit based on their plan
CREATE OR REPLACE FUNCTION public.get_user_qr_limit(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(
        (SELECT p.qr_limit 
         FROM public.subscriptions s
         JOIN public.plans p ON s.plan_id = p.id
         WHERE s.user_id = _user_id AND s.status = 'active'),
        5 -- Default trial limit
    )
$$;

-- Count user's QR codes
CREATE OR REPLACE FUNCTION public.count_user_qr_codes(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.qr_codes
    WHERE user_id = _user_id
$$;

-- =============================================
-- Enable RLS on all tables
-- =============================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies
-- =============================================

-- user_roles policies
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

-- profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- plans policies (public read, admin write)
CREATE POLICY "Anyone can view active plans"
    ON public.plans FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins can insert plans"
    ON public.plans FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update plans"
    ON public.plans FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can delete plans"
    ON public.plans FOR DELETE
    USING (public.is_admin());

-- app_config policies (public read, admin write)
CREATE POLICY "Anyone can view app config"
    ON public.app_config FOR SELECT
    USING (true);

CREATE POLICY "Admins can update app config"
    ON public.app_config FOR UPDATE
    USING (public.is_admin());

CREATE POLICY "Admins can insert app config"
    ON public.app_config FOR INSERT
    WITH CHECK (public.is_admin());

-- subscriptions policies
CREATE POLICY "Users can view their own subscription"
    ON public.subscriptions FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Service role can manage subscriptions"
    ON public.subscriptions FOR ALL
    USING (public.is_admin());

-- qr_codes policies
CREATE POLICY "Users can view their own QRs"
    ON public.qr_codes FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can insert their own QRs"
    ON public.qr_codes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own QRs"
    ON public.qr_codes FOR UPDATE
    USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can delete their own QRs"
    ON public.qr_codes FOR DELETE
    USING (user_id = auth.uid() OR public.is_admin());

-- qr_scan_events policies
CREATE POLICY "Users can view scans of their own QRs"
    ON public.qr_scan_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.qr_codes
            WHERE id = qr_code_id AND user_id = auth.uid()
        )
        OR public.is_admin()
    );

CREATE POLICY "Anyone can insert scan events"
    ON public.qr_scan_events FOR INSERT
    WITH CHECK (true);

-- webhook_logs policies (admin only)
CREATE POLICY "Admins can view webhook logs"
    ON public.webhook_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Service can insert webhook logs"
    ON public.webhook_logs FOR INSERT
    WITH CHECK (true);

-- email_logs policies
CREATE POLICY "Users can view their own email logs"
    ON public.email_logs FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

-- =============================================
-- Triggers for updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_config_updated_at
    BEFORE UPDATE ON public.app_config
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qr_codes_updated_at
    BEFORE UPDATE ON public.qr_codes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Trigger to create profile on user signup
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email)
    VALUES (NEW.id, NEW.email);
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'user');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Insert default data
-- =============================================

-- Insert default app config
INSERT INTO public.app_config (id, trial_notice_days, trial_expire_days)
VALUES (1, 1, 8);

-- Insert default plans
INSERT INTO public.plans (name, slug, price_ars, qr_limit, retention_days, has_logo_customization, has_api_access, sort_order) VALUES
('Starter', 'starter', 2499.00, 5, 30, false, false, 1),
('Pro', 'pro', 5999.00, 10, 180, true, false, 2),
('Business', 'business', 14999.00, 50, 180, true, true, 3);

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX idx_qr_codes_user_id ON public.qr_codes(user_id);
CREATE INDEX idx_qr_codes_slug ON public.qr_codes(slug);
CREATE INDEX idx_qr_codes_status ON public.qr_codes(status);
CREATE INDEX idx_qr_scan_events_qr_code_id ON public.qr_scan_events(qr_code_id);
CREATE INDEX idx_qr_scan_events_scanned_at ON public.qr_scan_events(scanned_at);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);