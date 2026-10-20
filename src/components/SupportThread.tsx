import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SupportThread({ studentId, className = "" }: { studentId: string; className?: string }) {
  const { user } = useMe();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const key = ["support", studentId];

  const { data: msgs = [] } = useQuery({
    queryKey: key,
    queryFn: async () =>
      (await supabase.from("support_messages").select("*").eq("student_id", studentId).order("created_at").limit(300)).data ?? [],
  });

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
    const { error } = await supabase.from("support_messages").insert({ student_id: studentId, sender_id: user.id, content });
    if (error) toast.error("تعذر الإرسال");
    qc.invalidateQueries({ queryKey: key });
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex-1 space-y-2 overflow-y-auto rounded-2xl border bg-card/70 p-3">
        {msgs.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">ابدأ المحادثة…</p>}
        {msgs.map((m) => {
          const own = m.sender_id === user?.id;
          const fromAdmin = m.sender_id !== studentId;
          return (
            <div key={m.id} className={`flex ${own ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${own ? "bg-bubble-own text-bubble-own-foreground" : "bg-bubble"}`}>
                {!own && <p className="mb-0.5 text-xs font-semibold text-primary">{fromAdmin ? "الإدارة" : "الطالب"}</p>}
                <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                <p className="mt-1 text-[10px] opacity-70">{new Date(m.created_at).toLocaleString("ar-JO", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input value={text} maxLength={2000} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالتك…" className="h-11 bg-card" />
        <Button size="icon" className="size-11 bg-brand" aria-label="إرسال"><Send className="size-4 -scale-x-100" /></Button>
      </form>
    </div>
  );
}
