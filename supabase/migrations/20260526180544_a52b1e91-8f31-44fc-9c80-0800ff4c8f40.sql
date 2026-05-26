insert into storage.buckets (id, name, public) values ('email-assets', 'email-assets', true) on conflict (id) do update set public = true;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Public read email-assets') then
    create policy "Public read email-assets" on storage.objects for select using (bucket_id = 'email-assets');
  end if;
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Admins manage email-assets') then
    create policy "Admins manage email-assets" on storage.objects for all to authenticated using (bucket_id = 'email-assets' and has_role(auth.uid(), 'admin'::app_role)) with check (bucket_id = 'email-assets' and has_role(auth.uid(), 'admin'::app_role));
  end if;
end $$;