import { createFileRoute } from "@tanstack/react-router";
import { Timer } from "lucide-react";
import { useSession } from "@/hooks/use-auth";
import { useFocusMode } from "@/components/FocusMode";
import { FocusTimer } from "@/components/FocusTimer";
import { TodoList } from "@/components/TodoList";
import { Button } from "@/components/ui/button";
import { fmtClock } from "@/components/StudyRounds";

export const Route = createFileRoute("/_authenticated/focus")({
  head: () => ({ meta: [
    { name: "robots", content: "noindex" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { title: "الرئيسية | Darsna Jo" },
    { name: "description", content: "مؤقت الدراسة ومهامك اليومية في درسنا جو." },
    { property: "og:title", content: "الرئيسية | Darsna Jo" },
    { property: "og:description", content: "مؤقت الدراسة ومهامك اليومية في درسنا جو." },
  ] }),
  component: Focus,
});
function Focus() {
  const { user } = useSession();
  const { focus, enter } = useFocusMode();
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:py-8">
    <h1 className="font-display text-3xl font-bold">الرئيسية</h1>
    <div className="grid items-start gap-6 md:grid-cols-2">
      <section className="min-w-0" aria-label="مؤقت الدراسة">
        {focus.session ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5 shadow-card">
          <p className="flex items-center gap-2 font-semibold"><Timer className="size-5 text-primary" /> جلسة شغّالة: <span dir="ltr" className="tabular-nums">{fmtClock(focus.left * 1000)}</span></p>
          <Button onClick={enter}>ارجع للتركيز</Button>
        </div> : <FocusTimer focus={focus} roomId={null} />}
      </section>
      {user && <TodoList userId={user.id} />}
    </div>
  </main>;
}
