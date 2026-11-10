-- Ayah of the day on the Today screen.
alter table public.profiles
  add column show_ayah boolean not null default true,
  add column ayah_lang text not null default 'en' check (ayah_lang in ('en', 'ru'));
