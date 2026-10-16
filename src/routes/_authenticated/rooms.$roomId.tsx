import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/UserAvatar";
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
      { title: "غرفة دردشة | Darsna Jo" },
      { name: "description", content: "دردشة مباشرة مع طلاب التوجيهي." },
      { property: "og:title", content: "غرفة دردشة | Darsna Jo" },
      { property: "og:description", content: "دردشة مباشرة مع طلاب التوجيهي." },
    ],
  }),
  component: ChatRoom,
});

type Msg = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  from_admin: boolean;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

function ChatRoom() {
  const { roomId } = Route.useParams();
  const { user, me } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["messages", roomId];
  const focus = useMyFocus(user?.id);
  const locked = isChatLocked(focus.session, focus.now);
  const [tab, setTab] = useState("timer");

  const { data: room } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => (await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle()).data,
  });

  const { data: messages = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("id,content,created_at,user_id,from_admin,profiles(display_name,avatar_url)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: false })
        .limit(100);
      return ((data ?? []) as Msg[]).reverse();
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` }, () =>
        qc.invalidateQueries({ queryKey: ["messages", roomId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, qc]);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !user) return;
    setText("");
    const { error } = await supabase.from("messages").insert({ room_id: roomId, user_id: user.id, content });
    if (error) toast.error(me?.isBanned ? "حسابك محظور من الإرسال" : locked ? "الدردشة مقفلة لحد ما يخلص المؤقت" : "تعذر إرسال الرسالة");
    qc.invalidateQueries({ queryKey: key });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) { toast.error("تعذر الحذف"); return; }
    qc.invalidateQueries({ queryKey: key });
  }

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
      <div className="flex-1 space-y-3 overflow-y-auto rounded-2xl border bg-card/70 p-3 sm:p-4">
        {messages.length === 0 && <p className="py-10 text-center text-muted-foreground">لا يوجد رسائل بعد — كن أول من يكتب!</p>}
        {messages.map((m) => {
          const own = m.user_id === user?.id;
          const canDelete = own || me?.isStaff;
          return (
            <div key={m.id} className={`group flex items-end gap-2 ${own ? "flex-row-reverse" : ""}`}>
              <UserAvatar path={m.from_admin ? null : m.profiles?.avatar_url} name={m.from_admin ? "الإدارة" : m.profiles?.display_name} className="size-8" />
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${own ? "bg-bubble-own text-bubble-own-foreground rounded-bl-sm" : "bg-bubble rounded-br-sm"}`}>
                {!own && <p className="mb-0.5 text-xs font-semibold text-primary">{m.from_admin ? "الإدارة" : m.profiles?.display_name}</p>}
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleTimeString("ar-JO", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              {canDelete && (
                <button onClick={() => remove(m.id)} aria-label="حذف الرسالة" className="text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          );
        })}
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
          <Button size="icon" className="size-11 bg-brand" aria-label="إرسال"><Send className="size-4 -scale-x-100" /></Button>
        </form>
      )}
      </TabsContent>
      </Tabs>
    </main>
  );
}
