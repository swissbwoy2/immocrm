do $$
declare res text;
begin
  select public.__oneoff_reset_pwd('315ba171-c230-406f-acaa-75326ce5b5ea','remi.martinent@hotmail.fr','Rémi') into res;
  raise notice 'result %', res;
end $$;
drop function if exists public.__oneoff_reset_pwd(uuid, text, text);