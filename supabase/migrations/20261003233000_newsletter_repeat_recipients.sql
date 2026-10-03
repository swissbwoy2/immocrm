-- Each message has its own unsubscribe token. Keeping old tokens valid lets
-- recipients unsubscribe from any previously received message.
-- Uniqueness belongs to the token, not to the recipient's email address.
alter table public.email_unsubscribe_tokens
  drop constraint if exists email_unsubscribe_tokens_email_key;

create index if not exists email_unsubscribe_tokens_email_idx
  on public.email_unsubscribe_tokens(email);
