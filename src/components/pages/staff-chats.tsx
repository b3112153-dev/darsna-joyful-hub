import { lazy, Suspense, useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, ArrowRight, MessageCircle, Users, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useSupportInbox, readInboxSeen, inboxUnread } from "@/hooks/use-support-inbox";
import { chatAccess, latinDigits, profileName } from "@/lib/identity";
import { readData } from "@/lib/requests";
import { useLang, t } from "@/lib/i18n";
import { PageState } from "@/components/PageState";
import { AvatarPic } from "@/components/AvatarPic";
import { SupportThread } from "@/components/SupportThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
const MuteTools = lazy(() => import("@/components/pages/admin").then((m) => ({ default: m.MuteTools })));

export function StaffChats() {
  const { user, me } = useMe(); const access = chatAccess(me); const { lang } = useLang();
  const [tab, setTab] = useState(access.support ? "support" : "rooms");
  const inbox = useSupportInbox(user?.id, access.support);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const review = usePendingReview(access.review);
  useEffect(() => {
    setSeen(readInboxSeen(user?.id));
    const update = () => setSeen(readInboxSeen(user?.id));
    window.addEventListener("support-seen", update);
    return () => window.removeEventListener("support-seen", update);
  }, [user?.id]);
  return <main className="mx-auto max-w-4xl space-y-4 px-4 py-5 font-display">
    <h1 className="text-2xl font-extrabold">{t("الدردشات")}</h1>
    {access.support && <div className="grid grid-cols-3 divide-x divide-border border-y py-3 text-center text-xs">
      <div><b className="block text-lg tabular-nums">{inbox.isSuccess ? inbox.threads.filter((r) => inboxUnread(r, seen)).length : "—"}</b>{t("دعم غير مقروء")}</div>
      <div><b className="block text-lg tabular-nums">{review.data?.total ?? "—"}</b>{t("بانتظار المراجعة")}</div>
      <div><b className="block text-lg">—</b>{t("رسائل مبلّغ عنها")}</div>
    </div>}
    <Tabs value={tab} onValueChange={setTab} dir={lang === "ar" ? "rtl" : "ltr"}>
      <TabsList className="mb-4 flex h-auto w-full justify-start overflow-x-auto">
        {access.support && <TabsTrigger value="support">{t("الدعم")}</TabsTrigger>}
        <TabsTrigger value="rooms">{t("الغرف")}</TabsTrigger>
        {access.review && <TabsTrigger value="review">{t("المراجعة")}</TabsTrigger>}
      </TabsList>
      {access.support && <TabsContent value="support"><SupportInbox /></TabsContent>}
      <TabsContent value="rooms"><StaffRooms />{access.mute && <MuteSection />}</TabsContent>
      {access.review && <TabsContent value="review"><ReviewQueue /></TabsContent>}
    </Tabs>
  </main>;
}

function MuteSection() {
  const [open, setOpen] = useState(false);
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)} className="mt-5 border-t pt-4"><summary className="flex cursor-pointer items-center gap-2 text-sm font-bold"><VolumeX className="size-4" />{t("أدوات الكتم")}</summary>{open && <Suspense fallback={<PageState loading />}><MuteTools /></Suspense>}</details>;
}

export function SupportInbox() {
  const { lang } = useLang();
  const { user } = useMe(); const inbox = useSupportInbox(user?.id);
  const [active, setActive] = useState<string | null>(null); const [search, setSearch] = useState("");
  const [seen, setSeen] = useState<Record<string, string>>({});
  useEffect(() => { setSeen(readInboxSeen(user?.id)); }, [user?.id]);
  const selected = inbox.threads.find((r) => r.student_id === active);
  useEffect(() => {
    if (!active || !user || !selected) return;
    const next = { ...readInboxSeen(user.id), [active]: selected.created_at }; setSeen(next);
    try { localStorage.setItem(`support-seen:${user.id}`, JSON.stringify(next)); } catch { /* storage optional */ }
    window.dispatchEvent(new Event("support-seen"));
  }, [active, selected?.created_at, user?.id]);
  return <div className="space-y-3">
    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("ابحث بالاسم أو الاسم المستعار…")} aria-label={t("بحث")} />
    <PageState loading={inbox.isPending} error={inbox.isError} retry={() => void inbox.refetch()} />
    <div className="divide-y border-y">{inbox.threads.filter((r) => !search || [r.profiles?.nickname, r.profiles?.display_name].some((n) => n?.toLowerCase().includes(search.toLowerCase()))).map((r) => <Button key={r.student_id} variant="ghost" className="h-auto w-full justify-start gap-3 rounded-none py-4 text-start" onClick={() => setActive(r.student_id)}>
      <AvatarPic profile={r.profiles} /><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><span className="truncate font-bold">{r.profiles?.nickname || profileName(r.profiles, true)}</span>{inboxUnread(r, seen) && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label={t("غير مقروء")} />}</span><span className="block truncate text-xs text-muted-foreground">{r.content || t("صورة")}</span></span><time className="shrink-0 text-[10px] text-muted-foreground" dateTime={r.created_at}>{new Date(r.created_at).toLocaleString(lang === "en" ? "en-US" : "ar-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
    </Button>)}</div>
    {inbox.isSuccess && !inbox.threads.length && <p className="py-8 text-center text-muted-foreground">{t("ما في محادثات بعد")}</p>}
    {inbox.hasNextPage && <Button variant="outline" disabled={inbox.isFetchingNextPage} onClick={() => void inbox.fetchNextPage()}>{t("تحميل المزيد")}</Button>}
    <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}><DialogContent className="inset-0 flex h-dvh w-full max-w-none translate-x-0 translate-y-0 flex-col gap-3 rounded-none p-4 sm:max-w-none" aria-describedby={undefined}><DialogHeader><DialogTitle className="flex items-center gap-3 pe-8"><Button variant="ghost" size="icon" aria-label={t("رجوع")} onClick={() => setActive(null)}><ArrowRight /></Button><AvatarPic profile={selected?.profiles} /><span className="truncate">{selected?.profiles?.nickname || profileName(selected?.profiles, true)}</span></DialogTitle></DialogHeader>{active && <SupportThread studentId={active} className="min-h-0 flex-1" />}</DialogContent></Dialog>
  </div>;
}

function StaffRooms() {
  const { lang } = useLang();
  const { user } = useMe(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["staff-chat-rooms", user?.id], staleTime: 30_000, queryFn: async () => {
    const rooms = await readData(supabase.from("rooms").select("id,name,generation,audience").eq("kind", "chat").order("generation").limit(50)) ?? [];
    return await Promise.all(rooms.map(async (room) => {
      let members = supabase.from("profiles").select("id", { count: "exact", head: true }).eq("generation", room.generation);
      if (["female", "male"].includes(room.audience)) members = members.eq("gender", room.audience);
      const [last, count] = await Promise.all([readData(supabase.from("messages").select("content,created_at").eq("room_id", room.id).is("deleted_at", null).order("created_at", { ascending: false }).limit(1)), members]);
      if (count.error) throw count.error;
      return { ...room, last: last?.[0], members: count.count };
    }));
  } });
  useEffect(() => { const channel = supabase.channel(`staff-rooms-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => { void qc.invalidateQueries({ queryKey: ["staff-chat-rooms"] }); }).subscribe(); return () => { void supabase.removeChannel(channel); }; }, [qc]);
  const groups = [...new Set(query.data?.map((r) => r.generation) ?? [])];
  return <div className="space-y-4"><PageState loading={query.isPending} error={query.isError} retry={() => void query.refetch()} />{groups.map((generation) => <section key={generation}><h2 className="mb-2 text-sm font-bold text-muted-foreground">{generation === "tawjihi" ? "2009" : latinDigits(generation.replace("gen", ""))}</h2><div className="divide-y border-y">{query.data?.filter((r) => r.generation === generation).map((room) => <Link key={room.id} to="/rooms/$roomId" params={{ roomId: room.id }} className="flex items-center gap-3 py-4"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary"><MessageCircle className="size-5" /></span><span className="min-w-0 flex-1"><span className="block truncate font-bold">{room.name}</span><span className="block truncate text-xs text-muted-foreground">{room.last?.content ?? t("لا يوجد رسائل")}</span></span><span className="shrink-0 text-center text-xs text-muted-foreground"><span className="flex items-center justify-center gap-1"><Users className="size-3" />{room.members ?? "—"}</span>{room.last && <time className="block text-[10px]">{new Date(room.last.created_at).toLocaleTimeString(lang === "en" ? "en-US" : "ar-u-nu-latn", { hour: "2-digit", minute: "2-digit" })}</time>}</span></Link>)}</div></section>)}</div>;
}

function usePendingReview(enabled = true, page = 0) {
  return useQuery({ queryKey: ["chat-review", page], enabled, staleTime: 30_000, queryFn: async () => {
    const [files, quizzes] = await Promise.all([
      supabase.from("library_files").select("id,title,subject,file_path,file_name", { count: "exact" }).eq("status", "pending").is("deleted_at", null).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49),
      supabase.from("quizzes").select("id,title,subject", { count: "exact" }).eq("status", "pending").is("deleted_at", null).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49),
    ]);
    if (files.error) throw files.error; if (quizzes.error) throw quizzes.error;
    return { files: files.data ?? [], quizzes: quizzes.data ?? [], total: (files.count ?? 0) + (quizzes.count ?? 0), hasNext: Math.max(files.count ?? 0, quizzes.count ?? 0) > (page + 1) * 50 };
  } });
}
function ReviewQueue() {
  const [page, setPage] = useState(0);
  const query = usePendingReview(true, page); const { user } = useMe(); const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null); const [reject, setReject] = useState<{ id: string; table: "library_files" | "quizzes" } | null>(null); const [reason, setReason] = useState("");
  async function review(id: string, table: "library_files" | "quizzes", approve: boolean) {
    if (!user || busy || (!approve && !reason.trim())) return; setBusy(id);
    try { await readData(supabase.from(table).update({ status: approve ? "approved" : "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString(), reject_reason: approve ? null : reason.trim() }).eq("id", id).eq("status", "pending").select("id").single()); setReject(null); setReason(""); toast.success(t(approve ? "تمت الموافقة" : "تم رفض المشاركة")); await Promise.all([qc.invalidateQueries({ queryKey: ["chat-review"] }), qc.invalidateQueries({ queryKey: ["library"] }), qc.invalidateQueries({ queryKey: ["quizzes"] })]); } catch { toast.error(t("تعذر حفظ المراجعة")); } finally { setBusy(null); }
  }
  return <div className="space-y-3"><PageState loading={query.isPending} error={query.isError} retry={() => void query.refetch()} />{[{ table: "library_files" as const, rows: query.data?.files ?? [], label: "ملفات" }, { table: "quizzes" as const, rows: query.data?.quizzes ?? [], label: "اختبارات" }].map((group) => <section key={group.table}><h2 className="border-b py-2 font-bold">{t(group.label)}</h2>{group.rows.map((row) => <div key={row.id} className="flex flex-wrap items-center gap-2 border-b py-4"><div className="min-w-0 flex-1"><p className="break-words font-bold">{row.title}</p><p className="text-xs text-muted-foreground">{row.subject}</p></div><Button size="icon" title={t("موافقة")} aria-label={t("موافقة")} disabled={!!busy} onClick={() => void review(row.id, group.table, true)}><Check /></Button><Button variant="outline" size="icon" title={t("رفض")} aria-label={t("رفض")} disabled={!!busy} onClick={() => { setReject({ id: row.id, table: group.table }); setReason(""); }}><X /></Button></div>)}</section>)}{query.data?.total === 0 && <p className="py-6 text-center text-muted-foreground">{t("لا يوجد نتائج")}</p>}{(query.data?.total ?? 0) > 100 && <Button variant="outline" onClick={() => void query.refetch()}>{t("تحميل المزيد")}</Button>}<Dialog open={!!reject} onOpenChange={(open) => !open && setReject(null)}><DialogContent><DialogHeader><DialogTitle>{t("سبب الرفض")}</DialogTitle></DialogHeader><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={600} aria-label={t("سبب الرفض")} /><Button disabled={!!busy || !reason.trim()} onClick={() => reject && void review(reject.id, reject.table, false)}>{t("تأكيد الرفض")}</Button></DialogContent></Dialog></div>;
}