-- Fix the business_leads table user_id to be NOT NULL (required for RLS)
ALTER TABLE public.business_leads ALTER COLUMN user_id SET NOT NULL;

-- Drop existing policies and recreate them with correct syntax
DROP POLICY IF EXISTS "Users can view their own business leads" ON public.business_leads;
DROP POLICY IF EXISTS "Users can insert their own business leads" ON public.business_leads;

-- Create correct RLS policies
CREATE POLICY "Users can view their own business leads" 
ON public.business_leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business leads" 
ON public.business_leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Ensure search_history has correct policies too
DROP POLICY IF EXISTS "Users can insert their own search history" ON public.search_history;

CREATE POLICY "Users can insert their own search history" 
ON public.search_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);