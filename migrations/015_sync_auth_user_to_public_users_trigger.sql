-- Migration: Sync new auth users to public.users and public.user_roles via trigger
-- Purpose: When email auth is enabled, the client may not have a session immediately
--          after signUp (e.g. if "Confirm email" is on), so client-side insert into
--          public.users fails RLS. This trigger runs on the server when auth.users
--          gets a new row and creates the public.users + user_roles rows with
--          SECURITY DEFINER so RLS does not block the insert.
-- Date: 2025

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, password_hash, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    '',
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', '')
  );

  IF NEW.raw_user_meta_data->>'role' IS NOT NULL AND (NEW.raw_user_meta_data->>'role') <> '' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'role');
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Row already exists (e.g. trigger ran twice or client also inserted)
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
