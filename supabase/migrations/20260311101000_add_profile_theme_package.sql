ALTER TABLE public.zcasher
ADD COLUMN IF NOT EXISTS profile_theme_package text;

DO $$
BEGIN
  ALTER TABLE public.zcasher
  ADD CONSTRAINT zcasher_profile_theme_package_check
  CHECK (
    profile_theme_package IS NULL
    OR profile_theme_package = 'maxi_theme'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

UPDATE public.zcasher
SET
  profile_theme_package = 'maxi_theme',
  profile_card_theme = NULL,
  profile_page_bkgd = NULL,
  profile_card_border = NULL
WHERE LOWER(COALESCE(is_maxi::text, '')) IN ('true', 't', '1', 'yes', 'y');
