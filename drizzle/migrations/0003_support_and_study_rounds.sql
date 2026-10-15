create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index support_messages_student_idx on public.support_messages(student_id, created_at);
grant select, insert, delete on public.support_messages to authenticated;
grant all on public.support_messages to service_role;
alter table public.support_messages enable row level security;
create policy "support read own or admin" on public.support_messages for select to authenticated
  using (auth.uid() = student_id or public.has_role(auth.uid(),'admin'));
create policy "support send" on public.support_messages for insert to authenticated
  with check (auth.uid() = sender_id and (auth.uid() = student_id or public.has_role(auth.uid(),'admin')));
create policy "support admin delete" on public.support_messages for delete to authenticated
  using (public.has_role(auth.uid(),'admin'));

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  starts_at timestamptz not null default now(),
  duration_minutes int not null check (duration_minutes between 5 and 240),
  created_at timestamptz not null default now()
);
create index study_sessions_room_idx on public.study_sessions(room_id, starts_at);
grant select, insert, delete on public.study_sessions to authenticated;
grant all on public.study_sessions to service_role;
alter table public.study_sessions enable row level security;
create policy "sessions readable" on public.study_sessions for select to authenticated using (true);
create policy "sessions create" on public.study_sessions for insert to authenticated
  with check (auth.uid() = created_by and not public.is_banned(auth.uid()));
create policy "sessions delete own or staff" on public.study_sessions for delete to authenticated
  using (auth.uid() = created_by or public.is_staff(auth.uid()));

create table public.session_participants (
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (session_id, user_id)
);
grant select, insert, delete on public.session_participants to authenticated;
grant all on public.session_participants to service_role;
alter table public.session_participants enable row level security;
create policy "participants readable" on public.session_participants for select to authenticated using (true);
create policy "join self" on public.session_participants for insert to authenticated
  with check (auth.uid() = user_id and not public.is_banned(auth.uid()));
create policy "leave self" on public.session_participants for delete to authenticated using (auth.uid() = user_id);

alter publication supabase_realtime add table public.support_messages;
alter publication supabase_realtime add table public.study_sessions;
alter publication supabase_realtime add table public.session_participants;