CREATE TABLE public.site_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  owner_id uuid,
  owner_name text NOT NULL DEFAULT 'اسم المالك',
  launch_date date NOT NULL DEFAULT '2026-10-01'
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.site_settings (id, owner_id)
  SELECT 1, (SELECT user_id FROM public.user_roles WHERE role='admin' ORDER BY id LIMIT 1);

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ select exists (select 1 from public.site_settings where owner_id = _user_id) $$;

CREATE POLICY "settings readable" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "owner edits settings" ON public.site_settings FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid())) WITH CHECK (public.is_owner(auth.uid()));

ALTER TABLE public.profiles ADD COLUMN gender text CHECK (gender IN ('female','male'));
CREATE OR REPLACE FUNCTION public.lock_gender() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if old.gender is not null and new.gender is distinct from old.gender and not public.has_role(auth.uid(),'admin') then
    raise exception 'gender cannot be changed';
  end if;
  return new;
end; $$;
CREATE TRIGGER profiles_lock_gender BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.lock_gender();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
begin
  insert into public.profiles (id, display_name, avatar_url, gender)
  values (new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'gender' in ('female','male') then new.raw_user_meta_data->>'gender' end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
    update public.site_settings set owner_id = new.id where id = 1 and owner_id is null;
  end if;
  return new;
end; $function$;

ALTER TABLE public.rooms ADD COLUMN generation text NOT NULL DEFAULT 'tawjihi' CHECK (generation IN ('tawjihi','gen2010'));
ALTER TABLE public.rooms ADD COLUMN audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','female','male'));
INSERT INTO public.rooms (name, description, kind, generation, audience) VALUES
 ('شات البنات', 'للبنات فقط — توجيهي', 'chat', 'tawjihi', 'female'),
 ('شات الشباب', 'للشباب فقط — توجيهي', 'chat', 'tawjihi', 'male'),
 ('شات الجميع — جيل 2010', 'غرفة مشتركة لجيل 2010', 'chat', 'gen2010', 'all'),
 ('شات البنات — جيل 2010', 'للبنات فقط — جيل 2010', 'chat', 'gen2010', 'female'),
 ('شات الشباب — جيل 2010', 'للشباب فقط — جيل 2010', 'chat', 'gen2010', 'male');

CREATE OR REPLACE FUNCTION public.can_access_room(_user_id uuid, _room_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (
    select 1 from public.rooms r
    where r.id = _room_id and (
      r.audience = 'all' or public.is_staff(_user_id)
      or r.audience = (select gender from public.profiles where id = _user_id)
    ))
$$;

CREATE TABLE public.user_mutes (
  user_id uuid PRIMARY KEY,
  muted_until timestamptz NOT NULL,
  muted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_mutes TO authenticated;
GRANT ALL ON public.user_mutes TO service_role;
ALTER TABLE public.user_mutes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own mute or staff" ON public.user_mutes FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));
CREATE POLICY "staff mute" ON public.user_mutes FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()) AND user_id <> auth.uid() AND NOT public.has_role(user_id,'admin'));
CREATE POLICY "staff update mute" ON public.user_mutes FOR UPDATE TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff unmute" ON public.user_mutes FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));
CREATE OR REPLACE FUNCTION public.is_muted(_user_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS
$$ select exists (select 1 from public.user_mutes where user_id = _user_id and muted_until > now()) $$;

ALTER TABLE public.messages ADD COLUMN reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL;
ALTER TABLE public.messages ADD COLUMN image_path text;
ALTER TABLE public.messages ADD COLUMN sender_role text;
ALTER TABLE public.messages ALTER COLUMN content SET DEFAULT '';
CREATE OR REPLACE FUNCTION public.set_sender_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  new.sender_role := case when public.has_role(new.user_id,'admin') then 'admin'
                          when public.has_role(new.user_id,'moderator') then 'moderator' end;
  return new;
end; $$;
CREATE TRIGGER messages_sender_role BEFORE INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.set_sender_role();

DROP POLICY "messages readable" ON public.messages;
CREATE POLICY "messages readable in accessible rooms" ON public.messages FOR SELECT TO authenticated USING (public.can_access_room(auth.uid(), room_id));
DROP POLICY "send if not banned and not focusing" ON public.messages;
CREATE POLICY "send if allowed" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id AND NOT public.is_banned(auth.uid()) AND NOT public.is_focusing(auth.uid())
  AND NOT public.is_muted(auth.uid()) AND public.can_access_room(auth.uid(), room_id)
  AND (image_path IS NULL OR split_part(image_path, '/', 1) = auth.uid()::text)
);

CREATE POLICY "chat images upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('png','jpg','jpeg','webp','gif')
);
CREATE POLICY "chat images read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'chat-images');
CREATE POLICY "chat images delete own or staff" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'chat-images' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.is_staff(auth.uid()))
);

ALTER TABLE public.library_files ADD COLUMN round_id uuid;
CREATE POLICY "students add own files" ON public.library_files FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND NOT public.is_banned(auth.uid()));
CREATE POLICY "delete own files" ON public.library_files FOR DELETE TO authenticated USING (uploaded_by = auth.uid());
CREATE POLICY "library student upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'library' AND (storage.foldername(name))[1] = 'students' AND (storage.foldername(name))[2] = auth.uid()::text
  AND lower(storage.extension(name)) IN ('pdf','png','jpg','jpeg','webp','doc','docx','ppt','pptx','xls','xlsx','txt')
);
CREATE POLICY "library student delete own" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'library' AND (storage.foldername(name))[1] = 'students' AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY "admin add roles" ON public.user_roles;
DROP POLICY "admin remove roles" ON public.user_roles;
CREATE POLICY "grant roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (
  public.is_owner(auth.uid()) OR (role = 'moderator' AND public.has_role(auth.uid(),'admin'))
);
CREATE POLICY "revoke roles" ON public.user_roles FOR DELETE TO authenticated USING (
  user_id <> auth.uid() AND role <> 'user' AND (public.is_owner(auth.uid()) OR (role = 'moderator' AND public.has_role(auth.uid(),'admin')))
);
DROP POLICY "read own roles or admin" ON public.user_roles;
CREATE POLICY "read own roles or staff" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.owner_list_emails() RETURNS TABLE (id uuid, email text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
begin
  if not public.is_owner(auth.uid()) then raise exception 'not allowed'; end if;
  return query select u.id, u.email::text, u.created_at from auth.users u order by u.created_at desc;
end; $$;
REVOKE ALL ON FUNCTION public.owner_list_emails() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.owner_list_emails() TO authenticated;

CREATE TABLE public.user_devices (
  user_id uuid NOT NULL,
  device_id text NOT NULL,
  fingerprint text,
  last_seen timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, device_id)
);
GRANT SELECT ON public.user_devices TO authenticated;
GRANT ALL ON public.user_devices TO service_role;
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read devices" ON public.user_devices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));

CREATE TABLE public.banned_devices (
  device_id text PRIMARY KEY,
  fingerprint text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, DELETE ON public.banned_devices TO authenticated;
GRANT ALL ON public.banned_devices TO service_role;
ALTER TABLE public.banned_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff read banned devices" ON public.banned_devices FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "staff unban devices" ON public.banned_devices FOR DELETE TO authenticated USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.device_is_banned(_device_id text, _fingerprint text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.banned_devices where device_id = _device_id or (_fingerprint is not null and fingerprint = _fingerprint))
$$;
GRANT EXECUTE ON FUNCTION public.device_is_banned(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.register_device(_device_id text, _fingerprint text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare uid uuid := auth.uid();
begin
  if uid is null or length(_device_id) > 100 then return false; end if;
  insert into public.user_devices (user_id, device_id, fingerprint) values (uid, _device_id, left(_fingerprint, 100))
    on conflict (user_id, device_id) do update set last_seen = now(), fingerprint = excluded.fingerprint;
  if public.device_is_banned(_device_id, _fingerprint) and not public.is_staff(uid) and not public.is_banned(uid) then
    insert into public.user_bans (user_id, reason) values (uid, 'جهاز محظور');
  end if;
  return public.is_banned(uid);
end; $$;
GRANT EXECUTE ON FUNCTION public.register_device(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ban_user_devices() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  insert into public.banned_devices (device_id, fingerprint, user_id)
    select device_id, fingerprint, new.user_id from public.user_devices where user_id = new.user_id
    on conflict (device_id) do nothing;
  return new;
end; $$;
CREATE TRIGGER user_bans_devices AFTER INSERT ON public.user_bans FOR EACH ROW EXECUTE FUNCTION public.ban_user_devices();

CREATE OR REPLACE FUNCTION public.unban_user_devices() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  delete from public.banned_devices where user_id = old.user_id;
  return old;
end; $$;
CREATE TRIGGER user_bans_undevices AFTER DELETE ON public.user_bans FOR EACH ROW EXECUTE FUNCTION public.unban_user_devices();

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bans;