-- Fix security warning: Update function with proper search_path
CREATE OR REPLACE FUNCTION public.reset_monthly_searches()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET free_searches_used = 0, 
      last_search_reset = CURRENT_DATE
  WHERE last_search_reset < CURRENT_DATE;
END;
$$;