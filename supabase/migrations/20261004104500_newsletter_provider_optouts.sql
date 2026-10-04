-- Preserve the provider origin of opt-outs; this value is emitted by the existing sync RPC.
alter table public.email_unsubscribes drop constraint email_unsubscribes_source_check;
alter table public.email_unsubscribes add constraint email_unsubscribes_source_check
  check (source in ('link','manual','bounce','complaint','infomaniak_newsletter_sync'));
