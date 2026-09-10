ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS country text;

CREATE INDEX IF NOT EXISTS profiles_country_idx ON public.profiles(country);
CREATE INDEX IF NOT EXISTS profiles_dob_idx ON public.profiles(date_of_birth);

CREATE OR REPLACE FUNCTION public.validate_profile_age()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    IF NEW.date_of_birth > current_date THEN
      RAISE EXCEPTION 'date_of_birth cannot be in the future';
    END IF;
    IF NEW.date_of_birth > (current_date - interval '13 years') THEN
      RAISE EXCEPTION 'You must be at least 13 years old';
    END IF;
  END IF;
  IF NEW.country IS NOT NULL AND char_length(NEW.country) <> 2 THEN
    RAISE EXCEPTION 'country must be a 2-letter ISO code';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_profile_age_trg ON public.profiles;
CREATE TRIGGER validate_profile_age_trg
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_age();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, date_of_birth, country)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'display_name',''), 'Summoner'),
    NULLIF(NEW.raw_user_meta_data->>'date_of_birth','')::date,
    NULLIF(upper(NEW.raw_user_meta_data->>'country'),'')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();