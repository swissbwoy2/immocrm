begin;
create table public.communication_receipts (
 event_id text primary key,provider text not null,message_id text not null,recipient text,
 event_type text not null,occurred_at timestamptz not null,url text,created_at timestamptz not null default now()
);
create index communication_receipts_message on public.communication_receipts(provider,message_id);
alter table public.communication_receipts enable row level security;
create policy communication_receipts_service on public.communication_receipts for all to service_role using(true) with check(true);
create function public.communication_apply_receipt(p_event_id text) returns void language plpgsql security definer set search_path='' as $$
declare r public.communication_receipts; l record; inserted uuid;
begin
 select * into r from public.communication_receipts where event_id=p_event_id;
 if not found or r.event_type not in ('delivered','bounced','complained','unsubscribed','delayed','failed') then return; end if;
 for l in select id from public.lead_email_logs where tracking_provider=r.provider and provider_message_id=r.message_id and (r.recipient is null or lower(recipient_email)=lower(r.recipient)) loop
  inserted=null;
  insert into public.communication_events(source_id,event_type,occurred_at,provider,external_id,url)
  values('email:'||l.id,r.event_type,r.occurred_at,r.provider,r.event_id||':'||l.id,r.url)
  on conflict(external_id) do nothing returning id into inserted;
  if inserted is not null then
   update public.lead_email_logs set
    delivery_status=case when delivery_status_at is null or delivery_status_at<=r.occurred_at then r.event_type else delivery_status end,
    delivery_status_at=greatest(delivery_status_at,r.occurred_at),
    delivery_confirmed_at=case when r.event_type='delivered' then least(delivery_confirmed_at,r.occurred_at) else delivery_confirmed_at end,
    bounced_at=case when r.event_type='bounced' then least(bounced_at,r.occurred_at) else bounced_at end,
    complained_at=case when r.event_type='complained' then least(complained_at,r.occurred_at) else complained_at end
   where id=l.id;
  end if;
 end loop;
end $$;
create function public.communication_receipt(p_event_id text,p_provider text,p_message_id text,p_recipient text,p_type text,p_at timestamptz) returns void language plpgsql security definer set search_path='' as $$
begin
 if p_type not in ('delivered','bounced','complained','unsubscribed','delayed','failed') or p_at>now()+interval '1 day' then raise exception 'Événement invalide'; end if;
 insert into public.communication_receipts(event_id,provider,message_id,recipient,event_type,occurred_at)
 values(p_event_id,p_provider,p_message_id,p_recipient,p_type,p_at) on conflict do nothing;
 perform public.communication_apply_receipt(p_event_id);
end $$;
create function public.communication_reconcile_receipts() returns trigger language plpgsql security definer set search_path='' as $$
declare r record;
begin
 if new.provider_message_id is null then return new; end if;
 if tg_op='UPDATE' and new.provider_message_id is not distinct from old.provider_message_id then return new; end if;
 for r in select event_id from public.communication_receipts where provider=new.tracking_provider and message_id=new.provider_message_id loop
  perform public.communication_apply_receipt(r.event_id);
 end loop;
 return new;
end $$;
create trigger communication_reconcile_receipts after insert or update of provider_message_id on public.lead_email_logs for each row execute function public.communication_reconcile_receipts();
create function public.communication_webhook_secret(p_secret text default null) returns text language plpgsql security definer set search_path='' as $$
declare sid uuid; value text;
begin
 select id,decrypted_secret into sid,value from vault.decrypted_secrets where name='communication_resend_webhook';
 if p_secret is not null then
  if p_secret not like 'whsec_%' then raise exception 'Secret invalide'; end if;
  if sid is null then perform vault.create_secret(p_secret,'communication_resend_webhook'); else perform vault.update_secret(sid,p_secret); end if;
  return null;
 end if;
 return value;
end $$;
revoke all on function public.communication_apply_receipt(text),public.communication_receipt(text,text,text,text,text,timestamptz),public.communication_reconcile_receipts(),public.communication_webhook_secret(text) from public,anon,authenticated;
grant execute on function public.communication_receipt(text,text,text,text,text,timestamptz),public.communication_webhook_secret(text) to service_role;
commit;
