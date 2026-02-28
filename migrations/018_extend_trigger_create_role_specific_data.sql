-- Migration: Extend handle_new_auth_user to create role-specific rows (customers, admins)
-- Purpose: When "Confirm email" is enabled, the client has no session after signUp, so
--          client-side insert into customers/admins fails RLS. This extends the trigger
--          to create role-specific rows server-side with SECURITY DEFINER.
-- Date: 2025

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  business_name_val text;
BEGIN
  INSERT INTO public.users (id, email, password_hash, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  user_role := NEW.raw_user_meta_data->>'role';

  IF user_role IS NOT NULL AND user_role <> '' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role);

    -- Create role-specific row so client doesn't need session (e.g. when confirm email is on)
    IF user_role = 'customer' THEN
      INSERT INTO public.customers (user_id, saved_addresses)
      VALUES (NEW.id, '[]'::jsonb)
      ON CONFLICT (user_id) DO NOTHING;
    ELSIF user_role = 'admin' THEN
      business_name_val := NULLIF(TRIM(NEW.raw_user_meta_data->>'business_name'), '');
      INSERT INTO public.admins (user_id, business_name)
      VALUES (NEW.id, business_name_val)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Row already exists (e.g. trigger ran twice or client also inserted)
    RETURN NEW;
END;
$$;
