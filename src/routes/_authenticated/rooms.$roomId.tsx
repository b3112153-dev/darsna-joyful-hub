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
import { canDeleteMessage } from "@/lib/chat-messages";
import { readData, requestSignal } from "@/lib/requests";
import { branchLabel } from "@/lib/branches";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FocusTimer } from "@/components/FocusTimer";
import { RoomNotes } from "@/components/RoomNotes";
import { ActiveStudents } from "@/components/ActiveStudents";
import { StudyRounds } from "@/components/StudyRounds";
import { useMyFocus } from "@/hooks/use-focus";
import { isChatLocked } from "@/lib/focus";
import { fmtClock } from "@/components/StudyRounds";

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
  const [tab, setTab] = useState("timer");

  const roomQuery = useQuery({
    queryKey: ["room", roomId, user?.id],
    staleTime: 5 * 60_000,
    queryFn: ({ signal }) => readData(supabase.from("rooms").select("*").eq("id", roomId).abortSignal(requestSignal(signal)).maybeSingle()),
  });
  const room = roomQuery.data;
  const chat = useRoomMessages(roomId, user?.id, roomQuery.isSuccess && !!room);
  const { messages } = chat;
  const lastId = messages.at(-1)?.id;

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
    } catch { loadingOlder.current = false; toast.error("تعذر تحميل الرسائل الأقدم."); }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user || sending || locked) return;
    setSending(true);
    try {
      const message = await readData(supabase.from("messages").insert({ room_id: roomId, user_id: user.id, content }).select("*,profiles(display_name,avatar_url)").single());
      if (!message) throw new Error("تعذر الإرسال");
      chat.append(message);
      setText((current) => current.trim() === content ? "" : current);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: "nearest" }));
    } catch { toast.error(me?.isBanned ? "حسابك محظور من الإرسال" : "تعذر إرسال الرسالة؛ حاول مرة ثانية."); }
    finally { setSending(false); }
  }

  if (roomQuery.isPending) return <PageState loading />;
  if (roomQuery.isError) return <PageState error retry={() => void roomQuery.refetch()} />;
  if (roomQuery.isSuccess && room === null) return <Unavailable kind="الغرفة" />;

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem)] max-w-3xl flex-col px-2 py-3 sm:px-4">
      <div className="mb-3 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-card">
        <Link to="/rooms" className="text-muted-foreground hover:text-primary"><ArrowRight className="size-5" /></Link>
        <div className="flex-1">
          <h1 className="font-semibold">{room?.name ?? "…"}</h1>
          <p className="text-xs text-muted-foreground">{branchLabel(room?.branch)}</p>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} dir="rtl" className="flex min-h-0 flex-1 flex-col">
      <TabsList className="mb-3 grid w-full grid-cols-4">
        <TabsTrigger value="timer">المؤقت</TabsTrigger>
        <TabsTrigger value="chat">الدردشة{locked ? " 🔒" : ""}</TabsTrigger>
        <TabsTrigger value="notes">ملاحظاتي</TabsTrigger>
        <TabsTrigger value="rounds">الجولات</TabsTrigger>
      </TabsList>
      <TabsContent value="timer" className="space-y-3 overflow-y-auto">
        <FocusTimer focus={focus} roomId={roomId} />
        <ActiveStudents roomId={roomId} />
      </TabsContent>
      <TabsContent value="notes" className="overflow-y-auto">{user && <RoomNotes roomId={roomId} userId={user.id} />}</TabsContent>
      <TabsContent value="rounds" className="overflow-y-auto rounded-2xl border bg-card p-4"><StudyRounds roomId={roomId} /></TabsContent>
      <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card/70 p-3 sm:p-4">
        {chat.hasNextPage && <div className="text-center"><Button variant="outline" size="sm" disabled={chat.isFetchingNextPage} onClick={() => void loadOlder()}>{chat.isFetchingNextPage ? "جاري التحميل…" : "تحميل الأقدم"}</Button></div>}
        <PageState loading={chat.isPending} error={chat.isError} retry={() => void (chat.isFetchNextPageError ? chat.fetchNextPage() : chat.refetch())} />
        {chat.isSuccess && messages.length === 0 && <p className="py-10 text-center text-muted-foreground">لا يوجد رسائل بعد — كن أول من يكتب!</p>}
        {messages.map((m) => <ChatMessage key={m.id} message={m} own={m.user_id === user?.id} canDelete={canDeleteMessage(m, user?.id, !!me?.isStaff)} onDelete={chat.remove} onEdit={chat.edit} />)}
        <div ref={endRef} />
      </div>
      {me?.isBanned ? (
        <p className="mt-3 rounded-2xl bg-destructive/10 p-3 text-center text-sm text-destructive">تم حظر حسابك من الإرسال.</p>
      ) : locked ? (
        <button onClick={() => setTab("timer")} className="mt-3 w-full rounded-2xl bg-secondary p-3 text-center text-sm text-secondary-foreground">
          🔒 الدردشة مقفلة — باقي <span dir="ltr" className="font-bold tabular-nums">{fmtClock(focus.left * 1000)}</span> على نهاية جلستك
        </button>
      ) : (
        <form onSubmit={send} className="mt-3 flex gap-2">
          <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك…" className="h-11 bg-card" />
          <Button size="icon" disabled={sending || !text.trim() || !chat.isSuccess} className="size-11 shrink-0 bg-brand" aria-label="إرسال"><Send className="size-4 -scale-x-100" /></Button>
        </form>
      )}
      </TabsContent>
      </Tabs>
    </main>
  );
}
