-- Restore agent auth user
UPDATE auth.users
SET email = 'christ.ramazani@immo-rama.ch',
    banned_until = NULL,
    deleted_at = NULL,
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    encrypted_password = crypt('Agent123!', gen_salt('bf')),
    updated_at = now()
WHERE id = '68237b53-8d73-4ce5-b97c-8c1cac09646b';

-- Restore identity email
UPDATE auth.identities
SET identity_data = jsonb_set(
      jsonb_set(COALESCE(identity_data, '{}'::jsonb), '{email}', '"christ.ramazani@immo-rama.ch"'),
      '{email_verified}', 'true'::jsonb
    ),
    updated_at = now()
WHERE user_id = '68237b53-8d73-4ce5-b97c-8c1cac09646b';

-- Re-create agent role
INSERT INTO public.user_roles (user_id, role)
VALUES ('68237b53-8d73-4ce5-b97c-8c1cac09646b', 'agent')
ON CONFLICT (user_id, role) DO NOTHING;

-- Ensure profile email + actif
UPDATE public.profiles
SET email = 'christ.ramazani@immo-rama.ch', actif = true, updated_at = now()
WHERE id = '68237b53-8d73-4ce5-b97c-8c1cac09646b';

-- Ensure agent active
UPDATE public.agents
SET statut = 'actif', updated_at = now()
WHERE user_id = '68237b53-8d73-4ce5-b97c-8c1cac09646b';