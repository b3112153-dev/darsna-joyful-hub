create type public.app_role as enum ('admin','moderator','user');
create type public.study_branch as enum ('scientific','literary','industrial','it','health','agricultural','home_economics','hospitality');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'طالب',
  avatar_url text,
  branch public.study_branch,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select, insert, delete on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create table public.user_bans (
  user_id uuid primary key,
  reason text,
  banned_by uuid,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.user_bans to authenticated;
grant all on public.user_bans to service_role;
alter table public.user_bans enable row level security;

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  description text,
  branch public.study_branch,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_room_created_idx on public.messages(room_id, created_at desc);
grant select, insert, delete on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;

create or replace function public.is_staff(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role in ('admin','moderator')) $$;

create or replace function public.is_banned(_user_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_bans where user_id = _user_id) $$;

-- profiles
create policy "profiles readable by signed-in" on public.profiles for select to authenticated using (true);
create policy "own profile insert" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- roles
create policy "read own roles or admin" on public.user_roles for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "admin add roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin remove roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(),'admin') and user_id <> auth.uid());

-- bans
create policy "read own ban or staff" on public.user_bans for select to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create policy "staff ban" on public.user_bans for insert to authenticated with check (public.is_staff(auth.uid()) and user_id <> auth.uid() and not public.has_role(user_id,'admin'));
create policy "staff unban" on public.user_bans for delete to authenticated using (public.is_staff(auth.uid()));

-- rooms
create policy "rooms readable" on public.rooms for select to authenticated using (true);
create policy "admin create rooms" on public.rooms for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update rooms" on public.rooms for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete rooms" on public.rooms for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- messages
create policy "messages readable" on public.messages for select to authenticated using (true);
create policy "send if not banned" on public.messages for insert to authenticated with check (auth.uid() = user_id and not public.is_banned(auth.uid()));
create policy "delete own or staff" on public.messages for delete to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));

-- signup trigger: profile + role (first user becomes admin)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url');
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter publication supabase_realtime add table public.messages;
alter table public.messages replica identity full;

insert into public.rooms (name, description, branch) values
('الفرع العلمي', 'نقاشات الرياضيات والفيزياء والكيمياء والأحياء', 'scientific'),
('الفرع الأدبي', 'التاريخ والجغرافيا والثقافة الإسلامية والأدب', 'literary'),
('الفرع الصناعي', 'المواد المهنية والعلوم الصناعية', 'industrial'),
('فرع تكنولوجيا المعلومات', 'البرمجة والشبكات وأنظمة الحاسوب', 'it'),
('الفرع الصحي', 'العلوم الصحية والتمريض', 'health'),
('الفرع الزراعي', 'العلوم الزراعية والإنتاج', 'agricultural'),
('الاقتصاد المنزلي', 'مواد الاقتصاد المنزلي', 'home_economics'),
('الفندقي والسياحي', 'الإدارة الفندقية والسياحة', 'hospitality'),
('الساحة العامة', 'غرفة مشتركة لجميع طلاب التوجيهي', null);