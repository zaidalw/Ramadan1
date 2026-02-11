-- Ramadan Daily Challenge (Arabic-first) schema for Supabase
-- All group data is private via RLS. Answer key is stored separately and is supervisor-only.

create extension if not exists pgcrypto;

-- ---------- Types ----------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'group_role') then
    create type public.group_role as enum ('supervisor', 'player');
  end if;
end$$;

-- ---------- Profiles ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  active_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: user can read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles: user can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------- Groups ----------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique,
  start_date date not null,
  timezone text not null default 'America/Chicago',
  cutoff_time time not null default '23:59:00',
  max_players int not null default 20,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.groups enable row level security;

-- ---------- Membership ----------

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.group_role not null,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_members enable row level security;

-- ---------- Day Templates (seeded once, private) ----------

create table if not exists public.day_templates (
  day_number int primary key check (day_number between 1 and 30),
  hadith_text text not null,
  fiqh_statement_text text not null,
  impact_task_text text not null,
  correct_answer boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.day_templates enable row level security;
-- No policies: only service_role (bypasses RLS) and SECURITY DEFINER functions can access.

-- ---------- Group Day Content (players can read, supervisors can edit) ----------

create table if not exists public.group_day_contents (
  group_id uuid not null references public.groups(id) on delete cascade,
  day_number int not null check (day_number between 1 and 30),
  hadith_text text not null,
  fiqh_statement_text text not null,
  impact_task_text text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (group_id, day_number)
);

alter table public.group_day_contents enable row level security;

-- ---------- Group Answer Key (supervisor-only) ----------

create table if not exists public.group_day_answer_keys (
  group_id uuid not null references public.groups(id) on delete cascade,
  day_number int not null check (day_number between 1 and 30),
  correct_answer boolean not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  primary key (group_id, day_number)
);

alter table public.group_day_answer_keys enable row level security;

-- ---------- "Post Today" ----------

create table if not exists public.day_posts (
  group_id uuid not null references public.groups(id) on delete cascade,
  day_number int not null check (day_number between 1 and 30),
  posted_at timestamptz not null default now(),
  posted_by uuid not null references auth.users(id) on delete restrict,
  primary key (group_id, day_number)
);

alter table public.day_posts enable row level security;

-- ---------- Submissions ----------

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  day_number int not null check (day_number between 1 and 30),

  quran_points int not null default 0 check (quran_points between 0 and 3),
  hadith_points int not null default 0 check (hadith_points between 0 and 3),
  fiqh_answer boolean not null,
  impact_done boolean not null default false,

  fiqh_points int not null default 0 check (fiqh_points between 0 and 2),
  impact_points int not null default 0 check (impact_points between 0 and 2),
  auto_total int not null default 0 check (auto_total between 0 and 10),
  override_total int check (override_total between 0 and 10),
  total_points int not null default 0 check (total_points between 0 and 10),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (group_id, user_id, day_number)
);

alter table public.submissions enable row level security;

-- ---------- Overrides Log ----------

create table if not exists public.score_overrides (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  supervisor_id uuid not null references auth.users(id) on delete restrict,
  previous_override_total int,
  new_override_total int,
  previous_total_points int not null,
  new_total_points int not null,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.score_overrides enable row level security;

-- ---------- Helper Functions ----------

create or replace function public.is_group_member(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = _group_id
      and gm.user_id = auth.uid()
  );
$$;

create or replace function public.is_supervisor(_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = _group_id
      and gm.user_id = auth.uid()
      and gm.role = 'supervisor'
  );
$$;

create or replace function public.guard_group_members_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Prevent role escalation by regular players.
  if new.role is distinct from old.role then
    if not public.is_supervisor(old.group_id) then
      raise exception 'Not allowed to change role';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists group_members_guard on public.group_members;
create trigger group_members_guard
before update on public.group_members
for each row execute function public.guard_group_members_update();

create or replace function public.group_day_date(_group_id uuid, _day_number int)
returns date
language plpgsql
stable
as $$
declare
  g record;
begin
  select start_date into g from public.groups where id = _group_id;
  if not found then
    return null;
  end if;
  return g.start_date + (_day_number - 1);
end;
$$;

create or replace function public.is_submission_editable(_group_id uuid, _day_number int)
returns boolean
language plpgsql
stable
as $$
declare
  g record;
  day_date date;
  local_now timestamp;
  local_today date;
  cutoff_ts timestamptz;
begin
  select start_date, cutoff_time, timezone into g
  from public.groups
  where id = _group_id;

  if not found then
    return false;
  end if;

  day_date := g.start_date + (_day_number - 1);
  local_now := (now() at time zone g.timezone);
  local_today := local_now::date;

  -- Prevent submitting future days.
  if day_date > local_today then
    return false;
  end if;

  cutoff_ts := ((day_date::timestamp + g.cutoff_time) at time zone g.timezone);
  return now() < cutoff_ts;
end;
$$;

create or replace function public.generate_invite_code(_length int default 7)
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := gen_random_bytes(_length);
  result text := '';
  i int;
  idx int;
begin
  for i in 0..(_length - 1) loop
    idx := get_byte(bytes, i) % length(chars);
    result := result || substr(chars, idx + 1, 1);
  end loop;
  return result;
end;
$$;

-- Create group + seed its 30-day content from day_templates.
create or replace function public.create_group(
  _group_name text,
  _display_name text,
  _start_date date default null,
  _timezone text default 'America/Chicago',
  _cutoff_time time default '23:59:00',
  _max_players int default 20
)
returns table (group_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  g_id uuid;
  code text;
  start_date date;
  template_count int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if _group_name is null or length(trim(_group_name)) = 0 then
    raise exception 'Group name is required';
  end if;
  if _display_name is null or length(trim(_display_name)) = 0 then
    raise exception 'Display name is required';
  end if;
  if _timezone is null or length(trim(_timezone)) = 0 then
    raise exception 'Timezone is required';
  end if;

  select count(*) into template_count
  from public.day_templates
  where day_number between 1 and 30;
  if template_count <> 30 then
    raise exception 'Day templates are not seeded (expected 30 rows)';
  end if;

  if _max_players < 2 or _max_players > 20 then
    raise exception 'max_players must be between 2 and 20';
  end if;

  start_date := coalesce(_start_date, (now() at time zone _timezone)::date);

  -- Generate a unique invite code.
  loop
    code := public.generate_invite_code(7);
    exit when not exists (select 1 from public.groups g where g.invite_code = code);
  end loop;

  insert into public.groups (name, invite_code, start_date, timezone, cutoff_time, max_players, created_by)
  values (trim(_group_name), code, start_date, trim(_timezone), _cutoff_time, _max_players, uid)
  returning id into g_id;

  insert into public.group_members (group_id, user_id, role, display_name)
  values (g_id, uid, 'supervisor', trim(_display_name));

  update public.profiles
  set active_group_id = g_id, updated_at = now()
  where id = uid;

  -- Seed group day content + answer key from templates.
  insert into public.group_day_contents (group_id, day_number, hadith_text, fiqh_statement_text, impact_task_text)
  select g_id, dt.day_number, dt.hadith_text, dt.fiqh_statement_text, dt.impact_task_text
  from public.day_templates dt;

  insert into public.group_day_answer_keys (group_id, day_number, correct_answer)
  select g_id, dt.day_number, dt.correct_answer
  from public.day_templates dt;

  group_id := g_id;
  invite_code := code;
  return next;
end;
$$;

-- Join group by invite code (player role).
create or replace function public.join_group(
  _invite_code text,
  _display_name text
)
returns table (group_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  g record;
  member_count int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if _invite_code is null or length(trim(_invite_code)) = 0 then
    raise exception 'Invite code is required';
  end if;
  if _display_name is null or length(trim(_display_name)) = 0 then
    raise exception 'Display name is required';
  end if;

  select id, max_players into g
  from public.groups
  where invite_code = upper(trim(_invite_code));

  if not found then
    raise exception 'Invite code not found';
  end if;

  select count(*) into member_count
  from public.group_members
  where group_id = g.id;

  if member_count >= g.max_players then
    raise exception 'Group is full';
  end if;

  insert into public.group_members (group_id, user_id, role, display_name)
  values (g.id, uid, 'player', trim(_display_name))
  on conflict (group_id, user_id) do update
    set display_name = excluded.display_name;

  update public.profiles
  set active_group_id = g.id, updated_at = now()
  where id = uid;

  group_id := g.id;
  return next;
end;
$$;

-- Override total points (supervisor-only), with reason and full audit log.
create or replace function public.override_submission(
  _submission_id uuid,
  _new_override_total int,
  _reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  s record;
  prev_total int;
  prev_override int;
  new_total int;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into s
  from public.submissions
  where id = _submission_id;

  if not found then
    raise exception 'Submission not found';
  end if;

  if not public.is_supervisor(s.group_id) then
    raise exception 'Not allowed';
  end if;

  if _reason is null or length(trim(_reason)) = 0 then
    raise exception 'Reason is required';
  end if;

  if _new_override_total is not null and (_new_override_total < 0 or _new_override_total > 10) then
    raise exception 'override_total must be between 0 and 10';
  end if;

  prev_total := s.total_points;
  prev_override := s.override_total;

  update public.submissions
  set override_total = _new_override_total,
      updated_at = now()
  where id = _submission_id;

  select total_points into new_total
  from public.submissions
  where id = _submission_id;

  insert into public.score_overrides (
    submission_id,
    group_id,
    supervisor_id,
    previous_override_total,
    new_override_total,
    previous_total_points,
    new_total_points,
    reason
  )
  values (
    _submission_id,
    s.group_id,
    uid,
    prev_override,
    _new_override_total,
    prev_total,
    new_total,
    _reason
  );
end;
$$;

-- Restrict RPC entrypoints to authenticated users only.
revoke all on function public.create_group(text, text, date, text, time, int) from public;
grant execute on function public.create_group(text, text, date, text, time, int) to authenticated;

revoke all on function public.join_group(text, text) from public;
grant execute on function public.join_group(text, text) to authenticated;

revoke all on function public.override_submission(uuid, int, text) from public;
grant execute on function public.override_submission(uuid, int, text) to authenticated;

-- ---------- Triggers ----------

create or replace function public.compute_submission_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  correct boolean;
  base_total int;
begin
  if new.quran_points < 0 or new.quran_points > 3 then
    raise exception 'quran_points must be between 0 and 3';
  end if;
  if new.hadith_points < 0 or new.hadith_points > 3 then
    raise exception 'hadith_points must be between 0 and 3';
  end if;
  if new.override_total is not null and (new.override_total < 0 or new.override_total > 10) then
    raise exception 'override_total must be between 0 and 10';
  end if;

  select gak.correct_answer into correct
  from public.group_day_answer_keys gak
  where gak.group_id = new.group_id
    and gak.day_number = new.day_number;

  if not found then
    raise exception 'Answer key missing for this group/day';
  end if;

  new.fiqh_points := case when new.fiqh_answer = correct then 2 else 0 end;
  new.impact_points := case when new.impact_done then 2 else 0 end;

  base_total := new.quran_points + new.hadith_points + new.fiqh_points + new.impact_points;
  new.auto_total := least(10, greatest(0, base_total));
  new.total_points := coalesce(new.override_total, new.auto_total);
  new.updated_at := now();

  if tg_op = 'INSERT' then
    new.created_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists submissions_compute_points on public.submissions;
create trigger submissions_compute_points
before insert or update on public.submissions
for each row execute function public.compute_submission_points();

-- ---------- RLS Policies ----------

create policy "groups: members can read group"
on public.groups for select
to authenticated
using (public.is_group_member(id));

create policy "groups: supervisor can update group settings"
on public.groups for update
to authenticated
using (public.is_supervisor(id))
with check (public.is_supervisor(id));

create policy "group_members: members can list members"
on public.group_members for select
to authenticated
using (public.is_group_member(group_id));

create policy "group_members: user can update own display name"
on public.group_members for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "group_members: supervisor can update members"
on public.group_members for update
to authenticated
using (public.is_supervisor(group_id))
with check (public.is_supervisor(group_id));

create policy "group_day_contents: members can read content"
on public.group_day_contents for select
to authenticated
using (public.is_group_member(group_id));

create policy "group_day_contents: supervisor can edit content"
on public.group_day_contents for insert
to authenticated
with check (public.is_supervisor(group_id));

create policy "group_day_contents: supervisor can update content"
on public.group_day_contents for update
to authenticated
using (public.is_supervisor(group_id))
with check (public.is_supervisor(group_id));

create policy "group_day_answer_keys: supervisor can read answer key"
on public.group_day_answer_keys for select
to authenticated
using (public.is_supervisor(group_id));

create policy "group_day_answer_keys: supervisor can edit answer key"
on public.group_day_answer_keys for insert
to authenticated
with check (public.is_supervisor(group_id));

create policy "group_day_answer_keys: supervisor can update answer key"
on public.group_day_answer_keys for update
to authenticated
using (public.is_supervisor(group_id))
with check (public.is_supervisor(group_id));

create policy "day_posts: members can read posts"
on public.day_posts for select
to authenticated
using (public.is_group_member(group_id));

create policy "day_posts: supervisor can post"
on public.day_posts for insert
to authenticated
with check (public.is_supervisor(group_id));

create policy "day_posts: supervisor can update post"
on public.day_posts for update
to authenticated
using (public.is_supervisor(group_id))
with check (public.is_supervisor(group_id));

create policy "submissions: members can read submissions"
on public.submissions for select
to authenticated
using (public.is_group_member(group_id));

create policy "submissions: player can insert own submission before cutoff"
on public.submissions for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and (
    public.is_supervisor(group_id)
    or (user_id = auth.uid() and public.is_submission_editable(group_id, day_number))
  )
);

create policy "submissions: player can update own submission before cutoff"
on public.submissions for update
to authenticated
using (
  public.is_group_member(group_id)
  and (
    public.is_supervisor(group_id)
    or (user_id = auth.uid() and public.is_submission_editable(group_id, day_number))
  )
)
with check (
  public.is_group_member(group_id)
  and (
    public.is_supervisor(group_id)
    or (user_id = auth.uid() and public.is_submission_editable(group_id, day_number))
  )
);

create policy "score_overrides: supervisor can read override log"
on public.score_overrides for select
to authenticated
using (public.is_supervisor(group_id));

-- No insert policy: only SECURITY DEFINER function inserts (bypasses).
