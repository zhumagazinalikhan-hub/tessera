alter table public.profiles
  add column wallpaper_enabled boolean not null default false,
  add column wallpaper_token text;
