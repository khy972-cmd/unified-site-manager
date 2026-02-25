
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
      ELSE _affiliation
    END
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$function$;
