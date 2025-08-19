-- Fix database function search_path security issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = 'public'
AS $function$
BEGIN
NEW.updated_at = now();
RETURN NEW;
END;
$function$;

-- Add encrypted API key storage to profiles table
ALTER TABLE public.profiles 
ADD COLUMN encrypted_google_places_api_key text,
ADD COLUMN encrypted_firecrawl_api_key text;