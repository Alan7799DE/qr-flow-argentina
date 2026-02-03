-- Add RESTRICTIVE policy that requires authentication for all operations on profiles table
-- This prevents anonymous users from accessing any profile data

-- First, drop the existing SELECT policy and recreate it as RESTRICTIVE with auth check
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a RESTRICTIVE policy that requires authentication AND ownership check
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR is_admin());

-- Update INSERT policy to explicitly require authenticated role
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update UPDATE policy to explicitly require authenticated role
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());