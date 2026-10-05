ALTER TABLE public.user_credits DROP CONSTRAINT user_credits_mandat_statut_check;
ALTER TABLE public.user_credits ADD CONSTRAINT user_credits_mandat_statut_check CHECK (mandat_statut = ANY (ARRAY['actif','suspendu','resilie','essai','aucun','expire']));
ALTER TABLE public.user_credits ALTER COLUMN coins_mandat SET DEFAULT 0;
ALTER TABLE public.user_credits ALTER COLUMN mandat_statut SET DEFAULT 'aucun';

CREATE OR REPLACE FUNCTION public.grant_credits_on_role()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if NEW.role in ('candidat','client') then
    insert into public.user_credits(user_id, coins_mandat, mandat_statut)
    values (NEW.user_id, 0, 'aucun') on conflict (user_id) do nothing;
  end if;
  return NEW;
end $function$;

CREATE OR REPLACE FUNCTION public.credits_on_trial_activation()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(OLD.actif, false) = false AND NEW.actif = true THEN
    INSERT INTO public.user_credits(user_id, coins_mandat, mandat_statut, derniere_decrementation)
    VALUES (NEW.id, 90, 'actif', current_date)
    ON CONFLICT (user_id) DO UPDATE SET coins_mandat = 90, mandat_statut = 'actif', derniere_decrementation = current_date;
  END IF;
  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.decrement_mandat_coins_daily()
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare n integer;
begin
  update public.user_credits uc
     set coins_mandat = 0, mandat_statut = 'expire', derniere_decrementation = current_date
    from public.profiles p
   where p.id = uc.user_id and uc.mandat_statut = 'essai'
     and (p.trial_started_at is null or p.trial_started_at + interval '3 days' <= now());

  update public.user_credits uc
     set coins_mandat = case when uc.coins_mandat - 1 <= 0 then 90 else uc.coins_mandat - 1 end,
         derniere_decrementation = current_date
   where uc.mandat_statut = 'actif' and uc.coins_mandat > 0
     and (uc.derniere_decrementation is null or uc.derniere_decrementation < current_date)
     and exists (select 1 from public.clients cl where cl.user_id = uc.user_id and cl.statut = 'actif');
  get diagnostics n = row_count; return n;
end $function$;

UPDATE public.user_credits uc SET coins_mandat = 0, mandat_statut = 'aucun', updated_at = now()
  FROM public.profiles p
 WHERE p.id = uc.user_id AND uc.mandat_statut = 'actif' AND coalesce(p.actif, false) = false
   AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id = uc.user_id AND c.mandat_date_signature IS NOT NULL)
   AND NOT EXISTS (SELECT 1 FROM public.clients c JOIN public.offres o ON o.client_id = c.id WHERE c.user_id = uc.user_id)
   AND NOT EXISTS (SELECT 1 FROM public.clients c JOIN public.visites v ON v.client_id = c.id WHERE c.user_id = uc.user_id);

SELECT set_config('app.trial_rpc', 'on', true);
UPDATE public.profiles SET trial_started_at = now()
 WHERE lower(email) IN ('rosmaranou@gmail.com','leticiavilanova2004@gmail.com','nay.leandro555@gmail.com','marisilvafigueiredo18@gmail.com','francisco.matias-pro@outlook.com');
SELECT set_config('app.trial_rpc', 'off', true);
UPDATE public.user_credits uc SET coins_mandat = 3, mandat_statut = 'essai', derniere_decrementation = current_date, updated_at = now()
  FROM public.profiles p
 WHERE p.id = uc.user_id AND lower(p.email) IN ('rosmaranou@gmail.com','leticiavilanova2004@gmail.com','nay.leandro555@gmail.com','marisilvafigueiredo18@gmail.com','francisco.matias-pro@outlook.com');

UPDATE public.user_credits uc SET coins_mandat = 0, mandat_statut = 'suspendu', updated_at = now()
  FROM public.profiles p WHERE p.id = uc.user_id AND lower(p.email) = 'allysonpedro05@gmail.com';
UPDATE public.user_credits uc SET coins_mandat = 41, mandat_statut = 'actif', derniere_decrementation = current_date, updated_at = now()
  FROM public.profiles p WHERE p.id = uc.user_id AND lower(p.email) = 'yassineafrah242@gmail.com';
UPDATE public.user_credits uc SET coins_mandat = 69, mandat_statut = 'actif', derniere_decrementation = current_date, updated_at = now()
  FROM public.profiles p WHERE p.id = uc.user_id AND lower(p.email) = 'christellemiere@hotmail.fr';