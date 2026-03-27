-- Testbruker: test@torget.no / Test1234!
-- Kjør dette i Supabase SQL Editor

DO $$
DECLARE
  v_user_id uuid := gen_random_uuid();
BEGIN
  -- Opprett bruker i auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000',
    'test@torget.no',
    crypt('Test1234!', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  );

  -- Profil opprettes normalt via trigger, men seed den manuelt som fallback
  INSERT INTO public.profiles (id, display_name, city, created_at)
  VALUES (v_user_id, 'Testbruker', 'Oslo', now())
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Testbruker opprettet: test@torget.no / Test1234!';
END $$;
