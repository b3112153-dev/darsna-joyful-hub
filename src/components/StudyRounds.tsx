import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Timer, Trash2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "./UserAvatar";

export function roundTimes(startsAt: string, minutes: number, now: number) {
  const start = new Date(startsAt).getTime();
  const end = start + minutes * 60000;
  const status = now < start ? "upcoming" : now < end ? "live" : "ended";
  return { start, end, status } as const;
}

export function fmtClock(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

type Round = {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  created_by: string;
  session_participants: { user_id: string; profiles: { display_name: string; avatar_url: string | null } | null }[];
};

export function StudyRounds({ roomId }: { roomId: string }) {
  const { user, me } = useMe();
  const qc = useQueryClient();
  const now = useNow();
  const key = ["rounds", roomId];

  const { data: rounds = [] } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const since = new Date(Date.now() - 4 * 3600000).toISOString();
      const { data } = await supabase
        .from("study_sessions")
        .select("id,title,starts_at,duration_minutes,created_by,session_participants(user_id,profiles(display_name,avatar_url))")
        .eq("room_id", roomId)
        .gte("starts_at", since)
        .order("starts_at");
      return (data ?? []) as Round[];
    },
  });

  useEffect(() => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["rounds", roomId] });
    const ch = supabase
      .channel(`rounds-${roomId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "study_sessions", filter: `room_id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_participants" }, refresh)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, qc]);

  // notify when a round I joined finishes
  const [notified, setNotified] = useState<Set<string>>(new Set());
  useEffect(() => {
    for (const r of rounds) {
      const t = roundTimes(r.starts_at, r.duration_minutes, now);
      const joined = r.session_participants.some((p) => p.user_id === user?.id);
      if (joined && t.status === "ended" && now - t.end < 5000 && !notified.has(r.id)) {
        toast.success(`خلصت جولة "${r.title}" — يعطيكم العافية! 🎉`);
        setNotified((s) => new Set(s).add(r.id));
      }
    }
  }, [now, rounds, user?.id, notified]);

  const visible = rounds.filter((r) => roundTimes(r.starts_at, r.duration_minutes, now).status !== "ended");

  async function join(id: string) {
    if (!user) return;
    const { error } = await supabase.from("session_participants").insert({ session_id: id, user_id: user.id });
    if (error) toast.error("تعذر الانضمام");
    qc.invalidateQueries({ queryKey: key });
  }
  async function leave(id: string) {
    if (!user) return;
    await supabase.from("session_participants").delete().eq("session_id", id).eq("user_id", user.id);
    qc.invalidateQueries({ queryKey: key });
  }
  async function remove(id: string) {
    if (!confirm("إلغاء الجولة؟")) return;
    await supabase.from("study_sessions").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-semibold"><Timer className="size-4 text-primary" /> جولات الدراسة</p>
        {!me?.isBanned && <NewRound roomId={roomId} onDone={() => qc.invalidateQueries({ queryKey: key })} />}
      </div>
      {visible.length === 0 && <p className="text-xs text-muted-foreground">ما في جولات حالياً — ابدأ وحدة وخلّي زملاءك ينضموا!</p>}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {visible.map((r) => {
          const t = roundTimes(r.starts_at, r.duration_minutes, now);
          const joined = r.session_participants.some((p) => p.user_id === user?.id);
          const live = t.status === "live";
          const progress = live ? ((now - t.start) / (t.end - t.start)) * 100 : 0;
          return (
            <div key={r.id} className={`min-w-60 shrink-0 rounded-xl border p-3 ${live ? "border-primary bg-secondary" : "bg-card"}`}>
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm font-semibold break-words">{r.title}</p>
                {(r.created_by === user?.id || me?.isStaff) && (
                  <button onClick={() => remove(r.id)} aria-label="إلغاء" className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
                )}
              </div>
              <p className="font-display text-2xl font-bold tabular-nums text-primary" dir="ltr">
                {fmtClock(live ? t.end - now : t.start - now)}
              </p>
              <p className="mb-2 text-xs text-muted-foreground">
                {live ? "متبقي على نهاية الجولة" : "باقي على البداية"} · {r.duration_minutes} دقيقة
              </p>
              {live && (
                <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-brand transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center -space-x-2 space-x-reverse">
                  {r.session_participants.slice(0, 5).map((p) => (
                    <UserAvatar key={p.user_id} path={p.profiles?.avatar_url} name={p.profiles?.display_name} className="size-6 ring-2 ring-card" />
                  ))}
                  <span className="ps-3 text-xs text-muted-foreground flex items-center gap-1"><Users className="size-3" />{r.session_participants.length}</span>
                </div>
                {joined ? (
                  <Button size="sm" variant="outline" onClick={() => leave(r.id)}>مغادرة</Button>
                ) : (
                  <Button size="sm" className="bg-brand" disabled={me?.isBanned} onClick={() => join(r.id)}>انضمام</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewRound({ roomId, onDone }: { roomId: string; onDone: () => void }) {
  const { user } = useMe();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState("25");
  const [startIn, setStartIn] = useState("0");

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const starts_at = new Date(Date.now() + Number(startIn) * 60000).toISOString();
    const { data, error } = await supabase
      .from("study_sessions")
      .insert({ room_id: roomId, created_by: user.id, title: title.trim(), duration_minutes: Number(duration), starts_at })
      .select("id")
      .single();
    if (error || !data) {
      toast.error("تعذر إنشاء الجولة");
      return;
    }
    await supabase.from("session_participants").insert({ session_id: data.id, user_id: user.id });
    toast.success("تم إنشاء الجولة");
    setTitle("");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-7"><Plus /> جولة جديدة</Button>
      </DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>جولة دراسة جديدة</DialogTitle></DialogHeader>
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5">
            <Label>شو رح تدرسوا؟</Label>
            <Input required minLength={2} maxLength={80} placeholder="مثلاً: حل أسئلة الوحدة الثانية" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>مدة الجولة</Label>
              <Select dir="rtl" value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[15, 25, 30, 45, 60, 90, 120].map((m) => <SelectItem key={m} value={String(m)}>{m} دقيقة</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تبدأ</Label>
              <Select dir="rtl" value={startIn} onValueChange={setStartIn}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">هلأ</SelectItem>
                  {[5, 10, 15, 30, 60].map((m) => <SelectItem key={m} value={String(m)}>بعد {m} دقيقة</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full bg-brand">إنشاء الجولة</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
