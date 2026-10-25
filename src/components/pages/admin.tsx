import { readData } from "@/lib/requests";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Image, MessagesSquare, Trash2, Users, DoorOpen, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, branchLabel, type Branch } from "@/lib/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/UserAvatar";
import { LibraryAdmin } from "@/components/LibraryAdmin";
import { SupportAdmin } from "@/components/SupportAdmin";

export function Admin() {
  const { me } = useMe();
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        {me?.isOwner && (
          <Button asChild variant="outline" size="sm"><Link to="/admin/avatar-art"><Image /> صور الأفتار</Link></Button>
        )}
      </div>
      <Tabs defaultValue="stats" dir="rtl">
        <TabsList className="mb-6 flex w-full flex-wrap justify-start gap-1 h-auto">
          <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
          <TabsTrigger value="rooms">الغرف</TabsTrigger>
          <TabsTrigger value="users">المستخدمين</TabsTrigger>
          <TabsTrigger value="messages">الرسائل</TabsTrigger>
          <TabsTrigger value="library">المكتبة</TabsTrigger>
          <TabsTrigger value="support">رسائل الطلاب</TabsTrigger>
        </TabsList>
        <TabsContent value="stats"><Stats /></TabsContent>
        <TabsContent value="rooms"><RoomsAdmin /></TabsContent>
        <TabsContent value="users"><UsersAdmin /></TabsContent>
        <TabsContent value="messages"><MessagesAdmin /></TabsContent>
        <TabsContent value="library"><LibraryAdmin /></TabsContent>
        <TabsContent value="support"><SupportAdmin /></TabsContent>
      </Tabs>
    </main>
  );
}

const count = async (t: "profiles" | "messages" | "rooms" | "user_bans", since?: string) => {
  let q = supabase.from(t).select("*", { count: "exact", head: true });
  if (since) q = q.gte("created_at", since);
  const result = await q;
  if (result.error) throw result.error;
  return result.count ?? 0;
};

function Stats() {
  const { data } = useQuery({
    throwOnError: true,
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const day = new Date(Date.now() - 86400000).toISOString();
      const [users, msgs, rooms, bans, msgsToday, usersToday] = await Promise.all([
        count("profiles"), count("messages"), count("rooms"), count("user_bans"), count("messages", day), count("profiles", day),
      ]);
      return { users, msgs, rooms, bans, msgsToday, usersToday };
    },
  });
  const cards = [
    { icon: Users, label: "الطلاب", value: data?.users, sub: `+${data?.usersToday ?? 0} آخر 24 ساعة` },
    { icon: MessagesSquare, label: "الرسائل", value: data?.msgs, sub: `+${data?.msgsToday ?? 0} آخر 24 ساعة` },
    { icon: DoorOpen, label: "الغرف", value: data?.rooms, sub: "غرف نشطة" },
    { icon: Ban, label: "المحظورين", value: data?.bans, sub: "حسابات محظورة" },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border bg-card p-5 shadow-card">
          <c.icon className="mb-3 size-6 text-primary" />
          <p className="text-sm text-muted-foreground">{c.label}</p>
          <p className="font-display text-3xl font-bold">{c.value ?? "…"}</p>
          <p className="text-xs text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function RoomsAdmin() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [branch, setBranch] = useState<Branch | "general">("general");
  const { data: rooms = [] } = useQuery({
    throwOnError: true,
    queryKey: ["rooms", "admin"],
    staleTime: 5 * 60_000,
    queryFn: async () => await readData(supabase.from("rooms").select("*").order("created_at")) ?? [],
  });
  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("rooms").insert({ name: name.trim(), description: desc.trim() || null, branch: branch === "general" ? null : branch });
    if (error) { toast.error("تعذر إنشاء الغرفة"); return; }
    setName(""); setDesc("");
    toast.success("تمت إضافة الغرفة");
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }
  async function del(id: string) {
    if (!confirm("حذف الغرفة وكل رسائلها؟")) return;
    const { error } = await supabase.from("rooms").delete().eq("id", id);
    if (error) { toast.error("تعذر الحذف"); return; }
    qc.invalidateQueries({ queryKey: ["rooms"] });
  }
  return (
    <div className="space-y-6">
      <form onSubmit={add} className="grid gap-3 rounded-2xl border bg-card p-4 shadow-card sm:grid-cols-[1fr_1fr_180px_auto]">
        <Input required minLength={2} maxLength={60} placeholder="اسم الغرفة" value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder="الوصف" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Select dir="rtl" value={branch} onValueChange={(v) => setBranch(v as Branch)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="general">مشترك</SelectItem>
            {BRANCHES.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button className="bg-brand">إضافة</Button>
      </form>
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-muted-foreground">{branchLabel(r.branch)} · {r.description}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(r.id)} aria-label="حذف"><Trash2 className="text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersAdmin() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const { data } = useQuery({
    throwOnError: true,
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r, b] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("user_bans").select("user_id"),
      ]);
      for (const result of [p, r, b]) { if (result.error) throw result.error; }
      const banned = new Set((b.data ?? []).map((x) => x.user_id));
      return (p.data ?? []).map((u) => ({
        ...u,
        roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role),
        banned: banned.has(u.id),
      }));
    },
  });
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function toggleBan(id: string, banned: boolean) {
    const { data: me } = await supabase.auth.getUser();
    const { error } = banned
      ? await supabase.from("user_bans").delete().eq("user_id", id)
      : await supabase.from("user_bans").insert({ user_id: id, banned_by: me.user?.id ?? null });
    if (error) { toast.error("غير مسموح"); return; }
    refresh();
  }
  async function toggleMod(id: string, isMod: boolean) {
    const { error } = isMod
      ? await supabase.from("user_roles").delete().eq("user_id", id).eq("role", "moderator")
      : await supabase.from("user_roles").insert({ user_id: id, role: "moderator" });
    if (error) { toast.error("غير مسموح"); return; }
    refresh();
  }

  const list = (data ?? []).filter((u) => u.display_name.includes(q));
  return (
    <div className="space-y-4">
      <Input placeholder="ابحث بالاسم…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm bg-card" />
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {list.map((u) => {
          const isAdmin = u.roles.includes("admin");
          const isMod = u.roles.includes("moderator");
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <UserAvatar path={u.avatar_url} name={u.display_name} />
              <div className="flex-1 min-w-32">
                <p className="font-semibold">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {branchLabel(u.branch)} · {isAdmin ? "أدمن" : isMod ? "مشرف" : "طالب"}
                  {u.banned && <span className="text-destructive"> · محظور</span>}
                </p>
              </div>
              {!isAdmin && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => toggleMod(u.id, isMod)}>
                    <ShieldCheck /> {isMod ? "إزالة الإشراف" : "تعيين مشرف"}
                  </Button>
                  <Button size="sm" variant={u.banned ? "outline" : "destructive"} onClick={() => toggleBan(u.id, u.banned)}>
                    <Ban /> {u.banned ? "إلغاء الحظر" : "حظر"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessagesAdmin() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    throwOnError: true,
    queryKey: ["admin-messages"],
    queryFn: async () =>
      await readData(supabase
        .from("messages")
        .select("id,content,created_at,profiles(display_name),rooms(name)").is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100)) ?? [],
  });
  async function del(id: string) {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) { toast.error("تعذر الحذف"); return; }
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
  }
  return (
    <div className="divide-y rounded-2xl border bg-card shadow-card">
      {data.length === 0 && <p className="p-6 text-center text-muted-foreground">لا يوجد رسائل</p>}
      {data.map((m) => (
        <div key={m.id} className="flex items-start gap-3 p-4">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">
              {m.profiles?.display_name} · {m.rooms?.name} · {new Date(m.created_at).toLocaleString("ar-JO")}
            </p>
            <p className="break-words text-sm">{m.content}</p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => del(m.id)} aria-label="حذف"><Trash2 className="text-destructive" /></Button>
        </div>
      ))}
    </div>
  );
}
