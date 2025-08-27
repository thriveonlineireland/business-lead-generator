-- Check if tables exist and create them if needed
CREATE TABLE IF NOT EXISTS public.business_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  business_type TEXT NOT NULL,
  location_searched TEXT NOT NULL,
  rating DECIMAL,
  google_place_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  business_type TEXT NOT NULL,
  results_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_leads
CREATE POLICY IF NOT EXISTS "Users can view their own business leads" 
ON public.business_leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own business leads" 
ON public.business_leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for search_history
CREATE POLICY IF NOT EXISTS "Users can view their own search history" 
ON public.search_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own search history" 
ON public.search_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);