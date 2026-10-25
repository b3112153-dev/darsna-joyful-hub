import { memo, useEffect, useState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageState } from "@/components/PageState";
import { useTodos } from "@/hooks/use-todos";
import { ENCOURAGEMENT_DURATION_MS, TODO_TEXT_LIMIT, validTodoText } from "@/lib/todos";
import { t } from "@/lib/i18n";

export const TodoList = memo(function TodoList({ userId }: { userId: string }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [cheer, setCheer] = useState<{ id: string; message: string } | null>(null);
  const tasks = useTodos(userId);
  useEffect(() => { if (!cheer) return; const timer = setTimeout(() => setCheer(null), ENCOURAGEMENT_DURATION_MS); return () => clearTimeout(timer); }, [cheer]);
  return <section className="min-w-0 rounded-[26px] border bg-card px-4 pb-2.5 pt-4 font-display text-card-foreground" aria-label={t("مهامي")}>
    <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
      <h2 className="text-[17px] font-extrabold">{t("مهام اليوم")}</h2>
      <span className="text-xs font-semibold text-muted-foreground">{tasks.rows.filter((task) => task.done).length.toLocaleString("ar-JO")} من {tasks.rows.length.toLocaleString("ar-JO")}</span>
    </div>
    {tasks.isLoading ? <PageState loading /> : tasks.isError ? <PageState error retry={() => void tasks.refetch()} /> : <>
      {!tasks.rows.length && <p className="py-5 text-center text-sm text-muted-foreground">{t("يوم جديد، خطوة جديدة.")}</p>}
      <ul>{tasks.rows.map((task) => <li key={task.id} className="border-b py-3 last:border-b-0">
        <div className="grid grid-cols-[26px_minmax(0,1fr)_28px] items-center gap-3">
          <Checkbox id={`todo-${task.id}`} className="size-[26px] rounded-[9px] border-2 border-task-border data-[state=checked]:border-foreground data-[state=checked]:bg-mint data-[state=checked]:text-mint-foreground [&_svg]:size-4" checked={task.done} disabled={tasks.pending} onCheckedChange={async (checked) => {
            const done = checked === true;
            if (await tasks.act({ kind: "toggle", id: task.id, done })) {
              if (done) setCheer({ id: task.id, message: t(tasks.encouragement()) }); else setCheer(null);
            }
          }} aria-label={`إنجاز ${task.text}`} />
          <label htmlFor={`todo-${task.id}`} className={`min-w-0 break-words text-[15px] leading-7 ${task.done ? "text-task-completed line-through" : "text-foreground"}`}>{task.text}</label>
          <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive" aria-label={`حذف ${task.text}`} disabled={tasks.pending} onClick={() => void tasks.act({ kind: "delete", id: task.id })}><Trash2 className="size-3.5" /></Button>
        </div>
        {cheer?.id === task.id && <p role="status" className="rise-in mr-9 mt-3 rounded-[16px] rounded-br-[4px] bg-secondary px-3 py-2 text-xs leading-6 text-secondary-foreground">{cheer.message}</p>}
      </li>)}</ul>
    </>}
    <div className="mt-2 border-t border-dashed pt-2">
      {adding ? <form className="flex gap-2 py-1" onSubmit={async (event) => {
        event.preventDefault(); if (!validTodoText(text) || tasks.pending) return;
        if (await tasks.act({ kind: "add", text, id: crypto.randomUUID() })) { setText(""); setAdding(false); }
      }}>
        <Input autoFocus aria-label={t("مهمة جديدة")} placeholder={t("شو بدك تنجز اليوم؟")} maxLength={TODO_TEXT_LIMIT} value={text} onChange={(event) => setText(event.target.value)} className="h-11 min-w-0 rounded-[14px]" disabled={tasks.pending || tasks.isLoading || tasks.isError} />
        <Button type="submit" size="icon" className="size-11 shrink-0 rounded-[14px]" aria-label={t("إضافة مهمة")} disabled={!validTodoText(text) || tasks.pending || tasks.isLoading || tasks.isError}>{tasks.pending ? <LoaderCircle className="animate-spin" /> : <Plus />}</Button>
      </form> : <Button variant="ghost" className="h-10 w-full justify-start px-0 text-sm font-semibold text-muted-foreground" onClick={() => setAdding(true)}><Plus /> {t("أضف مهمة")}</Button>}
    </div>
  </section>;
});
