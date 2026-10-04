-- Prepare subscriber lists before the requested time. The worker enforces the future send time.
create or replace function public.newsletter_infomaniak_claim()
returns setof public.newsletters language plpgsql security definer set search_path = public as $$
begin
  update newsletters set dispatch_state='attention', worker_error='Résultat Infomaniak incertain : vérifier la campagne chez Infomaniak avant toute relance.'
  where status='queued' and provider='infomaniak' and dispatch_state='submitting' and dispatch_lease<now();
  update newsletter_deliveries d set status='attention',error=n.worker_error
  from newsletters n where d.newsletter_id=n.id and n.dispatch_state='attention' and d.status in ('pending','processing');
  return query with next as (
    select id from newsletters where status='queued' and provider='infomaniak' and scheduled_at<=now()+interval '24 hours'
      and dispatch_state='preparing' and dispatch_retry_at<=now() and (dispatch_lease is null or dispatch_lease<now())
    order by scheduled_at for update skip locked limit 1
  ) update newsletters n set dispatch_token=gen_random_uuid(), dispatch_lease=now()+interval '5 minutes'
    from next where n.id=next.id returning n.*;
end $$;

