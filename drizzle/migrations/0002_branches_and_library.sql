alter type public.study_branch add value if not exists 'health_engineering';
alter type public.study_branch add value if not exists 'business_languages';

create table public.library_files (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 2 and 120),
  subject text not null check (char_length(subject) between 1 and 60),
  branch text,
  file_path text not null,
  file_name text not null,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz not null default now()
);
create index library_files_created_idx on public.library_files(created_at desc);
grant select, insert, update, delete on public.library_files to authenticated;
grant all on public.library_files to service_role;
alter table public.library_files enable row level security;
create policy "library readable" on public.library_files for select to authenticated using (true);
create policy "admin add files" on public.library_files for insert to authenticated with check (public.has_role(auth.uid(),'admin'));
create policy "admin update files" on public.library_files for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admin delete files" on public.library_files for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "library read signed-in" on storage.objects for select to authenticated using (bucket_id = 'library');
create policy "library admin upload" on storage.objects for insert to authenticated with check (bucket_id = 'library' and public.has_role(auth.uid(),'admin'));
create policy "library admin delete" on storage.objects for delete to authenticated using (bucket_id = 'library' and public.has_role(auth.uid(),'admin'));