-- Fix the security vulnerability in subscribers table RLS policies
-- Remove the overly broad policy that allows unrestricted access

-- First, drop the problematic policy that allows all operations with USING (true)
DROP POLICY IF EXISTS "Service can insert/update subscriptions" ON public.subscribers;

-- Create more specific and secure policies for service operations
-- These policies will be bypassed by Edge Functions using the service role key anyway

-- Policy for service to insert new subscriber records (will be bypassed by service role)
CREATE POLICY "service_insert_subscribers" ON public.subscribers
  FOR INSERT 
  WITH CHECK (false); -- Deny by default, service role will bypass this

-- Policy for service to update subscriber records (will be bypassed by service role)  
CREATE POLICY "service_update_subscribers" ON public.subscribers
  FOR UPDATE
  USING (false); -- Deny by default, service role will bypass this

-- Add a comment explaining the security model
COMMENT ON TABLE public.subscribers IS 'Subscription data is managed by Edge Functions using service role key to bypass RLS. User-facing policies restrict access to own data only.';