
-- Add 'partner' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'partner';

-- Update handle_new_user trigger to support partner affiliation
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _affiliation text;
  _role app_role;
BEGIN
  _affiliation := COALESCE(NEW.raw_user_meta_data->>'affiliation', '');
  
  -- Determine role based on affiliation
  IF _affiliation = 'manager_inopnc' THEN
    _role := 'admin';
  ELSIF _affiliation = 'partner_company' THEN
    _role := 'partner';
  ELSE
    _role := 'worker';
  END IF;

  INSERT INTO public.profiles (user_id, name, phone, affiliation)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE 
      WHEN _affiliation IN ('worker_inopnc', 'manager_inopnc') THEN '이노피앤씨'
      WHEN _affiliation = 'partner_company' THEN COALESCE(NEW.raw_user_meta_data->>'partner_name', '파트너사')
      ELSE _affiliation
    END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$function$;

-- Update has_role function to work with new enum value (no change needed, it already works)
