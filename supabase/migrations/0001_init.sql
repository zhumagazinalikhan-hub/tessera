-- Tessera schema: tasks + habits + Min · 100% · Max levels.
-- Every row belongs to one user; row-level security keeps it private.

create type public.level as enum ('min', 'target', 'max');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  weekly_capacity_h numeric not null default 30,
  work_start text not null default '09:00',
  work_end text not null default '17:00',
  focus_window text not null default 'morning' check (focus_window in ('morning', 'afternoon')),
  default_level public.level not null default 'target',
  theme text not null default 'light' check (theme in ('light', 'dark', 'auto')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  urgent boolean not null default false,
  important boolean not null default false,
  kind text not null default 'deep' check (kind in ('deep', 'routine')),
  estimate_min integer not null default 60 check (estimate_min >= 0),
  due_date date,
  status text not null default 'open' check (status in ('open', 'done', 'dropped', 'delegated')),
  delegated_to text,
  today_date date,
  today_order integer,
  min_note text,
  done_level public.level,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index tasks_user_idx on public.tasks (user_id, status);

create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  cue text not null default '',
  remind_at text,
  min_label text not null,
  target_label text not null,
  max_label text not null,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.habit_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  level public.level not null,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, date)
);

create table public.day_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date not null,
  energy text check (energy in ('low', 'normal', 'high')),
  level public.level not null default 'target',
  unique (user_id, date)
);

create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  started_at timestamptz not null,
  planned_min integer not null,
  actual_min integer not null,
  level public.level,
  created_at timestamptz not null default now()
);

create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week_start date not null,
  slipped_reason text,
  change_note text,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Row-level security: each user sees and changes only their own rows.
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.habits enable row level security;
alter table public.habit_checkins enable row level security;
alter table public.day_logs enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.weekly_reviews enable row level security;

create policy "own profile" on public.profiles
  for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

do $$
declare t text;
begin
  foreach t in array array['tasks', 'habits', 'habit_checkins', 'day_logs', 'focus_sessions', 'weekly_reviews']
  loop
    execute format(
      'create policy "own rows" on public.%I for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)',
      t
    );
  end loop;
end $$;

-- A check-in must point at the user's own habit.
create or replace function public.checkin_owns_habit() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.habits h where h.id = new.habit_id and h.user_id = new.user_id) then
    raise exception 'habit does not belong to user';
  end if;
  return new;
end $$;
create trigger checkin_owns_habit before insert or update on public.habit_checkins
  for each row execute function public.checkin_owns_habit();

-- Create a profile row when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
