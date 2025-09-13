-- Add usage tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS free_searches_used integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_search_reset date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive',
ADD COLUMN IF NOT EXISTS subscription_end timestamp with time zone;

-- Update subscribers table for better Stripe integration
ALTER TABLE public.subscribers 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'inactive';

-- Create function to reset monthly search count
CREATE OR REPLACE FUNCTION public.reset_monthly_searches()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles 
  SET free_searches_used = 0, 
      last_search_reset = CURRENT_DATE
  WHERE last_search_reset < CURRENT_DATE;
END;
$$;

-- Create function to check user subscription status
CREATE OR REPLACE FUNCTION public.is_premium_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = _user_id 
    AND subscription_status = 'active' 
    AND (subscription_end IS NULL OR subscription_end > now())
  );
$$;

-- Create function to check free search limit
CREATE OR REPLACE FUNCTION public.can_make_free_search(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_record public.profiles%ROWTYPE;
BEGIN
  -- Get user record
  SELECT * INTO user_record 
  FROM public.profiles 
  WHERE user_id = _user_id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, free_searches_used, last_search_reset)
    VALUES (_user_id, 0, CURRENT_DATE);
    RETURN true;
  END IF;
  
  -- Reset counter if it's a new month
  IF user_record.last_search_reset < CURRENT_DATE THEN
    UPDATE public.profiles 
    SET free_searches_used = 0, last_search_reset = CURRENT_DATE
    WHERE user_id = _user_id;
    RETURN true;
  END IF;
  
  -- Check if user has searches left
  RETURN user_record.free_searches_used < 3;
END;
$$;