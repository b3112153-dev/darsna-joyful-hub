alter table public.rooms add column kind text not null default 'chat' check (kind in ('chat','focus'));

create table public.motivation_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text check (char_length(content) <= 1000),
  image_path text,
  from_admin boolean not null default false,
  created_at timestamptz not null default now(),
  check (content is not null or image_path is not null)
);
create index motivation_created_idx on public.motivation_posts(created_at desc);
grant select, insert, delete on public.motivation_posts to authenticated;
grant all on public.motivation_posts to service_role;
alter table public.motivation_posts enable row level security;
create policy "motivation readable" on public.motivation_posts for select to authenticated using (true);
create policy "motivation insert own" on public.motivation_posts for insert to authenticated with check (auth.uid() = user_id and not public.is_banned(auth.uid()));
create policy "motivation delete own or staff" on public.motivation_posts for delete to authenticated using (auth.uid() = user_id or public.is_staff(auth.uid()));
create trigger motivation_from_admin before insert on public.motivation_posts for each row execute function public.set_from_admin();

create policy "motivation img read" on storage.objects for select to authenticated using (bucket_id = 'motivation');
create policy "motivation img upload own" on storage.objects for insert to authenticated with check (bucket_id = 'motivation' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "motivation img delete own" on storage.objects for delete to authenticated using (bucket_id = 'motivation' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_staff(auth.uid())));