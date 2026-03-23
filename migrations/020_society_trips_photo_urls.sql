-- Migration: Multiple photos per society trip (JSON array of public URLs)

ALTER TABLE public.society_trips ADD COLUMN IF NOT EXISTS photo_urls jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.society_trips
SET photo_urls = to_jsonb(ARRAY[photo_url])
WHERE photo_url IS NOT NULL;

ALTER TABLE public.society_trips DROP COLUMN IF EXISTS photo_url;
