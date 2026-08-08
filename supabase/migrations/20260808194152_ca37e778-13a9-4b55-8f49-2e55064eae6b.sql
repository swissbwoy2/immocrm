create or replace function public.__oneoff_reset_pwd(_user_id uuid, _email text, _prenom text)
returns text
language plpgsql
security definer
set search_path = public, vault, extensions
as $$
declare k text; pw text; meta jsonb; r1 bigint; r2 bigint;
begin
  select decrypted_secret into k from vault.decrypted_secrets where name='email_queue_service_role_key';
  if k is null then return 'no key'; end if;
  select coalesce(raw_user_meta_data,'{}'::jsonb) into meta from auth.users where id=_user_id;
  pw := 'Lg'||replace(replace(substr(encode(gen_random_bytes(12),'base64'),1,12),'/','x'),'+','y')||'9!';
  select net.http_post(
    url:='https://ydljsdscdnqrqnjvqela.supabase.co/auth/v1/admin/users/'||_user_id::text,
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k,'apikey',k),
    body:=jsonb_build_object('password',pw,'email_confirm',true,'user_metadata',meta||jsonb_build_object('must_change_password',true))
  ) into r1;
  perform pg_sleep(2);
  select net.http_post(
    url:='https://ydljsdscdnqrqnjvqela.supabase.co/functions/v1/send-transactional-email',
    headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||k,'apikey',k),
    body:=jsonb_build_object(
      'templateName','client-credentials',
      'recipientEmail',_email,
      'idempotencyKey','client-credentials-'||_email||'-'||extract(epoch from now())::bigint,
      'templateData',jsonb_build_object('siteUrl','https://logisorama.ch','recipient',_email,'tempPassword',pw,'prenom',_prenom))
  ) into r2;
  return r1::text||','||r2::text;
end;
$$;