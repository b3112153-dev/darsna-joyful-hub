import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatMessage } from "@/components/ChatMessage";
import { PageState, Unavailable } from "@/components/PageState";
import { useRoomMessages } from "@/hooks/use-room-messages";
import { useReactions } from "@/hooks/use-reactions";
import { useNow } from "@/hooks/use-focus";
import { canDeleteMessage, type Message } from "@/lib/chat-messages";
import { readData, requestSignal } from "@/lib/requests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FocusTimer } from "@/components/FocusTimer";
import { RoomNotes } from "@/components/RoomNotes";
import { ActiveStudents } from "@/components/ActiveStudents";
import { StudyRounds } from "@/components/StudyRounds";
import { useMyFocus } from "@/hooks/use-focus";
import { isChatLocked } from "@/lib/focus";
import { fmtClock } from "@/components/StudyRounds";
import { useLang, t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [
      { name: "robots", content: "noindex" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "غرفة دردشة | Darsna Jo" },
      { name: "description", content: "دردشة مباشرة مع طلاب التوجيهي." },
      { property: "og:title", content: "غرفة دردشة | Darsna Jo" },
      { property: "og:description", content: "دردشة مباشرة مع طلاب التوجيهي." },
    ],
  }),
  component: ChatRoom,
});

function ChatRoom() {
  const { lang } = useLang();
  const { roomId } = Route.useParams();
  const { user, me } = useMe();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const focus = useMyFocus(user?.id);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const loadingOlder = useRef(false);
  const previousLast = useRef<string | undefined>(undefined);
  const locked = isChatLocked(focus.session, focus.now);
  const [tab, setTab] = useState("chat");

  const roomQuery = useQuery({
    queryKey: ["room", roomId, user?.id],
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => readData(supabase.from("rooms").select("*").eq("id", roomId).abortSignal(requestSignal(signal)).maybeSingle()),
  });
  const room = roomQuery.data;
  const chat = useRoomMessages(roomId, user?.id, roomQuery.isSuccess && !!room);
  const { messages } = chat;
  const lastId = messages.at(-1)?.id;
  const now = useNow();
  const messageIds = messages.map((m) => m.id);
  const reactionsApi = useReactions("message_reactions", messageIds, user?.id, roomId);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const previewOf = (id: string | null) => id ? messages.find((m) => m.id === id)?.content ?? t("رسالة محذوفة") : null;

  useEffect(() => {
    if (tab !== "chat" || loadingOlder.current || lastId === previousLast.current) return;
    previousLast.current = lastId;
    const list = listRef.current;
    if (!list || list.scrollHeight - list.scrollTop - list.clientHeight < 180) {
      endRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [lastId, tab]);

  async function loadOlder() {
    if (loadingOlder.current) return;
    loadingOlder.current = true;
    const list = listRef.current;
    const height = list?.scrollHeight ?? 0;
    const top = list?.scrollTop ?? 0;
    try {
      await chat.fetchNextPage();
      requestAnimationFrame(() => {
        if (list) list.scrollTop = top + list.scrollHeight - height;
        loadingOlder.current = false;
      });
    } catch { loadingOlder.current = false; toast.error(t("تعذر تحميل الرسائل الأقدم.")); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user || sending || locked) return;
    setSending(true);
    try {
      const message = await readData(supabase.from("messages").insert({ room_id: roomId, user_id: user.id, content, reply_to: replyTo?.id ?? null }).select("*,profiles(display_name,nickname,avatar,gender)").single());
      if (!message) throw new Error(t("تعذر الإرسال"));
      chat.append(message);
      setReplyTo(null);
      setText((current) => current.trim() === content ? "" : current);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest" }));
    } catch { toast.error(me?.isBanned ? t("حسابك محظور من الإرسال") : "تعذر إرسال الرسالة؛ حاول مرة ثانية."); }
    finally { setSending(false); }
  }

  if (roomQuery.isPending) return <PageState loading />;
  if (roomQuery.isError) return <PageState error retry={() => void roomQuery.refetch()} />;
  if (roomQuery.isSuccess && room === null) return <Unavailable kind={t("الغرفة")} />;

  return (
    <main className="mx-auto flex h-[calc(100dvh-136px)] max-w-3xl flex-col font-display lg:h-[calc(100dvh-4rem)]">
      <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-3 rounded-t-[26px] bg-secondary px-4 pb-3.5 pt-5 text-secondary-foreground">
        <Link to="/rooms" aria-label={t("العودة للدردشات")} className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-card text-card-foreground"><ArrowRight className="size-5" /></Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold">{me?.isStaff || me?.isSupport || me?.isOwner ? room?.name : t(room?.audience === "all" ? "جولة الدراسة" : "شات")}</h1>
          <p className="text-[13px] leading-6 text-muted-foreground">{me?.isStaff || me?.isSupport || me?.isOwner ? room?.description : t(room?.audience === "all" ? "ادرس مع طلاب دفعتك" : me?.profile?.gender === "female" ? "هذا مخصص للبنات" : "هذا مخصص للشباب")}</p>
        </div>
      </div>
      <p className="bg-secondary px-4 pb-3 text-center text-[13px] font-semibold text-secondary-foreground">{t("نشر الروابط الخارجية ممنوع في الدردشة")}</p>
      <Tabs value={tab} onValueChange={setTab} dir={lang === "ar" ? "rtl" : "ltr"} className="flex min-h-0 flex-1 flex-col">
      <TabsList className="my-2 grid w-full grid-cols-4">
        <TabsTrigger value="timer">{t("المؤقت")}</TabsTrigger>
        <TabsTrigger value="chat">الدردشة{locked ? " 🔒" : ""}</TabsTrigger>
        <TabsTrigger value="notes">{t("ملاحظاتي")}</TabsTrigger>
        <TabsTrigger value="rounds">{t("الجولات")}</TabsTrigger>
      </TabsList>
      <TabsContent value="timer" className="space-y-3 overflow-y-auto">
        <FocusTimer focus={focus} roomId={roomId} />
        <ActiveStudents roomId={roomId} />
      </TabsContent>
      <TabsContent value="notes" className="overflow-y-auto">{user && <RoomNotes roomId={roomId} userId={user.id} />}</TabsContent>
      <TabsContent value="rounds" className="overflow-y-auto rounded-2xl border bg-card p-4"><StudyRounds roomId={roomId} /></TabsContent>
      <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-background p-3 sm:p-4">
        {chat.hasNextPage && <div className="text-center"><Button variant="outline" size="sm" disabled={chat.isFetchingNextPage} onClick={() => void loadOlder()}>{chat.isFetchingNextPage ? t("جاري التحميل…") : "تحميل الأقدم"}</Button></div>}
        <PageState loading={chat.isPending} error={chat.isError} retry={() => void (chat.isFetchNextPageError ? chat.fetchNextPage() : chat.refetch())} />
        {chat.isSuccess && messages.length === 0 && <p className="py-10 text-center text-muted-foreground">{t("لا يوجد رسائل بعد — كن أول من يكتب!")}</p>}
        {messages.map((m) => <ChatMessage key={m.id} message={m} own={m.user_id === user?.id} canDelete={canDeleteMessage(m, user?.id, !!me?.isStaff)} reactions={reactionsApi.reactions} userId={user?.id} now={now} onDelete={chat.remove} onEdit={chat.edit} onReact={(id, emoji) => void reactionsApi.toggle(id, emoji)} onReply={setReplyTo} replyPreview={previewOf(m.reply_to)} />)}
        <div ref={endRef} />
      </div>
      {me?.isBanned ? (
        <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-center text-sm text-destructive">{t("تم حظر حسابك من الإرسال.")}</p>
      ) : locked ? (
        <button onClick={() => setTab("timer")} className="mt-3 w-full rounded-2xl bg-secondary p-3 text-center text-sm text-secondary-foreground">
          {t("🔒 الدردشة مقفلة — باقي")} <span dir="ltr" className="font-bold tabular-nums">{fmtClock(focus.left * 1000)}</span> {t("على نهاية جلستك")}
        </button>
      ) : (
        <form onSubmit={send} className="grid grid-cols-[minmax(0,1fr)_48px] gap-2 border-t bg-card px-3 pb-3.5 pt-2.5">
          {replyTo && (
            <div className="col-span-2 flex items-center gap-2 rounded-[14px] border-s-4 border-primary bg-secondary px-3 py-2 text-xs">
              <span className="min-w-0 flex-1 truncate">رد على: {replyTo.content}</span>
              <button type="button" aria-label={t("إلغاء الرد")} className="shrink-0 font-bold text-muted-foreground" onClick={() => setReplyTo(null)}>✕</button>
            </div>
          )}
          <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder={t("اكتب رسالتك…")} className="h-12 min-w-0 rounded-[16px] border-border bg-background" />
          <Button size="icon" disabled={sending || !text.trim() || !chat.isSuccess} className="size-12 shrink-0 rounded-[16px] bg-primary" aria-label={t("إرسال")}><Send className="size-5 -scale-x-100" /></Button>
        </form>
      )}
      </TabsContent>
      </Tabs>
    </main>
  );
}
