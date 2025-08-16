-- Create a table to store business leads from searches
CREATE TABLE IF NOT EXISTS public.business_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  website TEXT,
  email TEXT,
  business_type TEXT,
  location_searched TEXT,
  rating DECIMAL,
  google_place_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.business_leads ENABLE ROW LEVEL SECURITY;

-- Create policies for business_leads
CREATE POLICY "Users can view their own business leads" 
ON public.business_leads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own business leads" 
ON public.business_leads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business leads" 
ON public.business_leads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own business leads" 
ON public.business_leads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_business_leads_updated_at
BEFORE UPDATE ON public.business_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();