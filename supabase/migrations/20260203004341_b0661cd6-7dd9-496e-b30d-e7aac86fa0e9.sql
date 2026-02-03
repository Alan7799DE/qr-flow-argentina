-- Update subscriptions table RLS policies to explicitly require authentication
-- This prevents anonymous users from accessing payment/subscription data

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON public.subscriptions;

-- Recreate SELECT policy with explicit authenticated role requirement
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR is_admin());

-- Recreate admin management policy with explicit authenticated role
CREATE POLICY "Admins can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());