-- Fix society vs individual login mismatch.
-- Root cause: signup stores customer_account_kind in auth user_metadata, but
-- handle_new_auth_user did not create customers rows / set account_kind.
-- Email-confirm registration then returned before the client could update account_kind,
-- so society users defaulted to individual and could only sign in on the individual page.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_account_kind text;
BEGIN
  INSERT INTO public.users (id, email, password_hash, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  v_role := NEW.raw_user_meta_data->>'role';

  IF v_role IS NOT NULL AND v_role <> '' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role);
  END IF;

  IF v_role = 'admin' THEN
    BEGIN
      INSERT INTO public.admins (user_id, business_name, updated_at)
      VALUES (
        NEW.id,
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'businessName', '')), ''),
        NOW()
      );
    EXCEPTION
      WHEN unique_violation THEN
        NULL;
    END;
  END IF;

  IF v_role = 'customer' THEN
    v_account_kind := CASE
      WHEN NEW.raw_user_meta_data->>'customer_account_kind' = 'society' THEN 'society'
      ELSE 'individual'
    END;

    BEGIN
      INSERT INTO public.customers (user_id, saved_addresses, account_kind)
      VALUES (NEW.id, '[]'::jsonb, v_account_kind);
    EXCEPTION
      WHEN unique_violation THEN
        UPDATE public.customers
        SET account_kind = v_account_kind
        WHERE user_id = NEW.id
          AND account_kind IS DISTINCT FROM v_account_kind;
    END;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    RETURN NEW;
END;
$function$;

-- Backfill existing society signups incorrectly stored as individual (or missing).
UPDATE public.customers c
SET account_kind = 'society'
FROM auth.users au
WHERE au.id = c.user_id
  AND au.raw_user_meta_data->>'customer_account_kind' = 'society'
  AND c.account_kind IS DISTINCT FROM 'society';

INSERT INTO public.customers (user_id, saved_addresses, account_kind)
SELECT au.id, '[]'::jsonb, 'society'
FROM auth.users au
JOIN public.user_roles ur ON ur.user_id = au.id AND ur.role = 'customer'
WHERE au.raw_user_meta_data->>'customer_account_kind' = 'society'
  AND NOT EXISTS (
    SELECT 1 FROM public.customers c WHERE c.user_id = au.id
  );
