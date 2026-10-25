import type { Json } from "@/integrations/supabase/types";
import { readData } from "@/lib/requests";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Archive, Ban, BookOpen, ClipboardCheck, DoorOpen, Image, Mail, MessagesSquare, RotateCcw,
  ShieldCheck, Sparkles, Trash2, Users, Volume2, VolumeX,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMe } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { BRANCHES, branchLabel, type Branch } from "@/lib/branches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AvatarPic } from "@/components/AvatarPic";
import { PageState } from "@/components/PageState";
import { LibraryAdmin } from "@/components/LibraryAdmin";
import { SupportAdmin } from "@/components/SupportAdmin";

type Can = { owner: boolean; admin: boolean; mod: boolean; support: boolean };

export function Admin() {
  const { me } = useMe();
  const can: Can = {
    owner: !!me?.isOwner,
    admin: !!me?.isAdmin,
    mod: !!me && me.isStaff && !me.isAdmin,
    support: !!me?.isSupport,
  };
  const tabs: { value: string; label: string; show: boolean }[] = [
    { value: "stats", label: "الإحصائيات", show: can.admin },
    { value: "rooms", label: "الغرف", show: can.admin },
    { value: "students", label: "الطلاب", show: can.admin || can.mod },
    { value: "messages", label: "الرسائل", show: can.admin || can.mod },
    { value: "archive", label: "الأرشيف", show: can.admin },
    { value: "support", label: "الدعم", show: can.admin || can.support },
    { value: "content", label: "المحتوى", show: can.admin || can.support },
  ];
  const visible = tabs.filter((t) => t.show);
  const defaultTab = can.admin ? "stats" : can.mod ? "students" : "support";
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">لوحة التحكم</h1>
        {can.owner && (
          <Button asChild variant="outline" size="sm"><Link to="/admin/avatar-art"><Image /> صور الأفتار</Link></Button>
        )}
      </div>
      <Tabs defaultValue={defaultTab} dir="rtl">
        <TabsList className="mb-6 flex w-full flex-nowrap justify-start gap-1 overflow-x-auto h-auto">
          {visible.map((t) => <TabsTrigger key={t.value} value={t.value} className="shrink-0">{t.label}</TabsTrigger>)}
        </TabsList>
        {can.admin && <TabsContent value="stats"><Stats /></TabsContent>}
        {can.admin && <TabsContent value="rooms"><RoomsAdmin /></TabsContent>}
        {(can.admin || can.mod) && <TabsContent value="students"><StudentsAdmin can={can} /></TabsContent>}
        {(can.admin || can.mod) && <TabsContent value="messages"><MessagesAdmin /></TabsContent>}
        {can.admin && <TabsContent value="archive"><ArchiveAdmin /></TabsContent>}
        {(can.admin || can.support) && <TabsContent value="support"><SupportAdmin /></TabsContent>}
        {(can.admin || can.support) && <TabsContent value="content"><ContentAdmin can={can} /></TabsContent>}
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
            <div className="min-w-0">
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

const MUTE_OPTIONS = [
  { label: "ساعة", ms: 3600_000 },
  { label: "يوم", ms: 86400_000 },
  { label: "7 أيام", ms: 7 * 86400_000 },
] as const;

type StudentRow = {
  id: string;
  display_name: string;
  nickname: string | null;
  avatar_url: string | null;
  avatar: Json;
  branch: Branch | null;
  gender: string | null;
  generation: string | null;
  roles: string[];
  banned: boolean;
  mutedUntil: string | null;
};

function StudentsAdmin({ can }: { can: Can }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [banTarget, setBanTarget] = useState<StudentRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [customMute, setCustomMute] = useState<Record<string, string>>({});
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const [p, r, b, m] = await Promise.all([
        supabase.from("profiles").select("id,display_name,nickname,avatar,avatar_url,branch,gender,generation").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id,role"),
        supabase.from("user_bans").select("user_id"),
        supabase.from("user_mutes").select("user_id,muted_until"),
      ]);
      for (const result of [p, r, b, m]) { if (result.error) throw result.error; }
      const banned = new Set((b.data ?? []).map((x) => x.user_id));
      const mutes = new Map((m.data ?? []).map((x) => [x.user_id, x.muted_until]));
      return (p.data ?? []).map((u): StudentRow => ({
        ...u,
        roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role),
        banned: banned.has(u.id),
        mutedUntil: mutes.get(u.id) ?? null,
      }));
    },
  });
  const refresh = () => { refetch(); qc.invalidateQueries({ queryKey: ["admin-stats"] }); };

  async function toggleBan(u: StudentRow) {
    if (u.banned) {
      const { error } = await supabase.from("user_bans").delete().eq("user_id", u.id);
      if (error) { toast.error("غير مسموح"); return; }
      toast.success("تم إلغاء الحظر");
      refresh();
    } else {
      setBanReason("");
      setBanTarget(u);
    }
  }
  async function confirmBan() {
    if (!banTarget) return;
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_bans").insert({ user_id: banTarget.id, reason: banReason.trim() || null, banned_by: me.user?.id ?? null });
    if (error) { toast.error("غير مسموح"); return; }
    toast.success("تم حظر الطالب وأجهزته");
    setBanTarget(null);
    refresh();
  }
  async function toggleRole(u: StudentRow, role: "moderator" | "support") {
    const has = u.roles.includes(role);
    const { error } = has
      ? await supabase.from("user_roles").delete().eq("user_id", u.id).eq("role", role)
      : await supabase.from("user_roles").insert({ user_id: u.id, role });
    if (error) { toast.error("غير مسموح"); return; }
    toast.success("تم تحديث الأدوار");
    refresh();
  }
  async function mute(u: StudentRow, until: Date) {
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("user_mutes").upsert(
      { user_id: u.id, muted_until: until.toISOString(), muted_by: me.user?.id ?? null },
      { onConflict: "user_id" },
    );
    if (error) { toast.error("غير مسموح"); return; }
    toast.success("تم كتم الطالب");
    refresh();
  }
  async function unmute(u: StudentRow) {
    const { error } = await supabase.from("user_mutes").delete().eq("user_id", u.id);
    if (error) { toast.error("غير مسموح"); return; }
    toast.success("تم إلغاء الكتم");
    refresh();
  }

  const needle = q.trim();
  const list = (data ?? []).filter((u) =>
    !needle || u.display_name.includes(needle) || (u.nickname ?? "").includes(needle));

  return (
    <div className="space-y-4">
      <Input placeholder="ابحث بالاسم أو الاسم المستعار…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm bg-card" />
      <PageState loading={isLoading} error={isError} retry={() => refetch()} />
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {list.map((u) => {
          const isAdmin = u.roles.includes("admin");
          const isMod = u.roles.includes("moderator");
          const isSupport = u.roles.includes("support");
          const muted = u.mutedUntil && new Date(u.mutedUntil).getTime() > Date.now();
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
              <AvatarPic profile={u} />
              <div className="flex-1 min-w-40">
                <p className="font-semibold">{u.nickname || u.display_name}</p>
                <p className="text-xs text-muted-foreground">
                  {u.gender === "female" ? "أنثى" : u.gender === "male" ? "ذكر" : "—"} · {u.generation ?? "—"} · {branchLabel(u.branch)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isAdmin ? "أدمن" : isMod ? "مشرف" : isSupport ? "دعم" : "طالب"}
                  {u.banned && <span className="text-destructive"> · محظور</span>}
                  {muted && <span className="text-amber-700"> · مكتوم حتى {new Date(u.mutedUntil!).toLocaleString("ar-u-nu-latn")}</span>}
                </p>
              </div>
              {!isAdmin && (
                <div className="flex flex-wrap items-center gap-2">
                  {can.owner && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => toggleRole(u, "moderator")}>
                        <ShieldCheck /> {isMod ? "إزالة الإشراف" : "تعيين مشرف"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleRole(u, "support")}>
                        {isSupport ? "إزالة الدعم" : "تعيين دعم"}
                      </Button>
                    </>
                  )}
                  {muted ? (
                    <Button size="sm" variant="outline" onClick={() => unmute(u)}><Volume2 /> إلغاء الكتم</Button>
                  ) : (
                    <>
                      {MUTE_OPTIONS.map((o) => (
                        <Button key={o.label} size="sm" variant="outline" onClick={() => mute(u, new Date(Date.now() + o.ms))}>
                          <VolumeX /> {o.label}
                        </Button>
                      ))}
                      <Input
                        type="datetime-local"
                        className="h-8 w-44 bg-card text-xs"
                        value={customMute[u.id] ?? ""}
                        onChange={(e) => setCustomMute((s) => ({ ...s, [u.id]: e.target.value }))}
                      />
                      <Button
                        size="sm" variant="outline" disabled={!customMute[u.id]}
                        onClick={() => mute(u, new Date(customMute[u.id] ?? ""))}
                      >كتم مخصص</Button>
                    </>
                  )}
                  {can.admin && (
                    <Button size="sm" variant={u.banned ? "outline" : "destructive"} onClick={() => toggleBan(u)}>
                      <Ban /> {u.banned ? "إلغاء الحظر" : "حظر"}
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {can.owner && <OwnerEmails />}

      <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>حظر {banTarget?.nickname || banTarget?.display_name}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">سيُحظر الحساب وأجهزته من المنصة.</p>
          <Input placeholder="سبب الحظر (اختياري)" value={banReason} onChange={(e) => setBanReason(e.target.value)} />
          <Button variant="destructive" onClick={confirmBan}>تأكيد الحظر</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OwnerEmails() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { data, isLoading, isError, refetch } = useQuery({
    enabled: open,
    queryKey: ["owner-emails"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("owner_list_emails");
      if (error) throw error;
      return data ?? [];
    },
  });
  const list = (data ?? []).filter((r) => !q || r.email.includes(q));
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex items-center gap-2 font-bold"><Mail className="size-4 text-primary" /> إيميلات الطلاب (للمالك فقط)</h2>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>{open ? "إخفاء" : "عرض"}</Button>
        {open && <Input placeholder="ابحث بالإيميل…" value={q} onChange={(e) => setQ(e.target.value)} className="h-8 max-w-xs bg-card" />}
      </div>
      {open && (
        <div className="mt-3">
          <PageState loading={isLoading} error={isError} retry={() => refetch()} />
          <ul className="divide-y text-sm">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2" dir="ltr">
                <span>{r.email}</span>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("ar-u-nu-latn")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function MessagesAdmin() {
  const qc = useQueryClient();
  const { data = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () =>
      await readData(supabase
        .from("messages")
        .select("id,content,created_at,profiles(display_name),rooms(name)").is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100)) ?? [],
  });
  async function del(id: string) {
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("messages").update({ deleted_at: new Date().toISOString(), deleted_by: me.user?.id ?? null }).eq("id", id);
    if (error) { toast.error("تعذر الحذف"); return; }
    qc.invalidateQueries({ queryKey: ["admin-messages"] });
  }
  return (
    <div>
      <PageState loading={isLoading} error={isError} retry={() => refetch()} />
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {data.length === 0 && !isLoading && <p className="p-6 text-center text-muted-foreground">لا يوجد رسائل</p>}
        {data.map((m) => (
          <div key={m.id} className="flex items-start gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {m.profiles?.display_name} · {m.rooms?.name} · {new Date(m.created_at).toLocaleString("ar-u-nu-latn")}
              </p>
              <p className="break-words text-sm">{m.content}</p>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(m.id)} aria-label="حذف"><Trash2 className="text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE = 50;

type ArchiveRow = {
  id: string;
  source: "messages" | "support_messages";
  content: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  sender: string;
  room: string;
};

function ArchiveAdmin() {
  const [room, setRoom] = useState("all");
  const [student, setStudent] = useState("");
  const [text, setText] = useState("");
  const [deletedOnly, setDeletedOnly] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const { data: rooms = [] } = useQuery({
    queryKey: ["rooms", "admin"],
    staleTime: 5 * 60_000,
    queryFn: async () => await readData(supabase.from("rooms").select("id,name").order("created_at")) ?? [],
  });

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-archive", room, deletedOnly, limit],
    queryFn: async () => {
      let mq = supabase.from("messages")
        .select("id,content,created_at,deleted_at,deleted_by,profiles(display_name,nickname),rooms(name)")
        .order("created_at", { ascending: false }).range(0, limit - 1);
      if (room !== "all") mq = mq.eq("room_id", room);
      if (deletedOnly) mq = mq.not("deleted_at", "is", null);
      let sq = supabase.from("support_messages")
        .select("id,content,created_at,deleted_at,deleted_by,student_id,sender_id")
        .order("created_at", { ascending: false }).range(0, limit - 1);
      if (deletedOnly) sq = sq.not("deleted_at", "is", null);
      const [m, s] = await Promise.all([mq, sq]);
      if (m.error) throw m.error;
      if (s.error) throw s.error;
      const senderIds = [...new Set((s.data ?? []).map((r) => r.sender_id))];
      const names = new Map<string, string>();
      if (senderIds.length) {
        const { data: profs } = await supabase.from("profiles").select("id,display_name,nickname").in("id", senderIds);
        for (const p of profs ?? []) names.set(p.id, p.nickname || p.display_name);
      }
      const rows: ArchiveRow[] = [
        ...(m.data ?? []).map((r): ArchiveRow => ({
          id: r.id, source: "messages", content: r.content, created_at: r.created_at,
          deleted_at: r.deleted_at, deleted_by: r.deleted_by,
          sender: r.profiles?.nickname || r.profiles?.display_name || "—", room: r.rooms?.name ?? "—",
        })),
        ...(s.data ?? []).map((r): ArchiveRow => ({
          id: r.id, source: "support_messages", content: r.content, created_at: r.created_at,
          deleted_at: r.deleted_at, deleted_by: r.deleted_by,
          sender: names.get(r.sender_id) ?? "—", room: "دعم خاص",
        })),
      ];
      rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
      return rows;
    },
  });

  const filtered = useMemo(() => (data ?? []).filter((r) =>
    (!student || r.sender.includes(student)) && (!text || r.content.includes(text))), [data, student, text]);

  async function restore(r: ArchiveRow) {
    const { error } = await supabase.rpc("restore_deleted", { _table: r.source, _id: r.id });
    if (error) { toast.error(error.message || "تعذر الاسترجاع"); return; }
    toast.success("تم استرجاع الرسالة");
    refetch();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select dir="rtl" value={room} onValueChange={setRoom}>
          <SelectTrigger className="w-44 bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الغرف</SelectItem>
            {rooms.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input placeholder="اسم الطالب…" value={student} onChange={(e) => setStudent(e.target.value)} className="max-w-40 bg-card" />
        <Input placeholder="نص الرسالة…" value={text} onChange={(e) => setText(e.target.value)} className="max-w-48 bg-card" />
        <Button variant={deletedOnly ? "default" : "outline"} size="sm" onClick={() => setDeletedOnly((d) => !d)}>
          <Archive /> محذوفة فقط
        </Button>
      </div>
      <PageState loading={isLoading} error={isError} retry={() => refetch()} />
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {filtered.length === 0 && !isLoading && <p className="p-6 text-center text-muted-foreground">لا يوجد نتائج</p>}
        {filtered.map((r) => (
          <div key={`${r.source}-${r.id}`} className="flex items-start gap-3 p-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">
                {r.sender} · {r.room} · {new Date(r.created_at).toLocaleString("ar-u-nu-latn")}
                {r.deleted_at && (
                  <span className="ms-2 rounded-full bg-destructive/10 px-2 py-0.5 text-destructive">
                    محذوفة{r.deleted_by ? " · بواسطة " : ""}{r.deleted_by ? r.deleted_by.slice(0, 8) : ""}
                  </span>
                )}
              </p>
              <p className="break-words text-sm">{r.content}</p>
            </div>
            {r.deleted_at && (
              <Button size="sm" variant="outline" onClick={() => restore(r)}><RotateCcw /> استرجاع</Button>
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <Button variant="outline" disabled={isFetching} onClick={() => setLimit((l) => l + PAGE)}>تحميل المزيد</Button>
      </div>
    </div>
  );
}

function ContentAdmin({ can }: { can: Can }) {
  const links = [
    { to: "/admin/curriculum", label: "المنهاج الدراسي", icon: BookOpen, show: true },
    { to: "/admin/dhikr", label: "محتوى ذكرى", icon: Sparkles, show: true },
    { to: "/admin/avatar-art", label: "صور الأفتار", icon: Image, show: can.owner },
  ] as const;
  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {links.filter((l) => l.show).map((l) => (
          <Button key={l.to} asChild variant="outline" className="h-auto justify-start gap-2 rounded-2xl p-4">
            <Link to={l.to}><l.icon className="size-5 text-primary" /> {l.label}</Link>
          </Button>
        ))}
      </div>
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><ClipboardCheck className="size-5 text-primary" /> الاختبارات المعلّقة</h2>
        <PendingQuizzes />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">مراجعة المكتبة</h2>
        <LibraryAdmin />
      </section>
    </div>
  );
}

function PendingQuizzes() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-pending-quizzes"],
    queryFn: async () =>
      await readData(supabase.from("quizzes").select("id,title,subject,unit,minutes,created_at")
        .eq("status", "pending").is("deleted_at", null).order("created_at")) ?? [],
  });
  async function review(id: string, approve: boolean) {
    let reject_reason: string | null = null;
    if (!approve) {
      reject_reason = prompt("سبب الرفض؟") ?? "";
      if (!reject_reason.trim()) return;
    }
    const { data: me } = await supabase.auth.getUser();
    const { error } = await supabase.from("quizzes").update({
      status: approve ? "approved" : "rejected",
      reviewed_by: me.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      reject_reason,
    }).eq("id", id);
    if (error) { toast.error(error.message || "تعذر الحفظ"); return; }
    toast.success(approve ? "تم اعتماد الاختبار" : "تم رفض الاختبار");
    qc.invalidateQueries({ queryKey: ["admin-pending-quizzes"] });
  }
  return (
    <div>
      <PageState loading={isLoading} error={isError} retry={() => refetch()} />
      <div className="divide-y rounded-2xl border bg-card shadow-card">
        {(data ?? []).length === 0 && !isLoading && <p className="p-6 text-center text-muted-foreground">لا يوجد اختبارات بانتظار المراجعة</p>}
        {(data ?? []).map((qz) => (
          <div key={qz.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1 min-w-40">
              <p className="font-semibold">{qz.title}</p>
              <p className="text-xs text-muted-foreground">{qz.subject}{qz.unit ? ` · ${qz.unit}` : ""} · {qz.minutes} دقيقة · {new Date(qz.created_at).toLocaleDateString("ar-u-nu-latn")}</p>
            </div>
            <Button size="sm" className="bg-brand" onClick={() => review(qz.id, true)}>اعتماد</Button>
            <Button size="sm" variant="destructive" onClick={() => review(qz.id, false)}>رفض</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MuteTools() { return <StudentsAdmin can={{ owner: false, admin: false, mod: true, support: false }} />; }
