import { memo, useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { useNow } from "@/hooks/use-focus";
import { useReactions } from "@/hooks/use-reactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageActionsBar, copyMessage } from "@/components/MessageActions";
import { canEditNow, groupReactions, type ReactionRow } from "@/lib/reactions";
import { AvatarPic } from "@/components/AvatarPic";
import { PageState } from "@/components/PageState";
import { readData } from "@/lib/requests";
import { profileName, type PublicProfile } from "@/lib/identity";
import { useLang, t } from "@/lib/i18n";

type SupportMessage = {
  id: string;
  student_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  image_path: string | null;
  reply_to: string | null;
  deleted_at: string | null;
  edited_at: string | null;
  profiles: PublicProfile | null;
};

const SupportBubble = memo(function SupportBubble({ m, own, fromAdmin, canDelete, reactions, userId, now, onDelete, onEdit, onReact, onReply, replyPreview, staff }: {
  m: SupportMessage;
  own: boolean;
  fromAdmin: boolean;
  canDelete: boolean;
  reactions: ReactionRow[];
  userId: string | undefined;
  now: number;
  onDelete: (id: string) => void;
  onEdit: (id: string, content: string) => Promise<boolean>;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: SupportMessage) => void;
  replyPreview: string | null;
  staff: boolean;
}) {
  const { lang } = useLang();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(m.content);
  const [saving, setSaving] = useState(false);
  const editable = own && !m.image_path && canEditNow(m.created_at, now);
  const chips = groupReactions(reactions, m.id, userId);

  async function save() {
    if (saving || !draft.trim()) return;
    setSaving(true);
    try { if (await onEdit(m.id, draft)) setEditing(false); } finally { setSaving(false); }
  }

  return (
    <div className={`flex flex-col ${own ? "items-start" : "items-end"}`}>
      <MessageActionsBar actions={{
        onReact: (emoji) => onReact(m.id, emoji),
        onReply: () => onReply(m),
        onCopy: () => void copyMessage(m.content),
        ...(editable ? { onEdit: () => { setDraft(m.content); setEditing(true); } } : {}),
        ...(canDelete ? { onDelete: () => onDelete(m.id) } : {}),
      }}>
        <div className={`max-w-[85%] cursor-pointer select-none rounded-2xl px-3 py-2 ${fromAdmin ? "border-2 border-staff-border bg-staff text-staff-foreground" : own ? "bg-bubble-own text-bubble-own-foreground" : "border bg-bubble text-card-foreground"}`}>
          <div className="mb-1 flex items-center gap-2 text-xs"><AvatarPic profile={m.profiles} className="size-7" /><span>{profileName(m.profiles, staff)}</span></div>
          {fromAdmin ? <span className="mb-1 inline-block rounded-full bg-role-badge px-2 py-0.5 text-xs font-semibold text-role-badge-foreground">{t("الدعم")}</span> : !own && <p className="mb-0.5 text-xs font-semibold">{t("الطالب")}</p>}
          {replyPreview !== null && (
            <p className="mb-1.5 truncate rounded-[12px] border-s-4 border-primary/60 bg-background/50 px-2 py-1 text-xs text-muted-foreground">{replyPreview}</p>
          )}
          {editing ? <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="space-y-2">
            <Input aria-label={t("تعديل الرسالة")} value={draft} maxLength={2000} onChange={(event) => setDraft(event.target.value)} />
            <div className="flex gap-1"><Button size="sm" disabled={saving || !draft.trim()}>{t("حفظ")}</Button><Button size="sm" variant="ghost" type="button" disabled={saving} onClick={() => setEditing(false)}>{t("إلغاء")}</Button></div>
          </form> : <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>}
          <p className="mt-1 text-[10px] opacity-70">
            {new Date(m.created_at).toLocaleString(lang === "en" ? "en-US" : "ar-u-nu-latn", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
            {m.edited_at && t(" · معدّلة")}
          </p>
        </div>
      </MessageActionsBar>
      {chips.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {chips.map((chip) => (
            <button key={chip.emoji} type="button" onClick={() => onReact(m.id, chip.emoji)} aria-label={`تفاعل ${chip.emoji}`}
              className={`rounded-full border px-2 py-0.5 text-xs transition active:scale-90 ${chip.mine ? "border-primary bg-secondary font-bold" : "bg-card"}`}>
              {chip.emoji} {chip.count}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

export function SupportThread({ studentId, className = "" }: { studentId: string; className?: string }) {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<SupportMessage | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const now = useNow();
  const key = ["support", studentId];

  const history = useInfiniteQuery({
    queryKey: key, staleTime: 30_000, initialPageParam: null as { created_at: string; id: string } | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase.from("support_messages").select("*,profiles!support_messages_sender_id_fkey(display_name,nickname,avatar,gender)").eq("student_id", studentId).is("deleted_at", null).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50);
      if (pageParam) query = query.or(`created_at.lt.${pageParam.created_at},and(created_at.eq.${pageParam.created_at},id.lt.${pageParam.id})`);
      return (await readData(query)) ?? [];
    },
    getNextPageParam: (last) => { const row = last.at(-1); return last.length === 50 && row ? { created_at: row.created_at, id: row.id } : undefined; },
  });
  const msgs = [...new Map((history.data?.pages.flat() ?? []).map((m) => [m.id, m])).values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)) as SupportMessage[];
  const reactionsApi = useReactions("support_reactions", msgs.map((m) => m.id), user?.id, studentId);
  const previewOf = (id: string | null) => id ? msgs.find((m) => m.id === id)?.content ?? t("رسالة محذوفة") : null;

  useEffect(() => {
    const ch = supabase
      .channel(`support-${studentId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages", filter: `student_id=eq.${studentId}` }, () => {
        qc.invalidateQueries({ queryKey: ["support", studentId] });
        qc.invalidateQueries({ queryKey: ["support-threads"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [studentId, qc]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user) return;
    setText("");
    const { error } = await supabase.from("support_messages").insert({ student_id: studentId, sender_id: user.id, content, reply_to: replyTo?.id ?? null } as never);
    if (error) toast.error(t("تعذر الإرسال"));
    else setReplyTo(null);
    qc.invalidateQueries({ queryKey: key });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("support_messages").delete().eq("id", id);
    if (error) toast.error(t("تعذر الحذف؛ حاول مرة ثانية."));
    qc.invalidateQueries({ queryKey: key });
  }

  async function edit(id: string, content: string) {
    if (!user || !content.trim()) return false;
    const { error } = await supabase.from("support_messages").update({ content: content.trim() } as never).eq("id", id).eq("sender_id", user.id);
    if (error) { toast.error(error.message || t("تعذر تعديل الرسالة؛ حاول مرة ثانية.")); return false; }
    qc.invalidateQueries({ queryKey: key });
    return true;
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-2xl border bg-card/70 p-3">
        <PageState loading={history.isPending} error={history.isError} retry={() => void history.refetch()} />
        {history.hasNextPage && <Button variant="outline" size="sm" disabled={history.isFetchingNextPage} onClick={() => void history.fetchNextPage()}>{t("تحميل الأقدم")}</Button>}
        {history.isSuccess && msgs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("ابدأ المحادثة…")}</p>}
        {msgs.map((m) => {
          const own = m.sender_id === user?.id;
          const fromAdmin = m.sender_id !== studentId;
          return (
            <SupportBubble key={m.id} m={m} own={own} fromAdmin={fromAdmin} canDelete={own || !!me?.isStaff}
              reactions={reactionsApi.reactions} userId={user?.id} now={now}
              onDelete={(id) => void remove(id)} onEdit={edit} onReact={(id, emoji) => void reactionsApi.toggle(id, emoji)}
              onReply={setReplyTo} replyPreview={previewOf(m.reply_to)} staff={!!(me?.isStaff || me?.isSupport || me?.isOwner)} />
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex flex-col gap-2">
        {replyTo && (
          <div className="flex items-center gap-2 rounded-[14px] border-s-4 border-primary bg-secondary px-3 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate">رد على: {replyTo.content}</span>
            <button type="button" aria-label={t("إلغاء الرد")} className="shrink-0 font-bold text-muted-foreground" onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}
        <div className="flex gap-2">
          <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={t("اكتب رسالتك…")} className="h-11 bg-card" />
          <Button size="icon" className="size-11 bg-brand" aria-label={t("إرسال")}><Send className="size-4 -scale-x-100" /></Button>
        </div>
      </form>
    </div>
  );
}
