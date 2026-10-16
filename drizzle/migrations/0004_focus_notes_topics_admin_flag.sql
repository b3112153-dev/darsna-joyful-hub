alter type public.study_branch add value if not exists 'languages';
alter type public.study_branch add value if not exists 'business';
alter type public.study_branch add value if not exists 'engineering';

-- personal focus timer
create table public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  subject text not null default 'عام' check (char_length(subject) between 1 and 60),
  duration_seconds int not null check (duration_seconds between 60 and 14400),
  remaining_seconds int not null check (remaining_seconds >= 0),
  status text not null default 'running' check (status in ('running','paused','completed','cancelled')),
  ends_at timestamptz,
  studied_seconds int not null default 0 check (studied_seconds >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index focus_user_idx on public.focus_sessions(user_id, started_at desc);
create index focus_room_idx on public.focus_sessions(room_id, status);
grant select, insert, update on public.focus_sessions to authenticated;
grant all on public.focus_sessions to service_role;
alter table public.focus_sessions enable row level security;
create policy "focus readable" on public.focus_sessions for select to authenticated using (true);
create policy "focus insert own" on public.focus_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "focus update own" on public.focus_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.is_focusing(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.focus_sessions where user_id = _user_id
  and ((status = 'running' and ends_at > now()) or status = 'paused')) $$;

drop policy "send if not banned" on public.messages;
create policy "send if not banned and not focusing" on public.messages for insert to authenticated
  with check (auth.uid() = user_id and not public.is_banned(auth.uid()) and not public.is_focusing(auth.uid()));

-- admin flag for anonymous display
alter table public.messages add column from_admin boolean not null default false;
create or replace function public.set_from_admin()
returns trigger language plpgsql security definer set search_path = public
as $$ begin new.from_admin := public.has_role(new.user_id, 'admin'); return new; end; $$;
create trigger messages_from_admin before insert on public.messages for each row execute function public.set_from_admin();

-- private notes
create table public.room_notes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  content text not null default '' check (char_length(content) <= 10000),
  updated_at timestamptz not null default now(),
  primary key (user_id, room_id)
);
grant select, insert, update, delete on public.room_notes to authenticated;
grant all on public.room_notes to service_role;
alter table public.room_notes enable row level security;
create policy "notes own" on public.room_notes for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- topics
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 150),
  body text not null check (char_length(body) between 1 and 10000),
  subject text,
  allow_replies boolean not null default true,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.topics to authenticated;
grant all on public.topics to service_role;
alter table public.topics enable row level security;
create policy "topics readable" on public.topics for select to authenticated using (true);
create policy "topics admin insert" on public.topics for insert to authenticated with check (public.has_role(auth.uid(),'admin') and created_by = auth.uid());
create policy "topics admin update" on public.topics for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "topics admin delete" on public.topics for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.topic_reads (
  topic_id uuid not null references public.topics(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (topic_id, user_id)
);
grant select, insert on public.topic_reads to authenticated;
grant all on public.topic_reads to service_role;
alter table public.topic_reads enable row level security;
create policy "reads own" on public.topic_reads for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "reads insert own" on public.topic_reads for insert to authenticated with check (auth.uid() = user_id);

create table public.topic_comments (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  parent_id uuid references public.topic_comments(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  from_admin boolean not null default false,
  created_at timestamptz not null default now()
);
create index topic_comments_topic_idx on public.topic_comments(topic_id, created_at);
grant select, insert, delete on public.topic_comments to authenticated;
grant all on public.topic_comments to service_role;
alter table public.topic_comments enable row level security;
create policy "comments readable" on public.topic_comments for select to authenticated using (true);
create policy "comments insert" on public.topic_comments for insert to authenticated with check (
  auth.uid() = user_id and not public.is_banned(auth.uid()) and (
    public.has_role(auth.uid(),'admin') or (
      exists (select 1 from public.topic_reads r where r.topic_id = topic_comments.topic_id and r.user_id = auth.uid())
      and (parent_id is null or exists (select 1 from public.topics t where t.id = topic_comments.topic_id and t.allow_replies))
    )
  ));
create policy "comments delete own or staff" on public.topic_comments for delete to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create trigger topic_comments_from_admin before insert on public.topic_comments for each row execute function public.set_from_admin();

alter publication supabase_realtime add table public.focus_sessions;
alter publication supabase_realtime add table public.topic_comments;