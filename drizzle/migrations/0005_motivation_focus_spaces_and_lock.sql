-- Keep the four current chat branches and the shared room available.
insert into public.rooms (name, description, branch)
select 'غرفة الأعمال', 'نقاشات طلاب مسار الأعمال.', 'business'
where not exists (select 1 from public.rooms where branch = 'business');

insert into public.rooms (name, description, branch)
select 'غرفة اللغات', 'نقاشات طلاب مسار اللغات.', 'languages'
where not exists (select 1 from public.rooms where branch = 'languages');

insert into public.rooms (name, description, branch)
select 'غرفة الصحي', 'نقاشات طلاب المسار الصحي.', 'health'
where not exists (select 1 from public.rooms where branch = 'health');

insert into public.rooms (name, description, branch)
select 'غرفة الهندسي', 'نقاشات طلاب المسار الهندسي.', 'engineering'
where not exists (select 1 from public.rooms where branch = 'engineering');

insert into public.rooms (name, description, branch)
select 'غرفة تركيز الأعمال واللغات', 'جلسات تركيز وملاحظات خاصة لطلاب الأعمال واللغات.', 'business_languages'
where not exists (select 1 from public.rooms where branch = 'business_languages');

insert into public.rooms (name, description, branch)
select 'غرفة تركيز الصحي والهندسي', 'جلسات تركيز وملاحظات خاصة لطلاب الصحي والهندسي.', 'health_engineering'
where not exists (select 1 from public.rooms where branch = 'health_engineering');

alter table public.library_files
add column file_category text not null default 'study_file'
check (file_category in ('question_bank', 'study_file'));

-- Resume any previously paused timers so their remaining time can finish normally.
update public.focus_sessions
set status = 'running',
    ends_at = now() + make_interval(secs => remaining_seconds)
where status = 'paused' and remaining_seconds > 0;

update public.focus_sessions
set status = 'completed',
    remaining_seconds = 0,
    studied_seconds = duration_seconds,
    finished_at = coalesce(finished_at, now()),
    ends_at = null
where status = 'paused' and remaining_seconds = 0;

-- Start times are set by the database, not trusted from the browser.
create or replace function public.initialize_focus_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() = new.user_id then
    new.status := 'running';
    new.started_at := now();
    new.remaining_seconds := new.duration_seconds;
    new.studied_seconds := 0;
    new.ends_at := now() + make_interval(secs => new.duration_seconds);
    new.finished_at := null;
  end if;
  return new;
end;
$$;

create trigger focus_sessions_initialize
before insert on public.focus_sessions
for each row execute function public.initialize_focus_session();

-- Students cannot pause or cancel a timer to regain chat access early.
create or replace function public.finish_focus_session_after_end()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() <> old.user_id then
    return new;
  end if;

  if old.status <> 'running' or old.ends_at is null or old.ends_at > now() then
    raise exception 'The focus session cannot be changed before its timer ends';
  end if;

  if new.id is distinct from old.id
    or new.user_id is distinct from old.user_id
    or new.room_id is distinct from old.room_id
    or new.subject is distinct from old.subject
    or new.duration_seconds is distinct from old.duration_seconds
    or new.started_at is distinct from old.started_at
    or new.ends_at is distinct from old.ends_at
    or new.status <> 'completed'
    or new.remaining_seconds <> 0
    or new.studied_seconds <> old.duration_seconds
    or new.finished_at is null then
    raise exception 'Only a completed focus session may be saved';
  end if;

  return new;
end;
$$;

create trigger focus_sessions_finish_after_end
before update on public.focus_sessions
for each row execute function public.finish_focus_session_after_end();

drop policy if exists "focus update own" on public.focus_sessions;
create policy "focus complete own after timer" on public.focus_sessions
for update to authenticated
using (auth.uid() = user_id and status = 'running' and ends_at <= now())
with check (auth.uid() = user_id and status = 'completed' and remaining_seconds = 0 and ends_at <= now());

create or replace function public.is_focusing(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.focus_sessions
    where user_id = _user_id
      and status = 'running'
      and ends_at > now()
  )
$$;

drop policy if exists "focus insert own" on public.focus_sessions;
create policy "focus insert own when no active session" on public.focus_sessions
for insert to authenticated
with check (auth.uid() = user_id and not public.is_banned(auth.uid()) and not public.is_focusing(auth.uid()));

-- Focused students cannot read message history or subscribe to chat contents.
drop policy if exists "messages readable" on public.messages;
create policy "messages readable when chat is unlocked" on public.messages
for select to authenticated
using (not public.is_focusing(auth.uid()));

drop policy if exists "delete own or staff" on public.messages;
create policy "delete own or staff when chat is unlocked" on public.messages
for delete to authenticated
using (
  (auth.uid() = user_id or public.is_staff(auth.uid()))
  and not public.is_focusing(auth.uid())
);

-- A private image bucket: signed-in students can view posts; each person can upload only to their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('motivation', 'motivation', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.motivation_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  caption text not null check (char_length(caption) between 1 and 500),
  image_path text,
  created_at timestamptz not null default now()
);
create index motivation_posts_created_idx on public.motivation_posts(created_at desc);
grant select, insert, delete on public.motivation_posts to authenticated;
grant all on public.motivation_posts to service_role;
alter table public.motivation_posts enable row level security;

create policy "motivation posts readable by signed-in" on public.motivation_posts
for select to authenticated using (true);
create policy "students add own motivation posts" on public.motivation_posts
for insert to authenticated
with check (
  auth.uid() = user_id
  and not public.is_banned(auth.uid())
  and (image_path is null or (storage.foldername(image_path))[1] = auth.uid()::text)
);
create policy "delete own motivation posts or staff" on public.motivation_posts
for delete to authenticated
using (auth.uid() = user_id or public.is_staff(auth.uid()));

create policy "motivation images readable by signed-in" on storage.objects
for select to authenticated
using (bucket_id = 'motivation');
create policy "students upload own motivation images" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'motivation'
  and (storage.foldername(name))[1] = auth.uid()::text
  and not public.is_banned(auth.uid())
);
create policy "delete own motivation images or staff" on storage.objects
for delete to authenticated
using (
  bucket_id = 'motivation'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid()))
);

alter publication supabase_realtime add table public.motivation_posts;
